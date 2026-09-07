import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { db } from '../../db/index.js';
import { iceFelhasznalo } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const identityUser = await getUser();
  if (!identityUser) {
    return Response.json({ hiba: 'Unauthorized' }, { status: 401 });
  }

  let body: { szerep: 'belso' | 'partner' | 'diak' };
  try {
    body = await req.json();
  } catch {
    return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
  }

  const email = String(identityUser.email ?? '').toLowerCase().trim();
  const identityId = identityUser.id;

  const [existing] = await db
    .select()
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.identityId, identityId));

  if (existing) {
    return Response.json({ ok: true, szerep: existing.szerep });
  }

  if (body.szerep !== 'belso') {
    return Response.json({ hiba: 'Csak belső link támogatott itt' }, { status: 400 });
  }

  const [created] = await db
    .insert(iceFelhasznalo)
    .values({
      identityId,
      email,
      szerep: 'belso',
      aktiv: true,
    })
    .returning();

  return Response.json({ ok: true, szerep: created.szerep }, { status: 201 });
};

export const config: Config = {
  path: '/api/auth/link',
};
