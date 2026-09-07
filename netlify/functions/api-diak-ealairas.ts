import type { Config } from '@netlify/functions';
import { getIceAuth } from './lib/auth.js';
import {
  diakAlairasVegrehajtas,
  diakFuggobenAlairasok,
  diakOsszesAlairas,
} from './lib/diak-szerzodes-alairas.js';

export default async (req: Request) => {
  const auth = await getIceAuth();
  if (!auth || auth.szerep !== 'diak' || !auth.diakId) {
    return Response.json({ hiba: 'Bejelentkezés szükséges.' }, { status: 401 });
  }

  const diakId = auth.diakId;
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const osszes = url.searchParams.get('osszes') === '1';
    const sorok = osszes ? await diakOsszesAlairas(diakId) : await diakFuggobenAlairasok(diakId);
    return Response.json({
      sorok,
      fuggoben: sorok.filter((s) => s.statusz === 'függőben').length,
      count: sorok.length,
    });
  }

  if (req.method === 'POST') {
    let body: { id: number };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body?.id) {
      return Response.json({ hiba: 'Hiányzó kérelem azonosító' }, { status: 400 });
    }

    try {
      const sor = await diakAlairasVegrehajtas(body.id, diakId);
      return Response.json({ ok: true, sor });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Aláírás sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/diak-ealairas',
};
