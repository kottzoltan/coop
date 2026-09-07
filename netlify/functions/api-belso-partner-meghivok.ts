import type { Config } from '@netlify/functions';
import { requireBelso } from './lib/auth.js';
import {
  partnerMeghivoLinkById,
  partnerMeghivoLista,
  partnerMeghivoVisszavonas,
} from './lib/partner-meghivo.js';
import {
  partnerMeghivoSablonLekerdezes,
  partnerMeghivoSablonMentes,
  SABLON_HELYORZOK,
  type PartnerMeghivoSablon,
} from './lib/coop-beallitas.js';
import { envGet } from './lib/netlify-env.js';

export default async (req: Request) => {
  const url = new URL(req.url);
  const nezet = url.searchParams.get('nezet');

  if (req.method === 'GET') {
    const auth = await requireBelso('partnerek', 'olvasas');
    if (auth instanceof Response) return auth;

    if (nezet === 'sablon') {
      const sablon = await partnerMeghivoSablonLekerdezes();
      return Response.json({
        sablon,
        helyorzok: SABLON_HELYORZOK,
        email_szolgaltato: envGet('RESEND_API_KEY')
          ? 'resend'
          : envGet('SENDGRID_API_KEY')
            ? 'sendgrid'
            : 'identity_fallback',
      });
    }

    const statusz = url.searchParams.get('statusz') ?? 'mind';
    const sorok = await partnerMeghivoLista(statusz);
    return Response.json({ sorok, count: sorok.length });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('partnerek', 'iras');
    if (auth instanceof Response) return auth;

    let body: {
      id?: number;
      statusz?: 'visszavonva';
      sablon?: PartnerMeghivoSablon;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (body.sablon) {
      try {
        const mentett = await partnerMeghivoSablonMentes(body.sablon);
        return Response.json({ ok: true, sablon: mentett });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sablon mentése sikertelen';
        return Response.json({ hiba: msg }, { status: 400 });
      }
    }

    if (body.id && body.statusz === 'visszavonva') {
      const sor = await partnerMeghivoVisszavonas(body.id);
      if (!sor) {
        return Response.json({ hiba: 'Csak küldött meghívó vonható vissza' }, { status: 404 });
      }
      return Response.json({ ok: true, sor });
    }

    return Response.json({ hiba: 'Ismeretlen művelet' }, { status: 400 });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('partnerek', 'olvasas');
    if (auth instanceof Response) return auth;

    let body: { id?: number };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.id) {
      return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });
    }

    const link = await partnerMeghivoLinkById(body.id);
    if (!link) {
      return Response.json({ hiba: 'Nem található' }, { status: 404 });
    }
    return Response.json({ ok: true, link });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/belso-partner-meghivok',
};
