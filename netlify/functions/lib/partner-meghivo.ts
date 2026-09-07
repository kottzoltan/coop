import { randomBytes } from 'node:crypto';
import { admin, AuthError } from '@netlify/identity';
import { db } from '../../../db/index.js';
import {
  iceFelhasznalo,
  partner,
  partnerKapcsolattarto,
  partnerMeghivo,
  partnerRegisztracio,
  projekt,
} from '../../../db/schema.js';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { envGet } from './netlify-env.js';
import { kuldesPartnerMeghivoEmail } from './email-kuldes.js';
import {
  meghivoSablonValtozok,
  partnerMeghivoSablonLekerdezes,
  sablonRender,
} from './coop-beallitas.js';

const MEGHIVO_NAPOK = 14;

export interface MeghivoKuldesInput {
  email: string;
  nev: string;
  uzenet?: string;
  hozzaferes?: 'olvasas' | 'iras';
  forras: 'projekt' | 'partner_crm';
  partnerId?: number | null;
  projektId?: number | null;
  partnerKapcsolattartoId?: number | null;
  projektKapcsolatIndex?: number | null;
  kuldteIdentityId: string;
}

function siteUrl(): string {
  return (
    envGet('URL') ??
    envGet('DEPLOY_URL') ??
    envGet('SITE_URL') ??
    'https://ice89.netlify.app'
  ).replace(/\/$/, '');
}

function meghivoToken(): string {
  return randomBytes(32).toString('hex');
}

async function partnerAdatok(meghivo: {
  partnerId: number | null;
  projektId: number | null;
}): Promise<{ cegnev: string; adoszam: string; partnerCrmId: number | null; projektNev: string | null }> {
  let cegnev = 'Partner';
  let adoszam = '—';
  let partnerCrmId: number | null = meghivo.partnerId;
  let projektNev: string | null = null;

  if (meghivo.partnerId) {
    const [p] = await db.select().from(partner).where(eq(partner.id, meghivo.partnerId));
    if (p) {
      cegnev = p.nev;
      adoszam = p.adoszam ?? '—';
    }
  }

  if (meghivo.projektId) {
    const [pr] = await db.select().from(projekt).where(eq(projekt.id, meghivo.projektId));
    if (pr) {
      projektNev = pr.nev;
      if (!meghivo.partnerId && pr.partner_nev) {
        cegnev = pr.partner_nev;
      }
      if (!meghivo.partnerId && pr.partnerId) {
        partnerCrmId = pr.partnerId;
        const [p] = await db.select().from(partner).where(eq(partner.id, pr.partnerId));
        if (p?.adoszam) adoszam = p.adoszam;
      }
    }
  }

  return { cegnev, adoszam, partnerCrmId, projektNev };
}

