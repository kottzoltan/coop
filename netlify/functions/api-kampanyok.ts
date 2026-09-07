import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { kampany, kampanyResztvevo, munkaHirdetes } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';

const KAMPANY_STATUSZOK = ['aktív', 'lezárt', 'piszkozat'] as const;
const RESZTVEVO_STATUSZOK = ['aktív', 'kilépett', 'jelölt'] as const;

function datumStr(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

function kampanyValasz(row: typeof kampany.$inferSelect) {
  return {
    id: row.id,
    nev: row.nev,
    leiras: row.leiras,
    statusz: row.statusz,
    kezdet: datumStr(row.kezdet),
    vege: datumStr(row.vege),
    hirdetes_id: row.hirdetesId,
    letrehozva: row.letrehozva.toISOString(),
  };
}

function resztvevoValasz(row: typeof kampanyResztvevo.$inferSelect) {
  return {
    id: row.id,
    kampany_id: row.kampanyId,
    nev: row.nev,
    email: row.email,
    telefon: row.telefon,
    regisztracio_id: row.regisztracioId,
    tag_id: row.tagId,
    jelentkezes_id: row.jelentkezesId,
    statusz: row.statusz,
    letrehozva: row.letrehozva.toISOString(),
  };
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const nezet = url.searchParams.get('nezet') ?? 'kampanyok';

  if (req.method === 'GET') {
    const auth = await requireBelso('toborzas', 'olvasas');
    if (auth instanceof Response) return auth;

    if (nezet === 'resztvevok') {
      const kampanyId = url.searchParams.get('kampany_id');
      const feltetel = kampanyId ? eq(kampanyResztvevo.kampanyId, Number(kampanyId)) : undefined;
      const sorok = await db
        .select()
        .from(kampanyResztvevo)
        .where(feltetel)
        .orderBy(desc(kampanyResztvevo.letrehozva))
        .limit(300);
      return Response.json({
        sorok: sorok.map(resztvevoValasz),
        count: sorok.length,
        statuszok: RESZTVEVO_STATUSZOK,
      });
    }

    const id = url.searchParams.get('id');
    if (id) {
      const [k] = await db.select().from(kampany).where(eq(kampany.id, Number(id)));
      if (!k) return Response.json({ hiba: 'Kampány nem található' }, { status: 404 });
      const resztvevok = await db
        .select()
        .from(kampanyResztvevo)
        .where(eq(kampanyResztvevo.kampanyId, k.id))
        .orderBy(desc(kampanyResztvevo.letrehozva));
      let hirdetes_cim: string | null = null;
      if (k.hirdetesId) {
        const [h] = await db
          .select({ cim: munkaHirdetes.cim })
          .from(munkaHirdetes)
          .where(eq(munkaHirdetes.id, k.hirdetesId));
        hirdetes_cim = h?.cim ?? null;
      }
      return Response.json({
        kampany: { ...kampanyValasz(k), hirdetes_cim },
        resztvevok: resztvevok.map(resztvevoValasz),
      });
    }

    const sorok = await db.select().from(kampany).orderBy(desc(kampany.letrehozva)).limit(100);
    return Response.json({
      sorok: sorok.map(kampanyValasz),
      count: sorok.length,
      statuszok: KAMPANY_STATUSZOK,
    });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('toborzas', 'iras');
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (body.muvelet === 'resztvevo') {
      const kampanyId = Number(body.kampany_id);
      const nev = typeof body.nev === 'string' ? body.nev.trim() : '';
      if (!kampanyId || !nev) {
        return Response.json({ hiba: 'kampany_id és nev kötelező' }, { status: 400 });
      }
      const [sor] = await db
        .insert(kampanyResztvevo)
        .values({
          kampanyId,
          nev,
          email: typeof body.email === 'string' ? body.email.trim() : null,
          telefon: typeof body.telefon === 'string' ? body.telefon.trim() : null,
          regisztracioId: body.regisztracio_id ? Number(body.regisztracio_id) : null,
          tagId: body.tag_id ? Number(body.tag_id) : null,
          jelentkezesId: body.jelentkezes_id ? Number(body.jelentkezes_id) : null,
          statusz: typeof body.statusz === 'string' ? body.statusz : 'aktív',
        })
        .returning();
      return Response.json({ ok: true, resztvevo: resztvevoValasz(sor) }, { status: 201 });
    }

    const nev = typeof body.nev === 'string' ? body.nev.trim() : '';
    if (!nev) return Response.json({ hiba: 'Név kötelező' }, { status: 400 });

    const [sor] = await db
      .insert(kampany)
      .values({
        nev,
        leiras: typeof body.leiras === 'string' ? body.leiras.trim() : null,
        statusz: typeof body.statusz === 'string' ? body.statusz : 'aktív',
        kezdet: typeof body.kezdet === 'string' ? body.kezdet : null,
        vege: typeof body.vege === 'string' ? body.vege : null,
        hirdetesId: body.hirdetes_id ? Number(body.hirdetes_id) : null,
      })
      .returning();

    return Response.json({ ok: true, kampany: kampanyValasz(sor) }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('toborzas', 'iras');
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (body.muvelet === 'resztvevo') {
      const id = Number(body.id);
      if (!id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });
      const patch: Partial<typeof kampanyResztvevo.$inferInsert> = {};
      if (typeof body.nev === 'string') patch.nev = body.nev.trim();
      if (typeof body.email === 'string') patch.email = body.email.trim() || null;
      if (typeof body.telefon === 'string') patch.telefon = body.telefon.trim() || null;
      if (typeof body.statusz === 'string') patch.statusz = body.statusz;
      const [sor] = await db
        .update(kampanyResztvevo)
        .set(patch)
        .where(eq(kampanyResztvevo.id, id))
        .returning();
      if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });
      return Response.json({ ok: true, resztvevo: resztvevoValasz(sor) });
    }

    const id = Number(body.id);
    if (!id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });
    const patch: Partial<typeof kampany.$inferInsert> = {};
    if (typeof body.nev === 'string') patch.nev = body.nev.trim();
    if (typeof body.leiras === 'string') patch.leiras = body.leiras.trim() || null;
    if (typeof body.statusz === 'string') patch.statusz = body.statusz;
    if (typeof body.kezdet === 'string') patch.kezdet = body.kezdet || null;
    if (typeof body.vege === 'string') patch.vege = body.vege || null;
    if (body.hirdetes_id !== undefined) {
      patch.hirdetesId = body.hirdetes_id ? Number(body.hirdetes_id) : null;
    }

    const [sor] = await db.update(kampany).set(patch).where(eq(kampany.id, id)).returning();
    if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });
    return Response.json({ ok: true, kampany: kampanyValasz(sor) });
  }

  if (req.method === 'DELETE') {
    const auth = await requireBelso('toborzas', 'iras');
    if (auth instanceof Response) return auth;

    const id = Number(url.searchParams.get('id'));
    const resztvevo = url.searchParams.get('resztvevo') === '1';
    if (!id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });

    if (resztvevo) {
      await db.delete(kampanyResztvevo).where(eq(kampanyResztvevo.id, id));
    } else {
      await db.delete(kampanyResztvevo).where(eq(kampanyResztvevo.kampanyId, id));
      await db.delete(kampany).where(eq(kampany.id, id));
    }
    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/kampanyok',
};
