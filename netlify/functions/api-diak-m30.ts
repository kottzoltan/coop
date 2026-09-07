import type { Config } from '@netlify/functions';
import { getIceAuth } from './lib/auth.js';
import { db } from '../../db/index.js';
import { szovetkezetiTag } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getM30ForDiakTag } from './lib/ber/nav/m30-generator.js';
import { downloadBevallasExport } from './lib/ber/nav/nav-08-generator.js';

export default async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const auth = await getIceAuth();
  if (!auth || auth.szerep !== 'diak' || !auth.diakId) {
    return Response.json({ hiba: 'Bejelentkezés szükséges.' }, { status: 401 });
  }

  const url = new URL(req.url);
  const taxYear = Number(url.searchParams.get('tax_year') ?? new Date().getFullYear());
  const exportId = url.searchParams.get('export_id');
  const bevallasId = url.searchParams.get('bevallas_id');

  const [tag] = await db
    .select()
    .from(szovetkezetiTag)
    .where(eq(szovetkezetiTag.diakRegisztracioId, auth.diakId));

  if (!tag) return Response.json({ hiba: 'Nincs szövetkezeti tagság.' }, { status: 404 });

  if (bevallasId && exportId) {
    const m30 = await getM30ForDiakTag(tag.id, taxYear);
    if (!m30 || m30.bevallas_id !== Number(bevallasId) || m30.export_id !== Number(exportId)) {
      return Response.json({ hiba: 'Nincs jogosultság ehhez a fájlhoz.' }, { status: 403 });
    }
    const file = await downloadBevallasExport(Number(bevallasId), Number(exportId));
    if (!file) return Response.json({ hiba: 'Fájl nem található.' }, { status: 404 });
    return new Response(file.body, {
      headers: {
        'Content-Type': file.mime,
        'Content-Disposition': `attachment; filename="${file.fileName}"`,
      },
    });
  }

  const m30 = await getM30ForDiakTag(tag.id, taxYear);
  return Response.json({
    tax_year: taxYear,
    elerheto: !!m30,
    m30,
  });
};

export const config: Config = {
  path: '/api/diak-m30',
};
