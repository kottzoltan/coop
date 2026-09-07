import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { iceFelhasznalo } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { UGYCSOPORTOK } from '../../shared/src/ugycsoportok.js';
import { identityBelsoFelhasznaloLetrehozas } from './lib/belso-felhasznalo.js';

async function belsoFelhasznaloSzam(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.szerep, 'belso'));
  return row?.count ?? 0;
}

export default async (req: Request) => {
  if (req.method === 'GET') {
    const count = await belsoFelhasznaloSzam();
    return Response.json({ canBootstrap: count === 0 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const count = await belsoFelhasznaloSzam();
  if (count > 0) {
    return Response.json(
      { hiba: 'Már van belső felhasználó — használd a Jogosultságok oldalt.' },
      { status: 403 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
  }

  const email = String(body.email ?? '').toLowerCase().trim();
  const password = String(body.password ?? '');

  if (!email || !password) {
    return Response.json({ hiba: 'E-mail és jelszó kötelező' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ hiba: 'A jelszó legalább 8 karakter legyen' }, { status: 400 });
  }

  const teljesAdmin = UGYCSOPORTOK.map((ugycsoport) => ({
    ugycsoport,
    olvasas: true,
    iras: true,
  }));

  try {
    const identityUser = await identityBelsoFelhasznaloLetrehozas(
      email,
      password,
      teljesAdmin,
    );

    return Response.json({
      ok: true,
      email,
      identityId: identityUser.id,
      uzenet: 'Admin felhasználó létrehozva. Most beléphetsz a /belso/belepes oldalon.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bootstrap sikertelen';
    return Response.json({ hiba: msg }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/auth/bootstrap',
};
