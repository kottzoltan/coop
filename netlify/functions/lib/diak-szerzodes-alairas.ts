import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import {
  diakRegisztracio,
  eAlairasKerelem,
  munkaHirdetes,
  munkaJelentkezes,
  projekt,
  szovetkezetiTag,
  tagsag,
} from '../../../db/schema.js';
import { microsecIdobelyeg } from './microsec-idobelyeg.js';
import { kuldesDiakAlairasEmail } from './email-kuldes.js';
import { envGet } from './netlify-env.js';
import { szerzodesSablonFeloldas } from './szerzodes-sablon.js';

export type SzerzodesTipus = 'keretszerzodes' | 'eseti_szerzodes';

const TIPUS_LABEL: Record<SzerzodesTipus, string> = {
  keretszerzodes: 'Keretszerződés',
  eseti_szerzodes: 'Eseti szerződés',
};

function portalUrl(): string {
  return (envGet('URL') ?? envGet('DEPLOY_PRIME_URL') ?? 'https://ice89.netlify.app').replace(/\/$/, '');
}

function kerelemValasz(
  k: typeof eAlairasKerelem.$inferSelect,
  extra?: { hirdetes_cim?: string | null; projekt_nev?: string | null },
) {
  return {
    id: k.id,
    tag_id: k.tagId,
    diak_regisztracio_id: k.diakRegisztracioId,
    jelentkezes_id: k.jelentkezesId,
    projekt_id: k.projektId,
    szerzodes_tipus: k.szerzodesTipus,
    dokumentum_nev: k.dokumentumNev,
    statusz: k.statusz,
    blob_key: k.blobKey,
    megjegyzes: k.megjegyzes,
    microsec_idobelyeg: k.microsecIdobelyeg,
    alairva_at: k.alairvaAt?.toISOString() ?? null,
    email_kuldve_at: k.emailKuldveAt?.toISOString() ?? null,
    letrehozva: k.letrehozva.toISOString(),
    hirdetes_cim: extra?.hirdetes_cim ?? null,
    projekt_nev: extra?.projekt_nev ?? null,
  };
}

async function vanAlairtKeretszerzodes(diakId: number): Promise<boolean> {
  const [kerelem] = await db
    .select()
    .from(eAlairasKerelem)
    .where(
      and(
        eq(eAlairasKerelem.diakRegisztracioId, diakId),
        eq(eAlairasKerelem.szerzodesTipus, 'keretszerzodes'),
        eq(eAlairasKerelem.statusz, 'aláírva'),
      ),
    )
    .limit(1);

  if (kerelem) return true;

  const [tag] = await db
    .select({ dokumentumok: szovetkezetiTag.dokumentumok })
    .from(szovetkezetiTag)
    .where(eq(szovetkezetiTag.diakRegisztracioId, diakId));

  if (!tag?.dokumentumok || !Array.isArray(tag.dokumentumok)) return false;
  return tag.dokumentumok.some(
    (d) =>
      d &&
      typeof d === 'object' &&
      ((d as { tipus?: string }).tipus === 'keretszerzodes' ||
        String((d as { nev?: string }).nev ?? '')
          .toLowerCase()
          .includes('keret')),
  );
}

async function ensureTag(diakId: number): Promise<number> {
  const [meglevo] = await db
    .select()
    .from(szovetkezetiTag)
    .where(eq(szovetkezetiTag.diakRegisztracioId, diakId));

  if (meglevo) return meglevo.id;

  const [diak] = await db.select().from(diakRegisztracio).where(eq(diakRegisztracio.id, diakId));
  if (!diak) throw new Error('Diák nem található.');

  const placeholderAdo = `9${String(diakId).padStart(9, '0').slice(0, 9)}`;

  const [uj] = await db
    .insert(szovetkezetiTag)
    .values({
      nev: diak.nev,
      adoszam: placeholderAdo,
      email: diak.email.toLowerCase(),
      telefon: diak.telefon,
      szuldat: diak.szuldat,
      lakcim: diak.lakcim,
      iroda: diak.iroda,
      iskola: diak.iskola,
      tagsagStatusz: 'piszkozat',
      belepes: new Date().toISOString().slice(0, 10),
      diakRegisztracioId: diakId,
      reszjegy: 0,
      bank: 'nincs',
      eszerz: 'nincs',
      uzemorv: 'nincs',
      tudo: 'nincs',
      szjaKedvezmenyek: [],
      dokumentumok: [],
    })
    .returning();

  if (!uj) throw new Error('Tag létrehozása sikertelen.');
  return uj.id;
}