export async function partnerMeghivoKuldes(input: MeghivoKuldesInput) {
  const email = input.email.toLowerCase().trim();
  if (!email || !input.nev.trim()) {
    throw new Error('E-mail és név kötelező.');
  }

  const lejarat = new Date();
  lejarat.setDate(lejarat.getDate() + MEGHIVO_NAPOK);

  const { cegnev, adoszam, partnerCrmId, projektNev } = await partnerAdatok({
    partnerId: input.partnerId ?? null,
    projektId: input.projektId ?? null,
  });

  await partnerRegisztracioJovahagyasMeghivohoz({
    email,
    nev: input.nev.trim(),
    cegnev,
    adoszam,
    partnerCrmId,
    jovahagytaId: input.kuldteIdentityId,
    hozzaferes: input.hozzaferes ?? 'iras',
  });

  const token = meghivoToken();
  const link = `${siteUrl()}/partner/meghivo?token=${token}`;

  const sablon = await partnerMeghivoSablonLekerdezes();
  const renderelt = sablonRender(
    sablon,
    meghivoSablonValtozok({
      nev: input.nev.trim(),
      email,
      cegnev: cegnev !== 'Partner' ? cegnev : 'Coop Partner',
      projektNev,
      link,
      lejarat,
      egyediUzenet: input.uzenet,
    }),
  );

  if (input.partnerKapcsolattartoId && input.hozzaferes && input.hozzaferes !== 'nincs') {
    await db
      .update(partnerKapcsolattarto)
      .set({ hozzaferes: input.hozzaferes })
      .where(eq(partnerKapcsolattarto.id, input.partnerKapcsolattartoId));
  }

  await db
    .update(partnerMeghivo)
    .set({ statusz: 'visszavonva' })
    .where(
      and(
        eq(partnerMeghivo.email, email),
        eq(partnerMeghivo.statusz, 'küldve'),
      ),
    );

  const [sor] = await db
    .insert(partnerMeghivo)
    .values({
      token,
      email,
      nev: input.nev.trim(),
      uzenet: renderelt.szoveg,
      emailTargy: renderelt.targy,
      forras: input.forras,
      partnerId: input.partnerId ?? null,
      projektId: input.projektId ?? null,
      partnerKapcsolattartoId: input.partnerKapcsolattartoId ?? null,
      projektKapcsolatIndex: input.projektKapcsolatIndex ?? null,
      hozzaferes: input.hozzaferes ?? 'iras',
      statusz: 'küldve',
      kuldteIdentityId: input.kuldteIdentityId,
      lejarat,
    })
    .returning()
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('partner_meghivo') || msg.includes('does not exist')) {
        throw new Error('A meghívó tábla még nem létezik — várd meg a deploy befejezését.');
      }
      throw err;
    });

  const { kuldve: sablonEmail, hiba: emailHiba } = await kuldesPartnerMeghivoEmail(
    email,
    renderelt.targy,
    renderelt.szoveg,
  );

  return {
    sor,
    link,
    emailKuldve: sablonEmail,
    emailSzolgaltato: sablonEmail ? 'ice_sablon' : null,
    emailHiba,
  };
}

export async function partnerMeghivoLekerdezes(token: string) {
  const [meghivo] = await db
    .select()
    .from(partnerMeghivo)
    .where(eq(partnerMeghivo.token, token));

  if (!meghivo || meghivo.statusz !== 'küldve') {
    return null;
  }

  if (meghivo.lejarat && meghivo.lejarat < new Date()) {
    await db
      .update(partnerMeghivo)
      .set({ statusz: 'lejárt' })
      .where(eq(partnerMeghivo.id, meghivo.id));
    return null;
  }

  const { cegnev, projektNev } = await partnerAdatok(meghivo);

  return {
    nev: meghivo.nev,
    email: meghivo.email,
    uzenet: meghivo.uzenet,
    cegnev,
    projektNev,
    hozzaferes: meghivo.hozzaferes,
    lejarat: meghivo.lejarat,
  };
}

function identityNemTalalhato(err: unknown): boolean {
  if (!(err instanceof AuthError)) return false;
  if (err.status === 404) return true;
  return err.message.toLowerCase().includes('not found');
}

/** Identity user létezik-e — elavult ice_felhasznalo.identityId kiszűrése. */
async function identityUserIdEllenorzes(identityId: string): Promise<string | null> {
  try {
    const user = await admin.getUser(identityId);
    return user.id;
  } catch (err) {
    if (identityNemTalalhato(err)) return null;
    throw err;
  }
}

async function identityUserIdEmailhez(email: string): Promise<string | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const users = await admin.listUsers({ page, perPage });
    const found = users.find((u) => u.email?.toLowerCase() === normalized);
    if (found) return found.id;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

/** Jelszó beállítás + e-mail kényszerített megerősítés (Identity invite után gyakran unconfirmed). */
async function identityJelszoEsMegerosites(identityId: string, password: string) {
  await admin.updateUser(identityId, { password, confirm: true });
}

