import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { eAlairasKerelem, szovetkezetiTag } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('tagok', 'olvasas');
    if (auth instanceof Response) return auth;

    const sorok = await db
      .select({
        kerelem: eAlairasKerelem,
        tag_nev: szovetkezetiTag.nev,
      })
      .from(eAlairasKerelem)
      .leftJoin(szovetkezetiTag, eq(eAlairasKerelem.tagId, szovetkezetiTag.id))
      .orderBy(desc(eAlairasKerelem.letrehozva))
      .limit(100);

    return Response.json({
      sorok: sorok.map((r) => ({
        ...r.kerelem,
        tag_id: r.kerelem.tagId,
        diak_regisztracio_id: r.kerelem.diakRegisztracioId,
        jelentkezes_id: r.kerelem.jelentkezesId,
        projekt_id: r.kerelem.projektId,
        szerzodes_tipus: r.kerelem.szerzodesTipus,
        dokumentum_nev: r.kerelem.dokumentumNev,
        blob_key: r.kerelem.blobKey,
        microsec_idobelyeg: r.kerelem.microsecIdobelyeg,
        alairva_at: r.kerelem.alairvaAt?.toISOString() ?? null,
        email_kuldve_at: r.kerelem.emailKuldveAt?.toISOString() ?? null,
        tag_nev: r.tag_nev,
        letrehozva: r.kerelem.letrehozva.toISOString(),
      })),
      count: sorok.length,
    });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('tagok', 'iras');
    if (auth instanceof Response) return auth;

    let body: { tag_id?: number; dokumentum_nev: string; blob_key?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.dokumentum_nev?.trim()) {
      return Response.json({ hiba: 'Dokumentum név kötelező' }, { status: 400 });
    }

    const [sor] = await db
      .insert(eAlairasKerelem)
      .values({
        tagId: body.tag_id ?? null,
        dokumentumNev: body.dokumentum_nev.trim(),
        blobKey: body.blob_key?.trim() || null,
        statusz: 'függőben',
      })
      .returning();

    return Response.json({ ok: true, sor }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('tagok', 'iras');
    if (auth instanceof Response) return auth;

    let body: { id: number; statusz?: string; megjegyzes?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });

    const patch: Partial<typeof eAlairasKerelem.$inferInsert> = {};
    if (body.statusz) patch.statusz = body.statusz;
    if (body.megjegyzes !== undefined) patch.megjegyzes = body.megjegyzes?.trim() || null;

    const [sor] = await db
      .update(eAlairasKerelem)
      .set(patch)
      .where(eq(eAlairasKerelem.id, body.id))
      .returning();

    if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });
    return Response.json({ ok: true, sor });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/ealairas',
};
