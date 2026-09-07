import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { penzugySzamla, munkalap, projekt } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('penzugy', 'olvasas');
    if (auth instanceof Response) return auth;

    const statusz = url.searchParams.get('statusz');
    const sorok = await db
      .select({
        szamla: penzugySzamla,
        projekt_azonosito: projekt.azonosito,
        projekt_nev: projekt.nev,
      })
      .from(penzugySzamla)
      .innerJoin(projekt, eq(penzugySzamla.projektId, projekt.id))
      .where(statusz ? eq(penzugySzamla.statusz, statusz) : undefined)
      .orderBy(desc(penzugySzamla.letrehozva))
      .limit(200);

    const folyoszamla = await db
      .select({ count: munkalap.id })
      .from(munkalap)
      .where(eq(munkalap.statusz, 'Számfejtett'));

    return Response.json({
      sorok: sorok.map((r) => ({
        id: r.szamla.id,
        munkalap_id: r.szamla.munkalapId,
        projekt_id: r.szamla.projektId,
        munkalap_azonosito: r.szamla.munkalapAzonosito,
        osszeg: r.szamla.osszeg,
        statusz: r.szamla.statusz,
        megjegyzes: r.szamla.megjegyzes,
        letrehozva: r.szamla.letrehozva.toISOString(),
        projekt_azonosito: r.projekt_azonosito,
        projekt_nev: r.projekt_nev,
      })),
      count: sorok.length,
      folyoszamla_db: folyoszamla.length,
    });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('penzugy', 'iras');
    if (auth instanceof Response) return auth;

    let body: { id: number; statusz?: string; megjegyzes?: string | null };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });

    const patch: Partial<typeof penzugySzamla.$inferInsert> = {};
    if (body.statusz) patch.statusz = body.statusz;
    if (body.megjegyzes !== undefined) patch.megjegyzes = body.megjegyzes?.trim() || null;

    const [friss] = await db
      .update(penzugySzamla)
      .set(patch)
      .where(eq(penzugySzamla.id, body.id))
      .returning();

    if (!friss) return Response.json({ hiba: 'Nem található' }, { status: 404 });
    return Response.json({ ok: true, szamla: friss });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/penzugy',
};