async function partnerIdentityIdFeloldas(
  email: string,
  iceIdentityId: string | null | undefined,
): Promise<string | null> {
  if (iceIdentityId) {
    const ellenorzott = await identityUserIdEllenorzes(iceIdentityId);
    if (ellenorzott) return ellenorzott;
  }
  return identityUserIdEmailhez(email);
}

async function partnerRegisztracioJovahagyasMeghivohoz(input: {
  email: string;
  nev: string;
  cegnev: string;
  adoszam: string;
  partnerCrmId: number | null;
  jovahagytaId: string;
  hozzaferes?: 'olvasas' | 'iras' | 'nincs';
}): Promise<number> {
  const email = input.email.toLowerCase().trim();
  const hozzaferes = input.hozzaferes ?? 'iras';
  const [meglevo] = await db
    .select()
    .from(partnerRegisztracio)
    .where(eq(partnerRegisztracio.email, email));

  if (!meglevo) {
    const [uj] = await db
      .insert(partnerRegisztracio)
      .values({
        cegnev: input.cegnev,
        adoszam: input.adoszam,
        kapcsolatNev: input.nev,
        email,
        statusz: 'jóváhagyva',
        hozzaferes,
        jovahagytaId: input.jovahagytaId,
        partnerCrmId: input.partnerCrmId,
        megjegyzes: 'Automatikus jóváhagyás belső partner meghívó küldésekor',
      })
      .returning();
    if (!uj) throw new Error('Partner regisztráció mentése sikertelen.');
    return uj.id;
  }

  const [friss] = await db
    .update(partnerRegisztracio)
    .set({
      statusz: 'jóváhagyva',
      hozzaferes,
      jovahagytaId: input.jovahagytaId,
      kapcsolatNev: input.nev,
      cegnev: input.cegnev !== 'Partner' ? input.cegnev : meglevo.cegnev,
      adoszam: input.adoszam !== '—' ? input.adoszam : meglevo.adoszam,
      partnerCrmId: input.partnerCrmId ?? meglevo.partnerCrmId,
      megjegyzes: 'Automatikus jóváhagyás belső partner meghívó küldésekor',
    })
    .where(eq(partnerRegisztracio.id, meglevo.id))
    .returning();

  return friss?.id ?? meglevo.id;
}

async function partnerIdentityFiókBeállítás(
  email: string,
  password: string,
  nev: string,
  partnerRegisztracioId: number,
  options?: { portalAktivalas?: boolean },
): Promise<string> {
  const [iceByEmail] = await db
    .select()
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.email, email));

  if (iceByEmail && iceByEmail.szerep !== 'partner') {
    throw new Error('Ez az e-mail cím már más szerepkörhöz tartozik a rendszerben.');
  }

  let identityId = await partnerIdentityIdFeloldas(email, iceByEmail?.identityId);

  if (!identityId) {
    try {
      const user = await admin.createUser({
        email,
        password,
        data: { user_metadata: { full_name: nev } },
      });
      identityId = user.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const letezo =
        msg.toLowerCase().includes('already') || (err instanceof AuthError && err.status === 422);
      if (!letezo) {
        throw err instanceof Error ? err : new Error('Identity fiók létrehozása sikertelen.');
      }
      const meglevoId = await identityUserIdEmailhez(email);
      if (!meglevoId) {
        throw new Error('Identity fiók már létezik, de nem található — lépj kapcsolatba az üzemeltetővel.');
      }
      await identityJelszoEsMegerosites(meglevoId, password);
      identityId = meglevoId;
    }
  } else {
    await identityJelszoEsMegerosites(identityId, password);
  }

  const [existingIce] = await db
    .select()
    .from(iceFelhasznalo)
    .where(
      or(
        eq(iceFelhasznalo.identityId, identityId),
        eq(iceFelhasznalo.email, email),
        eq(iceFelhasznalo.partnerKapcsolatId, partnerRegisztracioId),
      ),
    );

  const iceAdatok = {
    email,
    szerep: 'partner' as const,
    partnerKapcsolatId: partnerRegisztracioId,
    diakId: null,
    aktiv: options?.portalAktivalas !== false,
  };

  if (existingIce) {
    if (existingIce.identityId === identityId) {
      await db
        .update(iceFelhasznalo)
        .set({
          ...iceAdatok,
          ...(options?.portalAktivalas ? { aktiv: true } : {}),
        })
        .where(eq(iceFelhasznalo.identityId, identityId));
    } else {
      // identity_id a PK — elavult rekord törlése, új Identity ID-vel újra létrehozás
      await db
        .delete(iceFelhasznalo)
        .where(eq(iceFelhasznalo.identityId, existingIce.identityId));
      await db.insert(iceFelhasznalo).values({
        identityId,
        ...iceAdatok,
      });
    }
  } else {
    await db.insert(iceFelhasznalo).values({
      identityId,
      ...iceAdatok,
    });
  }

  return identityId;
}

