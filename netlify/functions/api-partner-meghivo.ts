import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { requireBelso } from './lib/auth.js';
import {
  partnerMeghivoElfogadas,
  partnerMeghivoKuldes,
  partnerMeghivoLekerdezes,
} from './lib/partner-meghivo.js';

interface MeghivoKuldesBody {
  email: string;
  nev: string;
  uzenet?: string;
  hozzaferes?: 'olvasas' | 'iras';
  forras: 'projekt' | 'partner_crm';
  partner_id?: number;
  projekt_id?: number;
  partner_kapcsolattarto_id?: number;
  projekt_kapcsolat_index?: number;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const elfogadas = url.searchParams.get('muvelet') === 'elfogadas';

  if (req.method === 'GET') {
    const token = url.searchParams.get('token')?.trim();
    if (!token) {
      return Response.json({ hiba: 'Hiányzó token' }, { status: 400 });
    }
    const meghivo = await partnerMeghivoLekerdezes(token);
    if (!meghivo) {
      return Response.json({ hiba: 'Érvénytelen vagy lejárt meghívó' }, { status: 404 });
    }
    return Response.json({ meghivo });
  }

  if (req.method === 'POST' && elfogadas) {
    let body: { token?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const token = String(body.token ?? '').trim();
    const password = String(body.password ?? '');
    if (!token || !password) {
      return Response.json({ hiba: 'Token és jelszó kötelező' }, { status: 400 });
    }

    try {
      const eredmeny = await partnerMeghivoElfogadas(token, password);
      return Response.json({ ok: true, ...eredmeny });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Elfogadás sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  if (req.method === 'POST') {
    const identityUser = await getUser();
    if (!identityUser) {
      return Response.json({ hiba: 'Unauthorized' }, { status: 401 });
    }

    const auth = await requireBelso('partnerek', 'iras');
    if (auth instanceof Response) return auth;

    let body: MeghivoKuldesBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const email = String(body.email ?? '').toLowerCase().trim();
    const nev = String(body.nev ?? '').trim();
    if (!email || !nev) {
      return Response.json({ hiba: 'E-mail és név kötelező' }, { status: 400 });
    }

    if (body.forras !== 'projekt' && body.forras !== 'partner_crm') {
      return Response.json({ hiba: 'Érvénytelen forrás' }, { status: 400 });
    }

    try {
      const { link, emailKuldve, sor, emailHiba } = await partnerMeghivoKuldes({
        email,
        nev,
        uzenet: body.uzenet,
        hozzaferes: body.hozzaferes,
        forras: body.forras,
        partnerId: body.partner_id ?? null,
        projektId: body.projekt_id ?? null,
        partnerKapcsolattartoId: body.partner_kapcsolattarto_id ?? null,
        projektKapcsolatIndex: body.projekt_kapcsolat_index ?? null,
        kuldteIdentityId: identityUser.id,
      });

      return Response.json({
        ok: true,
        id: sor.id,
        link,
        email_kuldve: emailKuldve,
        email_hiba: emailHiba ?? null,
        uzenet: emailKuldve
          ? 'Meghívó e-mail elküldve. A partner a linken állíthatja be a jelszavát.'
          : `Meghívó rögzítve. E-mail nem ment ki${emailHiba ? `: ${emailHiba}` : ''}. Másold ki a linket és küldd el manuálisan.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Meghívó küldése sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/partner-meghivo',
};
