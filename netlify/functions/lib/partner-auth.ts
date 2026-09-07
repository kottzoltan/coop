import { getIceAuth } from './auth.js';
import { db } from '../../../db/index.js';
import { partnerRegisztracio } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { envGet } from './netlify-env.js';

/** Demo partner: GreenPark Kft. — csak lokális dev / ICE_DEMO_PARTNER=1 */
export const DEMO_PARTNER_ID = 1;

function demoPartnerEngedelyezett(): boolean {
  if (envGet('ICE_DEMO_PARTNER') === '1') return true;
  if (envGet('NETLIFY_DEV') === 'true') return true;
  if (envGet('CONTEXT') === 'dev') return true;
  return false;
}

export async function getPartnerContext(): Promise<
  { partnerId: number; demo: boolean; hozzaferes: 'olvasas' | 'iras' } | Response
> {
  const auth = await getIceAuth();
  if (auth?.szerep === 'partner' && auth.partnerKapcsolatId) {
    const [reg] = await db
      .select({ hozzaferes: partnerRegisztracio.hozzaferes })
      .from(partnerRegisztracio)
      .where(eq(partnerRegisztracio.id, auth.partnerKapcsolatId));
    const hozzaferes =
      reg?.hozzaferes === 'olvasas' || reg?.hozzaferes === 'iras' ? reg.hozzaferes : 'iras';
    return { partnerId: auth.partnerKapcsolatId, demo: false, hozzaferes };
  }

  if (demoPartnerEngedelyezett()) {
    return { partnerId: DEMO_PARTNER_ID, demo: true, hozzaferes: 'iras' };
  }

  return Response.json({ hiba: 'Nincs partner hozzáférés — jelentkezz be.' }, { status: 401 });
}

export function partnerIrasSzukseges(
  ctx: { hozzaferes: 'olvasas' | 'iras'; demo: boolean },
): Response | null {
  if (ctx.demo || ctx.hozzaferes === 'iras') return null;
  return Response.json({ hiba: 'Írási jogosultság szükséges ehhez a művelethez.' }, { status: 403 });
}
