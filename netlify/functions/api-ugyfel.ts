import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { ugyTicket } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('erdeklodok', 'olvasas');
    if (auth instanceof Response) return auth;

    const statusz = url.searchParams.get('statusz');
    const feltetelek = statusz ? eq(ugyTicket.statusz, statusz) : undefined;
    const sorok = await db
      .select()
      .from(ugyTicket)
      .where(feltetelek)
      .orderBy(desc(ugyTicket.letrehozva))
      .limit(200);

    const nyitott = sorok.filter((s) => s.statusz === 'nyitott' || s.statusz === 'folyamatban').length;
    return Response.json({ sorok, count: sorok.length, nyitott });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('erdeklodok', 'iras');
    if (auth instanceof Response) return auth;

    let body: {
      targy: string;
      leiras?: string;
      prioritas?: string;
      kapcsolat_nev?: string;
      kapcsolat_email?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.targy?.trim()) return Response.json({ hiba: 'Tárgy kötelező' }, { status: 400 });

    const [sor] = await db
      .insert(ugyTicket)
      .values({
        targy: body.targy.trim(),
        leiras: body.leiras?.trim() || null,
        prioritas: body.prioritas?.trim() || 'normál',
        kapcsolatNev: body.kapcsolat_nev?.trim() || null,
        kapcsolatEmail: body.kapcsolat_email?.trim() || null,
        hozzarendelt: auth.email,
      })
      .returning();

    return Response.json({ ok: true, sor }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('erdeklodok', 'iras');
    if (auth instanceof Response) return auth;

    let body: { id: number; statusz?: string; hozzarendelt?: string; leiras?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });

    const patch: Partial<typeof ugyTicket.$inferInsert> = {};
    if (body.statusz) patch.statusz = body.statusz;
    if (body.hozzarendelt) patch.hozzarendelt = body.hozzarendelt;
    if (body.leiras !== undefined) patch.leiras = body.leiras?.trim() || null;

    const [sor] = await db
      .update(ugyTicket)
      .set(patch)
      .where(eq(ugyTicket.id, body.id))
      .returning();

    if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });
    return Response.json({ ok: true, sor });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/ugyfel',
};