async function kerelemLetrehozas(input: {
  diakId: number;
  tagId: number | null;
  jelentkezesId: number;
  projektId: number | null;
  tipus: SzerzodesTipus;
  dokumentumNev: string;
  email: string;
  nev: string;
}): Promise<typeof eAlairasKerelem.$inferSelect | null> {
  const duplaFeltetel =
    input.tipus === 'keretszerzodes'
      ? and(
          eq(eAlairasKerelem.diakRegisztracioId, input.diakId),
          eq(eAlairasKerelem.szerzodesTipus, 'keretszerzodes'),
          inArray(eAlairasKerelem.statusz, ['függőben', 'aláírva']),
        )
      : and(
          eq(eAlairasKerelem.jelentkezesId, input.jelentkezesId),
          eq(eAlairasKerelem.szerzodesTipus, 'eseti_szerzodes'),
          inArray(eAlairasKerelem.statusz, ['függőben', 'aláírva']),
        );

  const [meglevo] = await db.select().from(eAlairasKerelem).where(duplaFeltetel).limit(1);
  if (meglevo) return null;

  const sablon = await szerzodesSablonFeloldas(input.tipus, input.projektId);
  const dokumentumNev = sablon?.fajlnev ?? input.dokumentumNev;

  const [uj] = await db
    .insert(eAlairasKerelem)
    .values({
      tagId: input.tagId,
      diakRegisztracioId: input.diakId,
      jelentkezesId: input.jelentkezesId,
      projektId: input.projektId,
      szerzodesTipus: input.tipus,
      dokumentumNev,
      blobKey: sablon?.blob_key ?? null,
      statusz: 'függőben',
      megjegyzes: [
        `Automatikus kérelem — felvétel után (${TIPUS_LABEL[input.tipus]})`,
        sablon ? `Sablon: ${sablon.blob_key}` : 'Sablon: nincs feltöltve',
      ].join('\n'),
    })
    .returning();

  if (!uj) return null;

  const link = `${portalUrl()}/diak/profil#alairas`;
  const emailEredmeny = await kuldesDiakAlairasEmail(
    input.email,
    input.nev,
    TIPUS_LABEL[input.tipus],
    dokumentumNev,
    link,
  );

  if (emailEredmeny.kuldve) {
    await db
      .update(eAlairasKerelem)
      .set({ emailKuldveAt: new Date() })
      .where(eq(eAlairasKerelem.id, uj.id));
  }

  return uj;
}

/** Felvétel (Felvéve) státusz után keret- és eseti szerződés aláírási folyamat indítása. */
export async function inditsSzerzodesAlairasFelvetelUtan(jelentkezesId: number) {
  const [sor] = await db
    .select({
      jel: munkaJelentkezes,
      hirdetes: munkaHirdetes,
      proj: projekt,
    })
    .from(munkaJelentkezes)
    .innerJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
    .leftJoin(projekt, eq(munkaHirdetes.projekt_id, projekt.id))
    .where(eq(munkaJelentkezes.id, jelentkezesId));

  if (!sor || sor.jel.statusz !== 'Felvéve') {
    return { inditva: [] as number[], hiba: 'Csak Felvéve státuszú jelentkezéshez indítható.' };
  }

  const diakId = sor.jel.regisztracio_id;
  if (!diakId) {
    return { inditva: [] as number[], hiba: 'A jelentkezéshez nincs diák regisztráció kötve.' };
  }

  const tagId = await ensureTag(diakId);
  const inditva: number[] = [];

  if (!(await vanAlairtKeretszerzodes(diakId))) {
    const keret = await kerelemLetrehozas({
      diakId,
      tagId,
      jelentkezesId,
      projektId: sor.hirdetes.projekt_id,
      tipus: 'keretszerzodes',
      dokumentumNev: 'Keretszerződés — Coop Iskolaszövetkezet',
      email: sor.jel.email,
      nev: sor.jel.nev,
    });
    if (keret) inditva.push(keret.id);
  }

  const projektNev = sor.proj?.nev ?? sor.hirdetes.cim;
  const eseti = await kerelemLetrehozas({
    diakId,
    tagId,
    jelentkezesId,
    projektId: sor.hirdetes.projekt_id,
    tipus: 'eseti_szerzodes',
    dokumentumNev: `Eseti szerződés — ${projektNev}`,
    email: sor.jel.email,
    nev: sor.jel.nev,
  });
  if (eseti) inditva.push(eseti.id);

  return { inditva };
}

