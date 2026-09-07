import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { db } from '../../db/index.js';
import { iceFelhasznalo, partnerRegisztracio } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

interface PartnerRegisztracioBody {
  cegnev: string;
  adoszam: string;
  kapcsolat_nev: string;
  email: string;
  telefon?: string;
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const identityUser = await getUser();
  if (!identityUser) {
    return Response.json({ hiba: 'Unauthorized' }, { status: 401 });
  }

  let body: PartnerRegisztracioBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
  }

  const identityId = identityUser.id;
  const identityEmail = String(identityUser.email ?? '').toLowerCase().trim();
  const email = String(body.email ?? '').toLowerCase().trim();

  if (!body.cegnev?.trim() || !body.adoszam?.trim() || !body.kapcsolat_nev?.trim() || !email) {
    return Response.json({ hiba: 'Hiányzó kötelező mezők' }, { status: 400 });
  }

  if (identityEmail && identityEmail !== email) {
    return Response.json({ hiba: 'Az Identity e-mail és a beküldött e-mail nem egyezik.' }, { status: 400 });
  }

  const [partner] = await db
    .insert(partnerRegisztracio)
    .values({
      cegnev: body.cegnev.trim(),
      adoszam: body.adoszam.trim(),
      kapcsolatNev: body.kapcsolat_nev.trim(),
      email,
      telefon: body.telefon?.trim() || null,
      statusz: 'függőben',
    })
    .returning();

  if (!partner) {
    return Response.json({ hiba: 'Partner regisztráció mentése sikertelen' }, { status: 500 });
  }

  const [existing] = await db
    .select()
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.identityId, identityId));

  if (existing) {
    await db
      .update(iceFelhasznalo)
      .set({
        email,
        szerep: 'partner',
        partnerKapcsolatId: partner.id,
        diakId: null,
        aktiv: false,
      })
      .where(eq(iceFelhasznalo.identityId, identityId));
  } else {
    await db.insert(iceFelhasznalo).values({
      identityId,
      email,
      szerep: 'partner',
      diakId: null,
      partnerKapcsolatId: partner.id,
      aktiv: false,
    });
  }

  return Response.json({ ok: true, id: partner.id, statusz: partner.statusz }, { status: 201 });
};

export const config: Config = {
  path: '/api/partner-regisztracio',
};

