import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { db } from '../../db/index.js';
import { diakRegisztracio, iceFelhasznalo } from '../../db/schema.js';
import { requireBelso } from './lib/auth.js';
import { desc, eq } from 'drizzle-orm';

interface RegisztracioBody {
  nev: string;
  email: string;
  telefon: string;
  szuldat: string;
  lakcim?: string;
  iroda: string;
  iskola?: string;
  megjegyzes?: string;
}

export default async (req: Request) => {
  if (req.method === 'GET') {
    const auth = await requireBelso('erdeklodok', 'olvasas');
    if (auth instanceof Response) return auth;

    const sorok = await db
      .select()
      .from(diakRegisztracio)
      .orderBy(desc(diakRegisztracio.letrehozva))
      .limit(200);
    return Response.json({ sorok, count: sorok.length });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: RegisztracioBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
  }

  const { nev, email, telefon, szuldat, iroda } = body;
  if (!nev?.trim() || !email?.trim() || !telefon?.trim() || !szuldat || !iroda?.trim()) {
    return Response.json(
      { hiba: 'Hiányzó kötelező mezők (név, email, telefon, születési dátum, iroda)' },
      { status: 400 },
    );
  }

  const [sor] = await db
    .insert(diakRegisztracio)
    .values({
      nev: nev.trim(),
      email: email.trim().toLowerCase(),
      telefon: telefon.trim(),
      szuldat,
      lakcim: body.lakcim?.trim() || null,
      iroda: iroda.trim(),
      iskola: body.iskola?.trim() || null,
      megjegyzes: body.megjegyzes?.trim() || null,
    })
    .returning();

  const identityUser = await getUser();
  if (identityUser) {
    const email = sor.email.toLowerCase();
    const [existing] = await db
      .select()
      .from(iceFelhasznalo)
      .where(eq(iceFelhasznalo.identityId, identityUser.id));

    if (!existing) {
      await db.insert(iceFelhasznalo).values({
        identityId: identityUser.id,
        email,
        szerep: 'diak',
        diakId: sor.id,
        aktiv: true,
      });
    }
  }

  return Response.json({ ok: true, id: sor.id, diak: sor }, { status: 201 });
};

export const config: Config = {
  path: '/api/regisztracio',
};