export async function diakFuggobenAlairasok(diakId: number) {
  const sorok = await db
    .select({
      k: eAlairasKerelem,
      hirdetes_cim: munkaHirdetes.cim,
      projekt_nev: projekt.nev,
    })
    .from(eAlairasKerelem)
    .leftJoin(munkaJelentkezes, eq(eAlairasKerelem.jelentkezesId, munkaJelentkezes.id))
    .leftJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
    .leftJoin(projekt, eq(eAlairasKerelem.projektId, projekt.id))
    .where(
      and(
        eq(eAlairasKerelem.diakRegisztracioId, diakId),
        eq(eAlairasKerelem.statusz, 'függőben'),
      ),
    )
    .orderBy(desc(eAlairasKerelem.letrehozva));

  return sorok.map((r) =>
    kerelemValasz(r.k, { hirdetes_cim: r.hirdetes_cim, projekt_nev: r.projekt_nev }),
  );
}

export async function diakAlairasVegrehajtas(kerelemId: number, diakId: number) {
  const [k] = await db
    .select()
    .from(eAlairasKerelem)
    .where(
      and(
        eq(eAlairasKerelem.id, kerelemId),
        eq(eAlairasKerelem.diakRegisztracioId, diakId),
        eq(eAlairasKerelem.statusz, 'függőben'),
      ),
    );

  if (!k) throw new Error('Aláírandó dokumentum nem található vagy már lezárult.');

  const ts = microsecIdobelyeg(`kerelem-${k.id}-${k.szerzodesTipus}-${k.dokumentumNev}`);
  const most = new Date();

  const [friss] = await db
    .update(eAlairasKerelem)
    .set({
      statusz: 'aláírva',
      microsecIdobelyeg: ts.id,
      alairvaAt: most,
      megjegyzes: [
        k.megjegyzes,
        `Microsec időbélyeg (${ts.mod}): ${ts.id}`,
        `Időpont: ${ts.idobelyeg}`,
      ]
        .filter(Boolean)
        .join('\n'),
    })
    .where(eq(eAlairasKerelem.id, k.id))
    .returning();

  if (!friss) throw new Error('Aláírás mentése sikertelen.');

  const tagId = await ensureTag(diakId);
  await db
    .update(eAlairasKerelem)
    .set({ tagId })
    .where(eq(eAlairasKerelem.id, k.id));

  const [tag] = await db.select().from(szovetkezetiTag).where(eq(szovetkezetiTag.id, tagId));
  if (!tag) throw new Error('Tag nem található.');

  const dokTipus =
    k.szerzodesTipus === 'keretszerzodes' ? 'keretszerzodes' : 'eseti_szerzodes';
  const ujDok = {
    id: `alairas-${k.id}`,
    nev: k.dokumentumNev,
    tipus: dokTipus,
    feltoltve: most.toISOString().slice(0, 10),
    microsec_idobelyeg: ts.id,
    alairva_at: most.toISOString(),
  };

  const dokumentumok = Array.isArray(tag.dokumentumok) ? [...tag.dokumentumok] : [];
  dokumentumok.push(ujDok);

  const tagPatch: Partial<typeof szovetkezetiTag.$inferInsert> = { dokumentumok };

  if (k.szerzodesTipus === 'keretszerzodes') {
    const [tagsagRow] = await db.select().from(tagsag).where(eq(tagsag.tagId, tagId));
    if (tagsagRow) {
      await db
        .update(tagsag)
        .set({ membershipAgreementSignedAt: most })
        .where(eq(tagsag.tagId, tagId));
    } else {
      await db.insert(tagsag).values({
        tagId,
        status: 'AKTIV',
        startDate: most.toISOString().slice(0, 10),
        membershipAgreementSignedAt: most,
      });
    }
    if (tag.tagsagStatusz === 'piszkozat') {
      tagPatch.tagsagStatusz = 'érvényes';
    }
  }

  if (k.szerzodesTipus === 'eseti_szerzodes') {
    const lejar = new Date(most);
    lejar.setFullYear(lejar.getFullYear() + 1);
    tagPatch.eszerz = 'van';
    tagPatch.eszerzLejar = lejar.toISOString().slice(0, 10);
  }

  await db.update(szovetkezetiTag).set(tagPatch).where(eq(szovetkezetiTag.id, tagId));

  return kerelemValasz(friss);
}

export async function diakOsszesAlairas(diakId: number) {
  const sorok = await db
    .select({
      k: eAlairasKerelem,
      hirdetes_cim: munkaHirdetes.cim,
      projekt_nev: projekt.nev,
    })
    .from(eAlairasKerelem)
    .leftJoin(munkaJelentkezes, eq(eAlairasKerelem.jelentkezesId, munkaJelentkezes.id))
    .leftJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
    .leftJoin(projekt, eq(eAlairasKerelem.projektId, projekt.id))
    .where(eq(eAlairasKerelem.diakRegisztracioId, diakId))
    .orderBy(desc(eAlairasKerelem.letrehozva));

  return sorok.map((r) =>
    kerelemValasz(r.k, { hirdetes_cim: r.hirdetes_cim, projekt_nev: r.projekt_nev }),
  );
}
