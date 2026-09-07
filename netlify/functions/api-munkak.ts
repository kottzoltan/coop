import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { munkaHirdetes, munkaJelentkezes, projekt } from '../../db/schema.js';
import { desc, eq, and, ilike, or, sql } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import { hirdetesProjektEllenorzes } from './lib/projekt-kotes.js';
import {
  assertProjektHozzaferes,
  belsoLathatoProjektIds,
  projektIdSzuro,
} from './lib/projekt-scope.js';

type HirdetesBody = Record<string, unknown>;

function str(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return fallback;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const idParam = url.searchParams.get('id');
    const belso = url.searchParams.get('belso') === '1';

    let belsoAuth = null;
    if (belso) {
      const auth = await requireBelso('toborzas', 'olvasas');
      if (auth instanceof Response) return auth;
      belsoAuth = auth;
    }

    if (idParam) {
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        return Response.json({ hiba: 'Érvénytelen azonosító' }, { status: 400 });
      }

      const feltetelek = [eq(munkaHirdetes.id, id)];
      if (!belso) feltetelek.push(eq(munkaHirdetes.aktiv, true));

      const [sor] = await db
        .select()
        .from(munkaHirdetes)
        .where(and(...feltetelek));

      if (!sor) {
        return Response.json({ hiba: 'A munka nem található' }, { status: 404 });
      }

      if (belsoAuth) {
        const tiltas = await assertProjektHozzaferes(belsoAuth, sor.projekt_id);
        if (tiltas) return tiltas;
      }

      if (!belso) {
        await db
          .update(munkaHirdetes)
          .set({ megtekintesek: sql`COALESCE(${munkaHirdetes.megtekintesek}, 0) + 1` })
          .where(eq(munkaHirdetes.id, id));
      }

      const [jelentkezok] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(munkaJelentkezes)
        .where(eq(munkaJelentkezes.hirdetes_id, id));

      let projektSor = null;
      if (sor.projekt_id) {
        [projektSor] = await db
          .select()
          .from(projekt)
          .where(eq(projekt.id, sor.projekt_id));
      }

      return Response.json({
        sor: { ...sor, jelentkezok: jelentkezok?.count ?? 0 },
        projekt: projektSor,
      });
    }

    const keres = url.searchParams.get('keres') ?? '';
    const varos = url.searchParams.get('varos') ?? '';
    const munkakor = url.searchParams.get('munkakor') ?? '';
    const rendezes = url.searchParams.get('rendezes') ?? 'uj';
    const projektId = url.searchParams.get('projekt_id');

    const feltetelek = [];
    if (!belso) feltetelek.push(eq(munkaHirdetes.aktiv, true));
    if (projektId) feltetelek.push(eq(munkaHirdetes.projekt_id, Number(projektId)));
    if (varos) feltetelek.push(ilike(munkaHirdetes.varos, `%${varos}%`));
    if (munkakor) feltetelek.push(ilike(munkaHirdetes.munkakor, `%${munkakor}%`));
    if (keres) {
      feltetelek.push(
        or(
          ilike(munkaHirdetes.cim, `%${keres}%`),
          ilike(munkaHirdetes.munkakor, `%${keres}%`),
          ilike(munkaHirdetes.varos, `%${keres}%`),
        )!,
      );
    }

    if (belsoAuth) {
      const lathato = await belsoLathatoProjektIds(belsoAuth);
      const szuro = projektIdSzuro(lathato, munkaHirdetes.projekt_id);
      if (szuro) feltetelek.push(szuro);
    }

    const where = feltetelek.length ? and(...feltetelek) : undefined;

    const sorok = await db
      .select({
        hirdetes: munkaHirdetes,
        jelentkezok: sql<number>`(
          SELECT count(*)::int FROM munka_jelentkezes j
          WHERE j.hirdetes_id = ${munkaHirdetes.id}
        )`,
        projekt_azonosito: projekt.azonosito,
      })
      .from(munkaHirdetes)
      .leftJoin(projekt, eq(munkaHirdetes.projekt_id, projekt.id))
      .where(where)
      .orderBy(
        rendezes === 'ber' ? desc(munkaHirdetes.ber) : desc(munkaHirdetes.letrehozva),
      );

    return Response.json({
      sorok: sorok.map((r) => ({
        ...r.hirdetes,
        jelentkezok: r.jelentkezok,
        projekt_azonosito: r.projekt_azonosito,
      })),
      count: sorok.length,
    });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('toborzas', 'iras');
    if (auth instanceof Response) return auth;

    let body: HirdetesBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const cim = str(body.cim);
    const varos = str(body.varos);
    if (!cim || !varos) {
      return Response.json({ hiba: 'Cím és város kötelező' }, { status: 400 });
    }

    const ellenorzes = await hirdetesProjektEllenorzes(
      body.projekt_id ? num(body.projekt_id) : null,
      str(body.felelos),
      str(body.kifizetesi_kod),
    );
    if (ellenorzes) return Response.json({ hiba: ellenorzes }, { status: 400 });

    if (body.projekt_id) {
      const tiltas = await assertProjektHozzaferes(auth, num(body.projekt_id));
      if (tiltas) return tiltas;
    }

    const [sor] = await db
      .insert(munkaHirdetes)
      .values({
        projekt_id: body.projekt_id ? num(body.projekt_id) : null,
        cim,
        munkakor: str(body.munkakor) || 'Adminisztratív, irodai',
        partner: str(body.partner),
        varos,
        varmegye: str(body.varmegye),
        ber: num(body.ber, 2000),
        munkanapok: str(body.munkanapok) || 'H,K,Sz,Cs,P',
        munkaido: str(body.munkaido),
        cimkek: str(body.cimkek),
        leiras: str(body.leiras),
        nyelv: str(body.nyelv) || 'HU',
        toborzo: str(body.toborzo),
        felelos: str(body.felelos),
        kifizetesi_kod: str(body.kifizetesi_kod),
        berezes: str(body.berezes) || 'Alapbér',
        egyeni_ber: str(body.egyeni_ber),
        eloszo_torzs: str(body.eloszo_torzs) || cim,
        fobb_feladatok: str(body.fobb_feladatok) || cim,
        aktiv: body.aktiv !== undefined ? bool(body.aktiv, true) : true,
      })
      .returning();

    return Response.json({ ok: true, sor }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('toborzas', 'iras');
    if (auth instanceof Response) return auth;

    let body: HirdetesBody & { id?: number; muvelet?: string; ids?: number[]; akcio?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (body.muvelet === 'tomeges' && Array.isArray(body.ids) && body.akcio) {
      const ids = body.ids.map((x) => Number(x)).filter((n) => n > 0);
      if (!ids.length) return Response.json({ hiba: 'Üres lista' }, { status: 400 });

      let frissitve = 0;
      for (const hid of ids) {
        const [meglevo] = await db.select().from(munkaHirdetes).where(eq(munkaHirdetes.id, hid));
        if (!meglevo) continue;

        if (body.akcio === 'aktiv') {
          await db.update(munkaHirdetes).set({ aktiv: true }).where(eq(munkaHirdetes.id, hid));
          frissitve++;
        } else if (body.akcio === 'inaktiv') {
          await db.update(munkaHirdetes).set({ aktiv: false }).where(eq(munkaHirdetes.id, hid));
          frissitve++;
        } else if (body.akcio === 'erv_plus_14') {
          const base = meglevo.erv_datum ? new Date(String(meglevo.erv_datum)) : new Date();
          base.setDate(base.getDate() + 14);
          const erv = base.toISOString().slice(0, 10);
          await db.update(munkaHirdetes).set({ erv_datum: erv }).where(eq(munkaHirdetes.id, hid));
          frissitve++;
        } else if (body.akcio === 'torol') {
          await db.update(munkaHirdetes).set({ aktiv: false }).where(eq(munkaHirdetes.id, hid));
          frissitve++;
        }
      }
      return Response.json({ ok: true, frissitve });
    }

    const id = num(body.id);
    if (!id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });

    const patch: Record<string, unknown> = {};
    const fields = [
      'projekt_id', 'cim', 'munkakor', 'partner', 'varos', 'varmegye', 'ber',
      'munkanapok', 'munkaido', 'cimkek', 'leiras', 'nyelv', 'toborzo', 'felelos',
      'kifizetesi_kod', 'berezes', 'egyeni_ber', 'extra_varos', 'extra_varmegye',
      'munkaido_leiras', 'min_korhatar', 'erv_datum', 'megjegyzes', 'nem_ertem_el',
      'munkavegzes_helye', 'munkavegzes_idopontja', 'berezes_szoveg', 'befejezo_szoveg',
      'eloszo_fejlec', 'eloszo_torzs', 'eloszo_lablec', 'amit_kinalunk', 'fobb_feladatok',
      'elvarasok', 'elonyt_jelent', 'kep_nev', 'kep_focim', 'kep_alcim', 'kep_alcim_szin',
    ] as const;

    for (const f of fields) {
      if (body[f] !== undefined) {
        if (f === 'projekt_id' || f === 'ber' || f === 'min_korhatar') {
          patch[f] = num(body[f]);
        } else {
          patch[f] = str(body[f]);
        }
      }
    }

    if (body.aktiv !== undefined) patch.aktiv = bool(body.aktiv);
    if (body.szoveges_munkaido !== undefined) patch.szoveges_munkaido = bool(body.szoveges_munkaido);
    if (body.oneletrajz !== undefined) patch.oneletrajz = bool(body.oneletrajz);
    if (body.telefonszam !== undefined) patch.telefonszam = bool(body.telefonszam);

    const [meglevo] = await db.select().from(munkaHirdetes).where(eq(munkaHirdetes.id, id));
    if (!meglevo) return Response.json({ hiba: 'Nem található' }, { status: 404 });

    const ujProjektId =
      patch.projekt_id !== undefined ? Number(patch.projekt_id) : meglevo.projekt_id;
    const ujFelelos =
      patch.felelos !== undefined ? (patch.felelos as string | null) : meglevo.felelos;
    const ujKod =
      patch.kifizetesi_kod !== undefined
        ? (patch.kifizetesi_kod as string | null)
        : meglevo.kifizetesi_kod;

    const ellenorzes = await hirdetesProjektEllenorzes(ujProjektId, ujFelelos, ujKod);
    if (ellenorzes) return Response.json({ hiba: ellenorzes }, { status: 400 });

    const [sor] = await db
      .update(munkaHirdetes)
      .set(patch)
      .where(eq(munkaHirdetes.id, id))
      .returning();

    if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });
    return Response.json({ ok: true, sor });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/munkak',
};