/** Belépés előtt: meghívott / jóváhagyott partner Identity + ICE fiók szinkron. */
export async function partnerBelepesElokeszites(email: string, password: string) {
  if (password.length < 8) {
    throw new Error('A jelszó legalább 8 karakter legyen.');
  }

  const normalized = email.toLowerCase().trim();

  const [aktivMeghivo] = await db
    .select()
    .from(partnerMeghivo)
    .where(
      and(
        eq(partnerMeghivo.email, normalized),
        eq(partnerMeghivo.statusz, 'küldve'),
      ),
    )
    .orderBy(desc(partnerMeghivo.kuldve))
    .limit(1);

  if (aktivMeghivo?.lejarat && aktivMeghivo.lejarat < new Date()) {
    throw new Error('A meghívó lejárt. Kérd az újraküldést a Coop-tól.');
  }

  const [reg] = await db
    .select()
    .from(partnerRegisztracio)
    .where(eq(partnerRegisztracio.email, normalized));

  let partnerRegisztracioId: number;
  let nev: string;

  if (aktivMeghivo) {
    const { cegnev, adoszam, partnerCrmId } = await partnerAdatok(aktivMeghivo);
    partnerRegisztracioId = await partnerRegisztracioJovahagyasMeghivohoz({
      email: normalized,
      nev: aktivMeghivo.nev,
      cegnev,
      adoszam,
      partnerCrmId,
      jovahagytaId: aktivMeghivo.kuldteIdentityId,
      hozzaferes:
        aktivMeghivo.hozzaferes === 'olvasas' || aktivMeghivo.hozzaferes === 'nincs'
          ? aktivMeghivo.hozzaferes
          : 'iras',
    });
    nev = aktivMeghivo.nev;
  } else if (reg?.statusz === 'jóváhagyva') {
    partnerRegisztracioId = reg.id;
    nev = reg.kapcsolatNev ?? normalized;
  } else {
    throw new Error(
      'Ehhez az e-mail címhez nincs aktív partner meghívó. Kérd a meghívót a Coop-tól, vagy használd a meghívó linket.',
    );
  }

  const [icePartner] = await db
    .select()
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.partnerKapcsolatId, partnerRegisztracioId));

  const portalAktivalas =
    Boolean(aktivMeghivo) ||
    (reg?.statusz === 'jóváhagyva' &&
      (reg.hozzaferes ?? 'iras') !== 'nincs' &&
      (icePartner?.aktiv ?? true));

  const identityId = await partnerIdentityFiókBeállítás(
    normalized,
    password,
    nev,
    partnerRegisztracioId,
    { portalAktivalas },
  );

  if (aktivMeghivo) {
    await db
      .update(partnerMeghivo)
      .set({
        statusz: 'elfogadva',
        elfogadva: sql`now()`,
        identityId,
      })
      .where(eq(partnerMeghivo.id, aktivMeghivo.id));
  }

  return { email: normalized, identityId, partnerRegisztracioId };
}

