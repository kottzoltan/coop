import type { Config } from '@netlify/functions';
import { requireBelso } from './lib/auth.js';
import { db } from '../../db/index.js';
import { szjaKedvezmenyNyilatkozat, szovetkezetiTag } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import {
  getSzjaKedvezmenyMonthlyLimitPreview,
  listSzjaKedvezmenyek,
  rowToSzjaKedvezmeny,
  syncSzjaKedvezmenyekFromUi,
} from './lib/ber/szja-kedvezmeny-service.js';
import { normalizaltSzjaKedvezmenyek, type SzjaKedvezmeny } from '../../shared/src/tag.js';
import { tagValaszEnriched } from './lib/ber/tag-enrich.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('tagok', 'olvasas');
    if (auth instanceof Response) return auth;

    const tagId = Number(url.searchParams.get('tag_id'));
    const nezet = url.searchParams.get('nezet');
    const payrollPeriod = url.searchParams.get('payroll_period') ?? undefined;

    if (nezet === 'lista') {
      const sorok = await db
        .select({
          kedv: szjaKedvezmenyNyilatkozat,
          tagNev: szovetkezetiTag.nev,
        })
        .from(szjaKedvezmenyNyilatkozat)
        .innerJoin(szovetkezetiTag, eq(szjaKedvezmenyNyilatkozat.tagId, szovetkezetiTag.id))
        .where(eq(szjaKedvezmenyNyilatkozat.status, 'AKTIV'))
        .orderBy(desc(szjaKedvezmenyNyilatkozat.updatedAt))
        .limit(200);

      return Response.json({
        sorok: sorok.map(({ kedv, tagNev }) => ({
          ...rowToSzjaKedvezmeny(kedv),
          tag_id: kedv.tagId,
          tag_nev: tagNev,
        })),
        count: sorok.length,
      });
    }

    if (!tagId) return Response.json({ hiba: 'tag_id kötelező' }, { status: 400 });

    const kedvezmenyek = await listSzjaKedvezmenyek(tagId);
    const preview = payrollPeriod
      ? await getSzjaKedvezmenyMonthlyLimitPreview(tagId, payrollPeriod)
      : [];

    return Response.json({ kedvezmenyek, preview, count: kedvezmenyek.length });
  }

  if (req.method === 'PUT') {
    const auth = await requireBelso('tagok', 'iras');
    if (auth instanceof Response) return auth;

    const body = (await req.json().catch(() => ({}))) as {
      tag_id?: number;
      kedvezmenyek?: SzjaKedvezmeny[];
    };

    const tagId = Number(body.tag_id);
    if (!tagId || !Array.isArray(body.kedvezmenyek)) {
      return Response.json({ hiba: 'tag_id és kedvezmenyek kötelező.' }, { status: 400 });
    }

    const normal = normalizaltSzjaKedvezmenyek(body.kedvezmenyek);
    await syncSzjaKedvezmenyekFromUi(tagId, normal);

    await db
      .update(szovetkezetiTag)
      .set({ szjaKedvezmenyek: normal as unknown as Record<string, unknown>[] })
      .where(eq(szovetkezetiTag.id, tagId));

    const [row] = await db.select().from(szovetkezetiTag).where(eq(szovetkezetiTag.id, tagId));
    if (!row) return Response.json({ hiba: 'Tag nem található.' }, { status: 404 });

    return Response.json({ ok: true, tag: await tagValaszEnriched(row) });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/tag-szja-kedvezmenyek',
};
