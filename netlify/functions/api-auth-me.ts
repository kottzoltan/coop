import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { diakRegisztracio, partnerRegisztracio } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getIceAuth } from './lib/auth.js';

export default async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const auth = await getIceAuth();
  if (!auth) {
    return Response.json({ me: null }, { status: 200 });
  }

  if (auth.szerep === 'diak' && auth.diakId) {
    const [diak] = await db
      .select()
      .from(diakRegisztracio)
      .where(eq(diakRegisztracio.id, auth.diakId));

    return Response.json({
      me: {
        szerep: auth.szerep,
        diak,
        jogosultsagok: auth.jogosultsagok,
      },
    });
  }

  if (auth.szerep === 'partner' && auth.partnerKapcsolatId) {
    const [partner] = await db
      .select()
      .from(partnerRegisztracio)
      .where(eq(partnerRegisztracio.id, auth.partnerKapcsolatId));

    return Response.json({
      me: {
        szerep: auth.szerep,
        partner: partner
          ? {
              id: partner.id,
              cegnev: partner.cegnev,
              statusz: partner.statusz,
              hozzaferes: partner.hozzaferes ?? 'iras',
            }
          : null,
        jogosultsagok: auth.jogosultsagok,
      },
    });
  }

  if (auth.szerep === 'belso') {
    return Response.json({
      me: {
        szerep: auth.szerep,
        email: auth.email,
        jogosultsagok: auth.jogosultsagok,
      },
    });
  }

  return Response.json({ me: { szerep: auth.szerep, jogosultsagok: auth.jogosultsagok } });
};

export const config: Config = {
  path: '/api/auth/me',
};
