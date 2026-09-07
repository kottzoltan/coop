import type { Config } from '@netlify/functions';
import { requireBelso } from './lib/auth.js';
import {
  szerzodesSablonFeltolt,
  szerzodesSablonokListaz,
} from './lib/szerzodes-sablon.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('tagok', 'olvasas');
    if (auth instanceof Response) return auth;

    const projektId = url.searchParams.get('projekt_id');
    const sablonok = await szerzodesSablonokListaz(
      projektId ? Number(projektId) : undefined,
    );
    return Response.json({ sablonok });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('tagok', 'iras');
    if (auth instanceof Response) return auth;

    let body: {
      tipus: 'keretszerzodes' | 'eseti_alap' | 'eseti_projekt';
      fajlnev: string;
      tartalom_base64: string;
      content_type?: string;
      projekt_id?: number;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.tipus || !body.fajlnev || !body.tartalom_base64) {
      return Response.json({ hiba: 'tipus, fajlnev és tartalom_base64 kötelező' }, { status: 400 });
    }

    try {
      const sablon = await szerzodesSablonFeltolt({
        tipus: body.tipus,
        fajlnev: body.fajlnev,
        tartalom_base64: body.tartalom_base64,
        content_type: body.content_type,
        projekt_id: body.projekt_id ? Number(body.projekt_id) : undefined,
        feltolto: auth.email,
      });
      return Response.json({ ok: true, sablon }, { status: 201 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Feltöltés sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/szerzodes-sablonok',
};