export async function partnerMeghivoElfogadas(token: string, password: string) {
  if (password.length < 8) {
    throw new Error('A jelszó legalább 8 karakter legyen.');
  }

  const [meghivo] = await db
    .select()
    .from(partnerMeghivo)
    .where(eq(partnerMeghivo.token, token));

  if (!meghivo || meghivo.statusz !== 'küldve') {
    throw new Error('Érvénytelen vagy már felhasznált meghívó.');
  }

  if (meghivo.lejarat && meghivo.lejarat < new Date()) {
    await db
      .update(partnerMeghivo)
      .set({ statusz: 'lejárt' })
      .where(eq(partnerMeghivo.id, meghivo.id));
    throw new Error('A meghívó lejárt. Kérd az újraküldést a Coop-tól.');
  }

  const email = meghivo.email.toLowerCase();
  const { cegnev, adoszam, partnerCrmId } = await partnerAdatok(meghivo);

  const partnerRegisztracioId = await partnerRegisztracioJovahagyasMeghivohoz({
    email,
    nev: meghivo.nev,
    cegnev,
    adoszam,
    partnerCrmId,
    jovahagytaId: meghivo.kuldteIdentityId,
    hozzaferes:
      meghivo.hozzaferes === 'olvasas' || meghivo.hozzaferes === 'nincs'
        ? meghivo.hozzaferes
        : 'iras',
  });

  const identityId = await partnerIdentityFiókBeállítás(
    email,
    password,
    meghivo.nev,
    partnerRegisztracioId,
    { portalAktivalas: true },
  );

  if (meghivo.partnerKapcsolattartoId && meghivo.hozzaferes !== 'nincs') {
    await db
      .update(partnerKapcsolattarto)
      .set({ hozzaferes: meghivo.hozzaferes })
      .where(eq(partnerKapcsolattarto.id, meghivo.partnerKapcsolattartoId));
  }

  await db
    .update(partnerMeghivo)
    .set({
      statusz: 'elfogadva',
      elfogadva: sql`now()`,
      identityId,
    })
    .where(eq(partnerMeghivo.id, meghivo.id));

  return { email, identityId, partnerRegisztracioId };
}

export async function partnerMeghivoLista(statusz?: string) {
  const base = db.select().from(partnerMeghivo).orderBy(desc(partnerMeghivo.kuldve)).limit(200);
  const sorok =
    statusz && statusz !== 'mind'
      ? await base.where(eq(partnerMeghivo.statusz, statusz))
      : await base;

  const enriched = await Promise.all(
    sorok.map(async (s) => {
      const { cegnev, projektNev } = await partnerAdatok(s);
      return {
        id: s.id,
        email: s.email,
        nev: s.nev,
        statusz: s.statusz,
        forras: s.forras,
        hozzaferes: s.hozzaferes,
        cegnev,
        projekt_nev: projektNev,
        partner_id: s.partnerId,
        projekt_id: s.projektId,
        kuldve: s.kuldve,
        lejarat: s.lejarat,
        elfogadva: s.elfogadva,
        email_targy: s.emailTargy,
      };
    }),
  );

  return enriched;
}

export async function partnerMeghivoVisszavonas(id: number) {
  const [sor] = await db
    .update(partnerMeghivo)
    .set({ statusz: 'visszavonva' })
    .where(and(eq(partnerMeghivo.id, id), eq(partnerMeghivo.statusz, 'küldve')))
    .returning();
  return sor ?? null;
}

export function partnerMeghivoLink(token: string): string {
  return `${siteUrl()}/partner/meghivo?token=${token}`;
}

export async function partnerMeghivoLinkById(id: number): Promise<string | null> {
  const [sor] = await db.select().from(partnerMeghivo).where(eq(partnerMeghivo.id, id));
  if (!sor) return null;
  return partnerMeghivoLink(sor.token);
}
