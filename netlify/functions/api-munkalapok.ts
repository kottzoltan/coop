import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { munkalap, projekt, szovetkezetiTag, jelenlet, beosztas, muszak, diakRegisztracio } from '../../db/schema.js';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import { kovetkezoMunkalapAzonosito, kovetkezoKorrekcioAzonosito, munkalapValasz } from './lib/munkalap-map.js';
import { munkalapControlling, munkalapSzerkesztheto, type MunkalapDiak } from '../../shared/src/munkalap.js';
import type { MunkalapStatusz } from '../../shared/src/enums.js';
import {
  szamfejtesiBerekBerKodLista,
} from '../../shared/src/projekt-demo-meta.js';
import { mergeProjektMeta } from './lib/projekt-meta.js';
import {
  munkalapDiakokEllenorzes,
  teljesitesFrissitesMunkalapbol,
} from './lib/projekt-kotes.js';
import {
  assertProjektHozzaferes,
  belsoLathatoProjektIds,
  projektIdSzuro,
} from './lib/projekt-scope.js';

async function tagNevekMap(): Promise<Map<number, string>> {
  const tagok = await db.select({ id: szovetkezetiTag.id, nev: szovetkezetiTag.nev }).from(szovetkezetiTag);
  return new Map(tagok.map((t) => [t.id, t.nev]));
}

async function tagMetaMap(ids: number[]): Promise<Map<number, import('../../shared/src/munkalap.js').MunkalapTagMeta>> {
  if (!ids.length) return new Map();
  const tagok = await db
    .select()
    .from(szovetkezetiTag)
    .where(inArray(szovetkezetiTag.id, ids));
  return new Map(
    tagok.map((t) => [
      t.id,
      {
        azonosito: t.id,
        szuldat: t.szuldat ? String(t.szuldat).slice(0, 10) : null,
        adoszam: t.adoszam,
        nav_bejelentes: t.navBejelentes
          ? String(t.navBejelentes).slice(0, 10)
          : t.belepes
            ? String(t.belepes).slice(0, 10)
            : null,
        tagsag_kezdete: t.belepes ? String(t.belepes).slice(0, 10) : null,
        tagsag_vege: t.kilepes ? String(t.kilepes).slice(0, 10) : null,
        tagsag_statusz: t.tagsagStatusz,
      },
    ]),
  );
}

async function munkalapReszlet(id: number) {
  const [row] = await db.select().from(munkalap).where(eq(munkalap.id, id));
  if (!row) return null;
  const [p] = await db.select().from(projekt).where(eq(projekt.id, row.projektId));
  const nevek = await tagNevekMap();
  const diakok = parseDiakokMunkalap(row.diakok);
  const tagIds = diakok.map((d) => d.student_id).filter(Boolean);
  const tagMeta = await tagMetaMap(tagIds);
  return {
    munkalap: munkalapValasz(row, p, nevek),
    ber_kodok: berKodokFromProjekt(p),
    tag_meta: Object.fromEntries(tagMeta),
  };
}

function parseDiakokRaw(raw: unknown): Array<Record<string, unknown>> {
  return Array.isArray(raw) ? raw.filter((d) => d && typeof d === 'object') as Array<Record<string, unknown>> : [];
}

