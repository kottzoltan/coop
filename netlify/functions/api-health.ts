import type { Config } from '@netlify/functions';
import { schemaHealth } from './lib/schema-health.js';

export default async (req: Request) => {
  const url = new URL(req.url);
  const schema = url.searchParams.get('schema') === '1';

  const payload: Record<string, unknown> = {
    status: 'ok',
    nev: 'ICE API',
    verzio: '0.2.0',
    adatbazis: 'netlify-database',
    migraciok_ajanlott: '0013–0019 (deploy automatikusan alkalmazza)',
  };

  if (schema) {
    const s = await schemaHealth();
    payload.schema = s;
    payload.status = s.hianyzo.length ? 'figyelmeztetes' : 'ok';
    if (s.hianyzo.length) {
      payload.uzenet = `Hiányzó sémaelemek: ${s.hianyzo.join(', ')}`;
    }
  }

  return Response.json(payload);
};

export const config: Config = {
  path: '/api/health',
};
