import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { szovetkezetiTag, diakRegisztracio } from '../../db/schema.js';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import { tagInsertFromBody, tagValasz } from './lib/tag-map.js';
import { tagValaszEnriched } from './lib/ber/tag-enrich.js';
import { syncSzjaKedvezmenyekFromUi } from './lib/ber/szja-kedvezmeny-service.js';
import { normalizaltSzjaKedvezmenyek } from '../../shared/src/tag.js';
import { TAGSAG_STATUSZOK } from '../../shared/src/enums.js';
import { tagVanHianyossag } from '../../shared/src/tag.js';

async function tagErdeklodobol(diakId: number, adoszam: string) {
  const [diak] = await db.select().from(diakRegisztracio).where(eq(diakRegisztracio.id, diakId));
  if (!diak) return { hiba: 'Érdeklődő nem található', status: 404 as const };

  const [meglevoTag] = await db
    .select()
    .from(szovetkezetiTag)
    .where(eq(szovetkezetiTag.diakRegisztracioId, diakId));
  if (meglevoTag) {
    return { hiba: 'Ehhez az érdeklődőhöz már tartozik tag', status: 400 as const };
  }

  const [emailDupla] = await db
    .select()
    .from(szovetkezetiTag)
    .where(eq(szovetkezetiTag.email, diak.email.toLowerCase()));
  if (emailDupla) {
    return { hiba: 'Már létezik tag ezzel az e-mail címmel', status: 400 as const };
  }

  const ado = adoszam.trim();
  if (!ado) return { hiba: 'Adószám kötelező a felvételhez', status: 400 as const };

  const [uj] = await db
    .insert(szovetkezetiTag)
    .values({
      nev: diak.nev,
      adoszam: ado,
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

  await db
    .update(diakRegisztracio)
    .set({ statusz: 'tag' })
    .where(eq(diakRegisztracio.id, diakId));

  return { tag: tagValasz(uj) };
}

async function tagTomeges(ids: number[], akcio: string) {
  if (!ids.length) return { hiba: 'Nincs kijelölt tag', status: 400 as const };
  const ma = new Date().toISOString().slice(0, 10);

  if (akcio === 'lezaras') {
    await db
      .update(szovetkezetiTag)
      .set({ tagsagStatusz: 'érvénytelen' })
      .where(inArray(szovetkezetiTag.id, ids));
  } else if (akcio === 'kileptetes') {
    await db
      .update(szovetkezetiTag)
      .set({ tagsagStatusz: 'érvénytelen', kilepes: ma })
      .where(inArray(szovetkezetiTag.id, ids));
  } else if (akcio === 'ervenyes') {
    await db
      .update(szovetkezetiTag)
      .set({ tagsagStatusz: 'érvényes', kilepes: null })
      .where(inArray(szovetkezetiTag.id, ids));
  } else {
    return { hiba: 'Ismeretlen tömeges művelet', status: 400 as const };
  }

  const friss = await db
    .select()
    .from(szovetkezetiTag)
    .where(inArray(szovetkezetiTag.id, ids));
  return { sorok: friss.map(tagValasz), count: friss.length };
}

async function tagAtembeles(celId: number, forrasAzon: string) {
  const minta = forrasAzon.trim();
  if (!minta) return { hiba: 'Add meg a forrás e-mailt vagy adószámot', status: 400 as const };

  const [cel] = await db.select().from(szovetkezetiTag).where(eq(szovetkezetiTag.id, celId));
  if (!cel) return { hiba: 'Cél tag nem található', status: 404 as const };

  const [forras] = await db
    .select()
    .from(szovetkezetiTag)
    .where(
      or(eq(szovetkezetiTag.email, minta.toLowerCase()), eq(szovetkezetiTag.adoszam, minta))!,
    );
  if (!forras) return { hiba: 'Forrás tag nem található', status: 404 as const };
  if (forras.id === celId) return { hiba: 'A forrás és cél tag megegyezik', status: 400 as const };

  const [friss] = await db
    .update(szovetkezetiTag)
    .set({
      telefon: cel.telefon ?? forras.telefon,
      lakcim: cel.lakcim ?? forras.lakcim,
      iskola: cel.iskola ?? forras.iskola,
      bankszamlaszam: cel.bankszamlaszam ?? forras.bankszamlaszam,
      diakig: cel.diakig ?? forras.diakig,
      diakRegisztracioId: cel.diakRegisztracioId ?? forras.diakRegisztracioId,
    })
    .where(eq(szovetkezetiTag.id, celId))
    .returning();

  await db.delete(szovetkezetiTag).where(eq(szovetkezetiTag.id, forras.id));
  return { tag: tagValasz(friss) };
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('tagok', 'olvasas');
    if (auth instanceof Response) return auth;

    const id = url.searchParams.get('id');
    if (id) {
      const [row] = await db
        .select()
        .from(szovetkezetiTag)
        .where(eq(szovetkezetiTag.id, Number(id)));
      if (!row) return Response.json({ hiba: 'Tag nem található' }, { status: 404 });
      return Response.json({ tag: await tagValaszEnriched(row) });
    }

    const keres = url.searchParams.get('keres')?.trim() ?? '';
    const tagsag = url.searchParams.get('tagsag')?.trim() ?? '';
    const iroda = url.searchParams.get('iroda')?.trim() ?? '';
    const iskola = url.searchParams.get('iskola')?.trim() ?? '';
    const hianyossag = url.searchParams.get('hianyossag') === '1';

    const feltetelek = [];
    if (tagsag && tagsag !== 'mind') {
      feltetelek.push(eq(szovetkezetiTag.tagsagStatusz, tagsag));
    }
    if (iroda && iroda !== 'mind') {
      feltetelek.push(eq(szovetkezetiTag.iroda, iroda));
    }
    if (iskola) {
      feltetelek.push(ilike(szovetkezetiTag.iskola, `%${iskola}%`));
    }
    if (keres) {
      const minta = `%${keres}%`;
      feltetelek.push(
        or(
          ilike(szovetkezetiTag.nev, minta),
          ilike(szovetkezetiTag.email, minta),
          ilike(szovetkezetiTag.adoszam, minta),
        )!,
      );
    }

    const sorok = await db
      .select()
      .from(szovetkezetiTag)
      .where(feltetelek.length ? and(...feltetelek) : undefined)
      .orderBy(desc(szovetkezetiTag.letrehozva))
      .limit(200);

    const [osszes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(szovetkezetiTag);

    let mapped = sorok.map(tagValasz);
    if (hianyossag) mapped = mapped.filter(tagVanHianyossag);

    return Response.json({
      sorok: mapped,
      count: mapped.length,
      osszes: osszes?.count ?? sorok.length,
      tagsag_statuszok: TAGSAG_STATUSZOK,
    });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('tagok', 'iras');
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const muvelet = typeof body.muvelet === 'string' ? body.muvelet : '';
    if (muvelet === 'erdeklodobol') {
      const diakId = Number(body.diak_regisztracio_id);
      const adoszam = typeof body.adoszam === 'string' ? body.adoszam : '';
      const eredmeny = await tagErdeklodobol(diakId, adoszam);
      if ('hiba' in eredmeny) {
        return Response.json({ hiba: eredmeny.hiba }, { status: eredmeny.status });
      }
      return Response.json({ ok: true, tag: eredmeny.tag }, { status: 201 });
    }

    const patch = tagInsertFromBody(body);
    if (!patch.nev || !patch.adoszam || !patch.email || !patch.iroda) {
      return Response.json(
        { hiba: 'Név, adószám, e-mail és iroda kötelező' },
        { status: 400 },
      );
    }

    const [uj] = await db
      .insert(szovetkezetiTag)
      .values({
        nev: patch.nev,
        adoszam: patch.adoszam,
        email: patch.email,
        iroda: patch.iroda,
        taj: patch.taj ?? null,
        telefon: patch.telefon ?? null,
        szuldat: patch.szuldat ?? null,
        lakcim: patch.lakcim ?? null,
        iskola: patch.iskola ?? null,
        bankszamlaszam: patch.bankszamlaszam ?? null,
        diakig: patch.diakig ?? null,
        diakigTipus: patch.diakigTipus ?? null,
        diakigMunkarend: patch.diakigMunkarend ?? null,
        diakigErvenyes: patch.diakigErvenyes ?? null,
        diakigOnlineHosszabbitas: patch.diakigOnlineHosszabbitas ?? false,
        tagsagStatusz: patch.tagsagStatusz ?? 'piszkozat',
        belepes: patch.belepes ?? null,
        kilepes: patch.kilepes ?? null,
        reszjegy: patch.reszjegy ?? 0,
        bank: patch.bank ?? 'nincs',
        eszerz: patch.eszerz ?? 'nincs',
        eszerzLejar: patch.eszerzLejar ?? null,
        uzemorv: patch.uzemorv ?? 'nincs',
        uzemorvLejar: patch.uzemorvLejar ?? null,
        tudo: patch.tudo ?? 'nincs',
        tudoLejar: patch.tudoLejar ?? null,
        szjaKedvezmenyek: patch.szjaKedvezmenyek ?? [],
        dokumentumok: patch.dokumentumok ?? [],
        diakRegisztracioId: patch.diakRegisztracioId ?? null,
      })
      .returning();

    return Response.json({ ok: true, tag: tagValasz(uj) }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('tagok', 'iras');
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const id = Number(body.id);
    if (!id) return Response.json({ hiba: 'Hiányzó tag azonosító' }, { status: 400 });

    const muvelet = typeof body.muvelet === 'string' ? body.muvelet : '';

    if (muvelet === 'tomeges') {
      const ids = Array.isArray(body.ids)
        ? body.ids.map((x) => Number(x)).filter(Boolean)
        : [];
      const akcio = typeof body.akcio === 'string' ? body.akcio : '';
      const eredmeny = await tagTomeges(ids, akcio);
      if ('hiba' in eredmeny) {
        return Response.json({ hiba: eredmeny.hiba }, { status: eredmeny.status });
      }
      return Response.json({ ok: true, ...eredmeny });
    }

    if (muvelet === 'atembeles') {
      const forras = typeof body.forras === 'string' ? body.forras : '';
      const eredmeny = await tagAtembeles(id, forras);
      if ('hiba' in eredmeny) {
        return Response.json({ hiba: eredmeny.hiba }, { status: eredmeny.status });
      }
      return Response.json({ ok: true, tag: eredmeny.tag });
    }

    const patch = tagInsertFromBody(body);
    if (!Object.keys(patch).length) {
      return Response.json({ hiba: 'Nincs módosítandó mező' }, { status: 400 });
    }

    if (Array.isArray(body.szja_kedvezmenyek)) {
      const normal = normalizaltSzjaKedvezmenyek(body.szja_kedvezmenyek);
      await syncSzjaKedvezmenyekFromUi(id, normal);
      patch.szjaKedvezmenyek = normal as unknown as Record<string, unknown>[];
    }

    const [friss] = await db
      .update(szovetkezetiTag)
      .set(patch)
      .where(eq(szovetkezetiTag.id, id))
      .returning();

    if (!friss) return Response.json({ hiba: 'Tag nem található' }, { status: 404 });
    return Response.json({ ok: true, tag: await tagValaszEnriched(friss) });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/tagok',
};