function formatTime(ts: Date | string | null | undefined, fallback: string): string {
  if (!ts) return fallback;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function berKodokFromProjekt(p: typeof projekt.$inferSelect | undefined) {
  if (!p) return [];
  const meta = mergeProjektMeta(p);
  return szamfejtesiBerekBerKodLista(meta);
}

function parseDiakokMunkalap(raw: unknown): MunkalapDiak[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
    .map((d) => ({
      id: d.id != null ? Number(d.id) : undefined,
      student_id: Number(d.student_id) || 0,
      student_nev: typeof d.student_nev === 'string' ? d.student_nev : undefined,
      idoadatok:
        d.idoadatok && typeof d.idoadatok === 'object'
          ? (d.idoadatok as MunkalapDiak['idoadatok'])
          : {},
      cimkek: Array.isArray(d.cimkek) ? d.cimkek.filter((c): c is string => typeof c === 'string') : [],
      hozzaadva: typeof d.hozzaadva === 'string' ? d.hozzaadva : undefined,
    }));
}

const ATMENET: Partial<Record<MunkalapStatusz, MunkalapStatusz[]>> = {
  Piszkozat: ['Lezárt'],
  Lezárt: ['Jóváhagyott', 'Elutasított', 'Piszkozat'],
  Jóváhagyott: ['Számfejtett', 'Lezárt'],
  Elutasított: ['Piszkozat'],
  'Korrekció Piszkozat': ['Korrekció Lezárt'],
  'Korrekció Lezárt': ['Korrekció Jóváhagyott', 'Korrekció Elutasított', 'Korrekció Piszkozat'],
  'Korrekció Jóváhagyott': ['Számfejtett', 'Korrekció Lezárt'],
  'Korrekció Elutasított': ['Korrekció Piszkozat'],
};

function lezarasStatuszok(): string[] {
  return ['Lezárt', 'Korrekció Lezárt'];
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('berszamfejtes', 'olvasas');
    if (auth instanceof Response) return auth;

    const id = url.searchParams.get('id');
    if (id) {
      const reszlet = await munkalapReszlet(Number(id));
      if (!reszlet) return Response.json({ hiba: 'Munkalap nem található' }, { status: 404 });
      const tiltas = await assertProjektHozzaferes(auth, reszlet.munkalap.projekt_id);
      if (tiltas) return tiltas;
      return Response.json(reszlet);
    }

    const nezet = url.searchParams.get('nezet');
    if (nezet === 'jelenletek') {
      const projektId = url.searchParams.get('projekt_id');
      const feltetelek = [
        or(eq(jelenlet.statusz, 'pv_véglegesített'), eq(jelenlet.statusz, 'jóváhagyva')),
        eq(jelenlet.munkalapHozzarendelve, false),
      ];
      if (projektId) feltetelek.push(eq(jelenlet.projektId, Number(projektId)));
      const lathato = await belsoLathatoProjektIds(auth);
      const scope = projektIdSzuro(lathato, jelenlet.projektId);
      if (scope) feltetelek.push(scope);

      const sorok = await db
        .select({
          id: jelenlet.id,
          diak_id: jelenlet.diakId,
          diak_nev: diakRegisztracio.nev,
          statusz: jelenlet.statusz,
          erkezes: jelenlet.erkezes,
          tavozas: jelenlet.tavozas,
          qr_erkezes: jelenlet.qrErkezes,
          qr_tavozas: jelenlet.qrTavozas,
          muszak_datum: sql<string>`COALESCE(${muszak.datum}::text, ${jelenlet.muszakDatum}::text)`,
          muszak_kezdet: muszak.kezdet,
          muszak_vege: muszak.vege,
          muszak_cim: muszak.cim,
          projekt_id: jelenlet.projektId,
          projekt_azonosito: projekt.azonosito,
          tag_id: szovetkezetiTag.id,
        })
        .from(jelenlet)
        .innerJoin(diakRegisztracio, eq(jelenlet.diakId, diakRegisztracio.id))
        .leftJoin(beosztas, eq(jelenlet.beosztasId, beosztas.id))
        .leftJoin(muszak, eq(beosztas.muszakId, muszak.id))
        .leftJoin(projekt, eq(jelenlet.projektId, projekt.id))
        .leftJoin(szovetkezetiTag, eq(szovetkezetiTag.diakRegisztracioId, diakRegisztracio.id))
        .where(and(...feltetelek))
        .orderBy(desc(jelenlet.letrehozva))
        .limit(200);

      return Response.json({
        sorok: sorok.map((s) => {
          const fmt = (ts: Date | null | undefined) =>
            ts
              ? `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`
              : null;
          return {
            id: s.id,
            diak_id: s.diak_id,
            diak_nev: s.diak_nev,
            tag_id: s.tag_id,
            statusz: s.statusz,
            erkezes: s.erkezes?.toISOString() ?? null,
            tavozas: s.tavozas?.toISOString() ?? null,
            erkezes_ora: fmt(s.erkezes),
            tavozas_ora: fmt(s.tavozas),
            qr_erkezes: s.qr_erkezes?.toISOString() ?? null,
            qr_tavozas: s.qr_tavozas?.toISOString() ?? null,
            qr_erkezes_ora: fmt(s.qr_erkezes),
            qr_tavozas_ora: fmt(s.qr_tavozas),
            muszak_datum: s.muszak_datum ? String(s.muszak_datum).slice(0, 10) : null,
            muszak_kezdet: s.muszak_kezdet ?? fmt(s.erkezes) ?? '08:00',
            muszak_vege: s.muszak_vege ?? fmt(s.tavozas) ?? '16:00',
            muszak_cim: s.muszak_cim ?? 'Jelenléti ív',
            projekt_id: s.projekt_id,
            projekt_azonosito: s.projekt_azonosito,
          };
        }),
        count: sorok.length,
      });
    }

    const szf = url.searchParams.get('szf_idoszak')?.trim() ?? '';
    const statusz = url.searchParams.get('statusz')?.trim() ?? '';
    const projektIdFilter = url.searchParams.get('projekt_id');

    const feltetelek = [];
    if (projektIdFilter) feltetelek.push(eq(munkalap.projektId, Number(projektIdFilter)));
    if (szf) feltetelek.push(ilike(munkalap.szfIdoszak, `%${szf}%`));
    if (nezet === 'folyoszamla') {
      feltetelek.push(eq(munkalap.statusz, 'Számfejtett'));
    } else if (statusz && statusz !== 'mind') {
      feltetelek.push(eq(munkalap.statusz, statusz));
    }

    const lathato = await belsoLathatoProjektIds(auth);
    const scope = projektIdSzuro(lathato, munkalap.projektId);
    if (scope) feltetelek.push(scope);

    const sorok = await db
      .select()
      .from(munkalap)
      .where(feltetelek.length ? and(...feltetelek) : undefined)
      .orderBy(desc(munkalap.letrehozva))
      .limit(200);

    const projektek =
      lathato === null
        ? await db.select().from(projekt)
        : lathato.length
          ? await db.select().from(projekt).where(inArray(projekt.id, lathato))
          : [];
    const pMap = new Map(projektek.map((p) => [p.id, p]));
    const nevek = await tagNevekMap();

    return Response.json({
      sorok: sorok.map((r) => munkalapValasz(r, pMap.get(r.projektId), nevek)),
      count: sorok.length,
    });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('berszamfejtes', 'iras');
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const projektId = Number(body.projekt_id);
    const szfIdoszak = typeof body.szf_idoszak === 'string' ? body.szf_idoszak : '';
    const teljIdoszak =
      typeof body.telj_idoszak === 'string' ? body.telj_idoszak : szfIdoszak;
    if (!projektId || !szfIdoszak) {
      return Response.json({ hiba: 'Projekt és szf_idoszak kötelező' }, { status: 400 });
    }

    const [p] = await db.select().from(projekt).where(eq(projekt.id, projektId));
    if (!p) return Response.json({ hiba: 'Projekt nem található' }, { status: 404 });
    const tiltas = await assertProjektHozzaferes(auth, projektId);
    if (tiltas) return tiltas;

    const [cnt] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(munkalap)
      .where(eq(munkalap.projektId, projektId));
    const seq = (cnt?.count ?? 0) + 1;
    const azonosito = kovetkezoMunkalapAzonosito(p.azonosito, seq);

    const [uj] = await db
      .insert(munkalap)
      .values({
        azonosito,
        nev: typeof body.nev === 'string' ? body.nev.trim() || null : null,
        projektId,
        temavezeto:
          typeof body.temavezeto === 'string'
            ? body.temavezeto.trim() || null
            : null,
        teljIdoszak: teljIdoszak,
        szfIdoszak: szfIdoszak,
        tipusEgyosszegu: Boolean(body.tipus_egyosszegu),
        megjegyzes: typeof body.megjegyzes === 'string' ? body.megjegyzes : null,
        statusz: 'Piszkozat',
        letrehozo: auth.email,
        diakok: [],
      })
      .returning();

    const reszlet = await munkalapReszlet(uj.id);
    return Response.json({ ok: true, ...reszlet }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('berszamfejtes', 'iras');
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const id = Number(body.id);
    if (!id) return Response.json({ hiba: 'Hiányzó munkalap azonosító' }, { status: 400 });

    const [meglevo] = await db.select().from(munkalap).where(eq(munkalap.id, id));
    if (!meglevo) return Response.json({ hiba: 'Munkalap nem található' }, { status: 404 });

    const [p] = await db.select().from(projekt).where(eq(projekt.id, meglevo.projektId));
    const patch: Partial<typeof munkalap.$inferInsert> = {};
    const muvelet = typeof body.muvelet === 'string' ? body.muvelet : '';

    if (muvelet === 'korrekcio_inditas') {
      if (meglevo.statusz !== 'Számfejtett') {
        return Response.json({ hiba: 'Korrekció csak számfejtett munkalapból indítható' }, { status: 400 });
      }
      if (meglevo.korrekcioSzuloId) {
        return Response.json(
          { hiba: 'Korrekciós munkalapból nem indítható további korrekció' },
          { status: 400 },
        );
      }
      const [korCnt] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(munkalap)
        .where(eq(munkalap.korrekcioSzuloId, id));
      const seq = (korCnt?.count ?? 0) + 1;
      const azonosito = kovetkezoKorrekcioAzonosito(meglevo.azonosito, seq);
      const [uj] = await db
        .insert(munkalap)
        .values({
          azonosito,
          nev: meglevo.nev ? `${meglevo.nev} (korrekció)` : null,
          projektId: meglevo.projektId,
          temavezeto: meglevo.temavezeto,
          teljIdoszak: meglevo.teljIdoszak,
          szfIdoszak: meglevo.szfIdoszak,
          tipusEgyosszegu: meglevo.tipusEgyosszegu,
          megjegyzes: meglevo.megjegyzes,
          statusz: 'Korrekció Piszkozat',
          korrekcioSzuloId: id,
          letrehozo: auth.email,
          diakok: meglevo.diakok ?? [],
        })
        .returning();
      const reszlet = await munkalapReszlet(uj.id);
      return Response.json({ ok: true, ...reszlet }, { status: 201 });
    }

    if (meglevo.statusz === 'Számfejtett') {
      return Response.json({ hiba: 'Számfejtett munkalap nem módosítható' }, { status: 400 });
    }

    if (muvelet === 'diak_hozzaad') {
      if (!munkalapSzerkesztheto(meglevo.statusz)) {
        return Response.json({ hiba: 'Diák hozzáadás csak piszkozat állapotban' }, { status: 400 });
      }
      const ids = Array.isArray(body.student_ids)
        ? body.student_ids.map((x) => Number(x)).filter(Boolean)
        : [];
      if (!ids.length) {
        return Response.json({ hiba: 'Adj meg legalább egy diákot' }, { status: 400 });
      }
      const map = new Map<number, Record<string, unknown>>();
      for (const d of parseDiakokRaw(meglevo.diakok)) {
        const sid = Number(d.student_id);
        if (sid) map.set(sid, d);
      }
      const ma = new Date().toISOString().slice(0, 10);
      const tagSorok = await db
        .select({ id: szovetkezetiTag.id, nev: szovetkezetiTag.nev })
        .from(szovetkezetiTag)
        .where(inArray(szovetkezetiTag.id, ids));
      const nevMap = new Map(tagSorok.map((t) => [t.id, t.nev]));
      for (const sid of ids) {
        if (!map.has(sid)) {
          map.set(sid, {
            student_id: sid,
            student_nev: nevMap.get(sid),
            idoadatok: {},
            cimkek: [],
            hozzaadva: ma,
          });
        }
      }
      patch.diakok = [...map.values()];
    } else if (muvelet === 'diak_torol') {
      if (!munkalapSzerkesztheto(meglevo.statusz)) {
        return Response.json({ hiba: 'Diák törlés csak piszkozat állapotban' }, { status: 400 });
      }
      const sid = Number(body.student_id);
      if (!sid) return Response.json({ hiba: 'Hiányzó student_id' }, { status: 400 });
      patch.diakok = parseDiakokRaw(meglevo.diakok).filter((d) => Number(d.student_id) !== sid);
    } else if (muvelet === 'jelenlet_hozzarendel') {
      if (!munkalapSzerkesztheto(meglevo.statusz)) {
        return Response.json({ hiba: 'Jelenlét hozzárendelés csak piszkozat állapotban' }, { status: 400 });
      }
      const jelenletIds = Array.isArray(body.jelenlet_ids)
        ? body.jelenlet_ids.map((x) => Number(x)).filter(Boolean)
        : [];
      const defaultKod = typeof body.default_kod === 'string' ? body.default_kod : '1';
      if (!jelenletIds.length) {
        return Response.json({ hiba: 'Jelölj ki jelenléteket' }, { status: 400 });
      }

      const sorok = await db
        .select({
          jelenlet: jelenlet,
          muszak: muszak,
          tag_id: szovetkezetiTag.id,
        })
        .from(jelenlet)
        .leftJoin(beosztas, eq(jelenlet.beosztasId, beosztas.id))
        .leftJoin(muszak, eq(beosztas.muszakId, muszak.id))
        .leftJoin(szovetkezetiTag, eq(szovetkezetiTag.diakRegisztracioId, jelenlet.diakId))
        .where(inArray(jelenlet.id, jelenletIds));

      const map = new Map<number, Record<string, unknown>>();
      for (const d of parseDiakokRaw(meglevo.diakok)) {
        const sid = Number(d.student_id);
        if (sid) map.set(sid, { ...d, idoadatok: { ...(d.idoadatok as object) } });
      }
      const ma = new Date().toISOString().slice(0, 10);
      const szfHonap = meglevo.szfIdoszak;
      const hozzarendeltIds: number[] = [];

      for (const row of sorok) {
        const tagId = row.tag_id ?? row.jelenlet.diakId;
        const datum = String(row.muszak?.datum ?? row.jelenlet.muszakDatum ?? '').slice(0, 10);
        if (!datum.startsWith(szfHonap)) continue;
        const nap = Number(datum.slice(8, 10));
        const tol = formatTime(row.jelenlet.erkezes, row.muszak?.kezdet ?? '08:00');
        const ig = formatTime(row.jelenlet.tavozas, row.muszak?.vege ?? '16:00');
        let diak = map.get(tagId);
        if (!diak) {
          diak = { student_id: tagId, idoadatok: {}, cimkek: [], hozzaadva: ma };
          map.set(tagId, diak);
        }
        const idoadatok = (diak.idoadatok ?? {}) as Record<string, unknown>;
        idoadatok[String(nap)] = { kod: defaultKod, tol, ig };
        diak.idoadatok = idoadatok;
        hozzarendeltIds.push(row.jelenlet.id);
      }
      patch.diakok = [...map.values()];

      if (hozzarendeltIds.length) {
        await db
          .update(jelenlet)
          .set({ munkalapHozzarendelve: true, munkalapId: meglevo.id })
          .where(inArray(jelenlet.id, hozzarendeltIds));
      }
    } else {
      if (!munkalapSzerkesztheto(meglevo.statusz) && (body.diakok || body.nev !== undefined || body.megjegyzes !== undefined)) {
        return Response.json({ hiba: 'Csak piszkozat vagy elutasított munkalap szerkeszthető' }, { status: 400 });
      }
      if (typeof body.nev === 'string') patch.nev = body.nev.trim() || null;
      if (typeof body.megjegyzes === 'string') patch.megjegyzes = body.megjegyzes;
      if (body.tipus_egyosszegu != null) patch.tipusEgyosszegu = Boolean(body.tipus_egyosszegu);
      if (Array.isArray(body.diakok)) patch.diakok = body.diakok;
    }

    if (typeof body.statusz === 'string') {
      const ujStatusz = body.statusz as MunkalapStatusz;
      const engedelyezett = ATMENET[meglevo.statusz as MunkalapStatusz];
      if (engedelyezett && !engedelyezett.includes(ujStatusz)) {
        return Response.json(
          { hiba: `${meglevo.statusz} → ${ujStatusz} átmenet nem engedélyezett` },
          { status: 400 },
        );
      }
      if (lezarasStatuszok().includes(ujStatusz)) {
        const diakok = Array.isArray(patch.diakok)
          ? patch.diakok
          : (meglevo.diakok as unknown[]) ?? [];
        if (!diakok.length) {
          return Response.json(
            { hiba: 'Legalább egy diák kell a lezáráshoz' },
            { status: 400 },
          );
        }
        const berKodok = berKodokFromProjekt(p);
        patch.controlling = munkalapControlling(
          diakok as Parameters<typeof munkalapControlling>[0],
          berKodok,
        );
      }
      patch.statusz = ujStatusz;
    }

    if (patch.diakok && p) {
      if (!munkalapSzerkesztheto(meglevo.statusz)) {
        return Response.json(
          { hiba: 'Diák adatok csak piszkozat vagy elutasított állapotban szerkeszthetők' },
          { status: 400 },
        );
      }
      const meta = mergeProjektMeta(p);
      const kodHiba = munkalapDiakokEllenorzes(patch.diakok as unknown[], meta);
      if (kodHiba) return Response.json({ hiba: kodHiba }, { status: 400 });
    }

    if (!Object.keys(patch).length) {
      return Response.json({ hiba: 'Nincs módosítandó mező' }, { status: 400 });
    }

    await db.update(munkalap).set(patch).where(eq(munkalap.id, id));

    if (patch.statusz === 'Jóváhagyott' || patch.statusz === 'Korrekció Jóváhagyott') {
      const [frissRow] = await db.select().from(munkalap).where(eq(munkalap.id, id));
      if (frissRow) {
        await teljesitesFrissitesMunkalapbol(
          frissRow,
          parseDiakokMunkalap(frissRow.diakok),
          patch.statusz === 'Korrekció Jóváhagyott',
        );
      }
    }

    const reszlet = await munkalapReszlet(id);
    return Response.json({ ok: true, ...reszlet });
  }

  if (req.method === 'DELETE') {
    const auth = await requireBelso('berszamfejtes', 'iras');
    if (auth instanceof Response) return auth;

    const id = Number(url.searchParams.get('id'));
    if (!id) return Response.json({ hiba: 'Hiányzó azonosító' }, { status: 400 });

    const [meglevo] = await db.select().from(munkalap).where(eq(munkalap.id, id));
    if (!meglevo) return Response.json({ hiba: 'Munkalap nem található' }, { status: 404 });
    if (meglevo.statusz === 'Számfejtett') {
      return Response.json({ hiba: 'Számfejtett munkalap nem törölhető' }, { status: 400 });
    }

    await db.delete(munkalap).where(eq(munkalap.id, id));
    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/munkalapok',
};
