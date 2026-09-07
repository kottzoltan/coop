import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { blogBejegyzes } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('toborzas', 'olvasas');
    if (auth instanceof Response) return auth;

    const id = url.searchParams.get('id');
    if (id) {
      const [sor] = await db.select().from(blogBejegyzes).where(eq(blogBejegyzes.id, Number(id)));
      if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });
      return Response.json({ sor });
    }

    const sorok = await db.select().from(blogBejegyzes).orderBy(desc(blogBejegyzes.letrehozva)).limit(100);
    return Response.json({ sorok, count: sorok.length });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('toborzas', 'iras');
    if (auth instanceof Response) return auth;

    let body: { cim: string; tartalom?: string; szerzo?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.cim?.trim()) return Response.json({ hiba: 'Cím kötelező' }, { status: 400 });

    const [sor] = await db
      .insert(blogBejegyzes)
      .values({
        cim: body.cim.trim(),
        tartalom: body.tartalom?.trim() || null,
        szerzo: body.szerzo?.trim() || auth.email,
        statusz: 'piszkozat',
      })
      .returning();

    return Response.json({ ok: true, sor }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('toborzas', 'iras');
    if (auth instanceof Response) return auth;

    let body: { id: number; cim?: string; tartalom?: string; statusz?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });

    const patch: Partial<typeof blogBejegyzes.$inferInsert> = {};
    if (body.cim) patch.cim = body.cim.trim();
    if (body.tartalom !== undefined) patch.tartalom = body.tartalom?.trim() || null;
    if (body.statusz) {
      patch.statusz = body.statusz;
      if (body.statusz === 'publikált') patch.publikalva = new Date();
    }

    const [sor] = await db
      .update(blogBejegyzes)
      .set(patch)
      .where(eq(blogBejegyzes.id, body.id))
      .returning();

    if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });
    return Response.json({ ok: true, sor });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/blog',
};
