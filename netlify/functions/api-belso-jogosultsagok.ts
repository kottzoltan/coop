import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { belsoJogosultsag, iceFelhasznalo } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import { UGYCSOPORTOK } from '../../shared/src/ugycsoportok.js';
import {
  identityBelsoFelhasznaloLetrehozas,
  jogosultsagMatrixMentese,
} from './lib/belso-felhasznalo.js';

export default async (req: Request) => {
  const auth = await requireBelso('admin', req.method === 'GET' ? 'olvasas' : 'iras');
  if (auth instanceof Response) return auth;

  if (req.method === 'GET') {
    const felhasznalok = await db
      .select()
      .from(iceFelhasznalo)
      .where(eq(iceFelhasznalo.szerep, 'belso'));

    const matrix = await Promise.all(
      felhasznalok.map(async (f) => {
        const jogok = await db
          .select()
          .from(belsoJogosultsag)
          .where(eq(belsoJogosultsag.felhasznaloIdentityId, f.identityId));
        return { felhasznalo: f, jogosultsagok: jogok };
      }),
    );

    return Response.json({
      felhasznalok: matrix,
      ugycsoportok: UGYCSOPORTOK,
    });
  }

  if (req.method === 'POST') {
    let body: {
      email?: string;
      password?: string;
      jogosultsagok?: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }>;
    };
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

    const jogosultsagok = body.jogosultsagok ?? [];

    try {
      const identityUser = await identityBelsoFelhasznaloLetrehozas(
        email,
        password,
        jogosultsagok,
      );

      return Response.json(
        {
          ok: true,
          felhasznalo: { identityId: identityUser.id, email, szerep: 'belso' },
        },
        { status: 201 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Létrehozás sikertelen';
      return Response.json({ hiba: msg }, { status: 500 });
    }
  }

  if (req.method === 'PUT') {
    let body: {
      identity_id: string;
      jogosultsagok: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }>;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.identity_id) {
      return Response.json({ hiba: 'Hiányzó identity_id' }, { status: 400 });
    }

    await jogosultsagMatrixMentese(body.identity_id, body.jogosultsagok ?? []);

    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/belso-jogosultsagok',
};
