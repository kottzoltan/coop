import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { diakRegisztracio, munkaJelentkezes, munkaHirdetes } from '../../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import { requireBelso, requireDiak } from './lib/auth.js';
import { normalizaltDiakProfil, type DiakProfilPayload } from '../../shared/src/diak-profil.js';

interface BelepesBody {
  email: string;
  szuldat: string;
}

async function diakJelentkezesek(diakId: number) {
  return db
    .select({
      id: munkaJelentkezes.id,
      hirdetes_id: munkaJelentkezes.hirdetes_id,
      statusz: munkaJelentkezes.statusz,
      letrehozva: munkaJelentkezes.letrehozva,
      hirdetes_cim: munkaHirdetes.cim,
      hirdetes_varos: munkaHirdetes.varos,
      hirdetes_ber: munkaHirdetes.ber,
      projekt_id: munkaHirdetes.projekt_id,
    })
    .from(munkaJelentkezes)
    .innerJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
    .where(eq(munkaJelentkezes.regisztracio_id, diakId))
    .orderBy(desc(munkaJelentkezes.letrehozva));
}

function diakValasz(diak: typeof diakRegisztracio.$inferSelect, jelentkezesek: unknown[]) {
  const profil = normalizaltDiakProfil(diak.profil);
  return { diak: { ...diak, profil }, jelentkezesek, profil };
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'PATCH') {
    const auth = await requireDiak();
    if (auth instanceof Response) return auth;

    try {
      const body = (await req.json()) as { profil?: DiakProfilPayload };
      if (!body.profil) {
        return Response.json({ hiba: 'Hiányzó profil adat' }, { status: 400 });
      }

      const profil = normalizaltDiakProfil(body.profil);
      await db
        .update(diakRegisztracio)
        .set({ profil })
        .where(eq(diakRegisztracio.id, auth.diakId!));

      const [diak] = await db
        .select()
        .from(diakRegisztracio)
        .where(eq(diakRegisztracio.id, auth.diakId!));

      if (!diak) return Response.json({ hiba: 'Diák nem található' }, { status: 404 });

      const jelentkezesek = await diakJelentkezesek(diak.id);
      return Response.json(diakValasz(diak, jelentkezesek));
    } catch (err) {
      console.error('api-diak-belepes PATCH:', err);
      return Response.json({ hiba: 'Profil mentés sikertelen' }, { status: 500 });
    }
  }

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    if (!id) {
      return Response.json({ hiba: 'Hiányzó diák azonosító' }, { status: 400 });
    }

    const belso = url.searchParams.get('belso') === '1';
    if (belso) {
      const auth = await requireBelso('erdeklodok', 'olvasas');
      if (auth instanceof Response) return auth;
    } else {
      const auth = await requireDiak();
      if (auth instanceof Response) return auth;
      if (auth.diakId !== Number(id)) {
        return Response.json({ hiba: 'Nincs hozzáférés' }, { status: 403 });
      }
    }

    const [diak] = await db
      .select()
      .from(diakRegisztracio)
      .where(eq(diakRegisztracio.id, Number(id)));

    if (!diak) {
      return Response.json({ hiba: 'Diák nem található' }, { status: 404 });
    }

    const jelentkezesek = await diakJelentkezesek(diak.id);
    return Response.json(diakValasz(diak, jelentkezesek));
  }

  if (req.method === 'POST') {
    let body: BelepesBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    const szuldat = body.szuldat;
    if (!email || !szuldat) {
      return Response.json({ hiba: 'E-mail és születési dátum kötelező' }, { status: 400 });
    }

    const [diak] = await db
      .select()
      .from(diakRegisztracio)
      .where(and(eq(diakRegisztracio.email, email), eq(diakRegisztracio.szuldat, szuldat)));

    if (!diak) {
      return Response.json(
        { hiba: 'Nem található regisztráció ezzel az e-mail címmel és születési dátummal.' },
        { status: 401 },
      );
    }

    return Response.json({ ok: true, diak: { ...diak, profil: normalizaltDiakProfil(diak.profil) } });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/diak-belepes',
};
