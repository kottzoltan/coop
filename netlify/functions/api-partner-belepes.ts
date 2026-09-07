import type { Config } from '@netlify/functions';
import { partnerBelepesElokeszites } from './lib/partner-meghivo.js';

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) {
    return Response.json({ hiba: 'E-mail és jelszó kötelező.' }, { status: 400 });
  }

  try {
    const eredmeny = await partnerBelepesElokeszites(email, password);
    return Response.json({ ok: true, ...eredmeny });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Belépés előkészítése sikertelen';
    const hu =
      msg.toLowerCase().includes('user not found')
        ? 'A belépési fiók szinkronizálása sikertelen. Próbáld újra, vagy kérj segítséget a Coop-tól.'
        : msg;
    return Response.json({ hiba: hu }, { status: 400 });
  }
};

export const config: Config = {
  path: '/api/partner-belepes',
};
