import { getUser } from '@netlify/identity';
import { db } from '../../../db/index.js';
import { belsoJogosultsag, diakRegisztracio, iceFelhasznalo } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { UGYCSOPORTOK } from '../../../shared/src/ugycsoportok.js';
import type { Ugycsoport } from '../../../shared/src/ugycsoportok.js';

export interface IceAuthContext {
  identityId: string;
  email: string;
  szerep: string;
  diakId: number | null;
  partnerKapcsolatId: number | null;
  jogosultsagok: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }>;
}

async function ensureIceUser(identityId: string, email: string) {
  let [iceUser] = await db
    .select()
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.identityId, identityId));

  if (!iceUser && email) {
    const [diak] = await db
      .select()
      .from(diakRegisztracio)
      .where(eq(diakRegisztracio.email, email));

    if (diak) {
      const inserted = await db
        .insert(iceFelhasznalo)
        .values({
          identityId,
          email,
          szerep: 'diak',
          diakId: diak.id,
          partnerKapcsolatId: null,
          aktiv: true,
        })
        .returning();
      iceUser = inserted[0];
    }
  }

  return iceUser ?? null;
}

export async function getIceAuth(): Promise<IceAuthContext | null> {
  const identityUser = await getUser();
  if (!identityUser) return null;

  const email = String(identityUser.email ?? '').toLowerCase().trim();
  const iceUser = await ensureIceUser(identityUser.id, email);

  if (!iceUser || !iceUser.aktiv) return null;

  let jogosultsagok = await db
    .select()
    .from(belsoJogosultsag)
    .where(eq(belsoJogosultsag.felhasznaloIdentityId, identityUser.id));

  // Bootstrap: belső user jogosultság nélkül → minden ügycsoport írással
  if (iceUser.szerep === 'belso' && jogosultsagok.length === 0) {
    jogosultsagok = UGYCSOPORTOK.map((ugycsoport) => ({
      felhasznaloIdentityId: identityUser.id,
      ugycsoport,
      olvasas: true,
      iras: true,
    }));
  }

  return {
    identityId: identityUser.id,
    email: iceUser.email,
    szerep: iceUser.szerep,
    diakId: iceUser.diakId,
    partnerKapcsolatId: iceUser.partnerKapcsolatId,
    jogosultsagok: jogosultsagok.map((j) => ({
      ugycsoport: j.ugycsoport,
      olvasas: j.olvasas || j.iras,
      iras: j.iras,
    })),
  };
}

export function vanJog(
  auth: IceAuthContext,
  ugycsoport: Ugycsoport,
  szint: 'olvasas' | 'iras',
): boolean {
  if (auth.szerep !== 'belso') return false;
  const admin = auth.jogosultsagok.find((j) => j.ugycsoport === 'admin');
  if (admin?.iras) return true;
  const j = auth.jogosultsagok.find((x) => x.ugycsoport === ugycsoport);
  if (!j) return false;
  if (szint === 'iras') return j.iras;
  return j.olvasas;
}

export async function requireBelso(
  ugycsoport: Ugycsoport,
  szint: 'olvasas' | 'iras',
): Promise<IceAuthContext | Response> {
  const auth = await getIceAuth();
  if (!auth || auth.szerep !== 'belso') {
    return Response.json({ hiba: 'Nincs belső hozzáférés' }, { status: 401 });
  }
  if (!vanJog(auth, ugycsoport, szint)) {
    return Response.json({ hiba: 'Nincs jogosultság' }, { status: 403 });
  }
  return auth;
}

export async function requireDiak(): Promise<IceAuthContext | Response> {
  const auth = await getIceAuth();
  if (!auth || auth.szerep !== 'diak' || !auth.diakId) {
    return Response.json({ hiba: 'Nincs diák hozzáférés' }, { status: 401 });
  }
  return auth;
}

export async function requirePartner(): Promise<IceAuthContext | Response> {
  const auth = await getIceAuth();
  if (!auth || auth.szerep !== 'partner') {
    return Response.json({ hiba: 'Nincs partner hozzáférés' }, { status: 401 });
  }
  return auth;
}
