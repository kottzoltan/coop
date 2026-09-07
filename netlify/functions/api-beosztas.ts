import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import {
  beosztas,
  beosztasCsoport,
  diakRegisztracio,
  jelenlet,
  muszak,
  partnerRegisztracio,
  projekt,
} from '../../db/schema.js';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { getIceAuth, requireBelso, requireDiak } from './lib/auth.js';
import { getPartnerContext } from './lib/partner-auth.js';
import {
  diakLemondasInfo,
  MUSZAK_LEZARAS_ORA,
  partnerMuszakMuveletek,
} from '../../shared/src/beosztas-szabalyok.js';
import { jelenletGpsEngedelyezett, jelenletIdoEngedelyezett } from '../../shared/src/jelenlet-checkin.js';
import {
  assertProjektHozzaferes,
  belsoLathatoProjektIds,
  projektIdSzuro,
} from './lib/projekt-scope.js';

function diakCheckinMeta(muszakRow: typeof muszak.$inferSelect) {
  const alap = {
    datum: String(muszakRow.datum).slice(0, 10),
    kezdet: muszakRow.kezdet,
    vege: muszakRow.vege,
    helyLat: muszakRow.helyLat,
    helyLng: muszakRow.helyLng,
    gpsSugarM: muszakRow.gpsSugarM,
  };
  const erkezes = jelenletIdoEngedelyezett(alap, 'erkezes');
  const tavozas = jelenletIdoEngedelyezett(alap, 'tavozas');
  const gpsKotelezo = jelenletGpsEngedelyezett(alap).kotelezo;
  return {
    checkin: {
      gps_kotelezo: gpsKotelezo,
      gps_sugar_m: muszakRow.gpsSugarM ?? 300,
      hely_lat: muszakRow.helyLat,
      hely_lng: muszakRow.helyLng,
      erkezes_nyitva: erkezes.ok,
      erkezes_uzenet: erkezes.uzenet ?? null,
      erkezes_ablak: { nyitas: erkezes.nyitas.toISOString(), zaras: erkezes.zaras.toISOString() },
      tavozas_nyitva: tavozas.ok,
      tavozas_uzenet: tavozas.uzenet ?? null,
      tavozas_ablak: { nyitas: tavozas.nyitas.toISOString(), zaras: tavozas.zaras.toISOString() },
    },
  };
}

async function partnerMuszak(muszakId: number, partnerId: number) {
  const [row] = await db
    .select({ muszak: muszak, beosztott: sql<number>`(
      SELECT count(*)::int FROM beosztas b
      WHERE b.muszak_id = ${muszak.id}
        AND b.statusz NOT IN ('lemondva', 'lemondás_kérvényezve')
    )` })
    .from(muszak)
    .where(and(eq(muszak.id, muszakId), eq(muszak.partnerId, partnerId)));
  return row ?? null;
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const partner = url.searchParams.get('partner') === '1';
    const belso = url.searchParams.get('belso') === '1';
    const diakIdParam = url.searchParams.get('diak_id');
    const muszakIdParam = url.searchParams.get('muszak_id');

    if (belso) {
      const auth = await requireBelso('beosztas', 'olvasas');
      if (auth instanceof Response) return auth;

      const projektIdFilter = url.searchParams.get('projekt_id');
      const lathato = await belsoLathatoProjektIds(auth);
      const feltetelek = [ne(muszak.statusz, 'törölve')];
      if (projektIdFilter) {
        feltetelek.push(eq(muszak.projektId, Number(projektIdFilter)));
      }
      const scope = projektIdSzuro(lathato, muszak.projektId);
      if (scope) feltetelek.push(scope);

      if (muszakIdParam) {
        const muszakId = Number(muszakIdParam);
        const [mRow] = await db
          .select({
            muszak: muszak,
            beosztott: sql<number>`(
              SELECT count(*)::int FROM beosztas b
              WHERE b.muszak_id = ${muszak.id}
                AND b.statusz NOT IN ('lemondva', 'lemondás_kérvényezve')
            )`,
            projekt_azonosito: projekt.azonosito,
            projekt_nev: projekt.nev,
            partner_cegnev: partnerRegisztracio.cegnev,
          })
          .from(muszak)
          .leftJoin(projekt, eq(muszak.projektId, projekt.id))
          .leftJoin(partnerRegisztracio, eq(muszak.partnerId, partnerRegisztracio.id))
          .where(and(eq(muszak.id, muszakId), ...feltetelek));

        if (!mRow) return Response.json({ hiba: 'Műszak nem található' }, { status: 404 });

        const tiltas = await assertProjektHozzaferes(auth, mRow.muszak.projektId);
        if (tiltas) return tiltas;

        const beosztottak = await db
          .select({
            beosztas: beosztas,
            diak_nev: diakRegisztracio.nev,
            diak_id: diakRegisztracio.id,
          })
          .from(beosztas)
          .innerJoin(diakRegisztracio, eq(beosztas.diakId, diakRegisztracio.id))
          .where(eq(beosztas.muszakId, muszakId))
          .orderBy(beosztas.letrehozva);

        return Response.json({
          muszak: {
            ...mRow.muszak,
            beosztott: mRow.beosztott,
            projekt_azonosito: mRow.projekt_azonosito,
            projekt_nev: mRow.projekt_nev,
            partner_cegnev: mRow.partner_cegnev,
          },
          beosztottak,
        });
      }

      const beosztasok = await db
        .select({
          csoport: beosztasCsoport,
          projekt_azonosito: projekt.azonosito,
          projekt_nev: projekt.nev,
          partner_cegnev: partnerRegisztracio.cegnev,
        })
        .from(beosztasCsoport)
        .leftJoin(projekt, eq(beosztasCsoport.projektId, projekt.id))
        .leftJoin(partnerRegisztracio, eq(beosztasCsoport.partnerId, partnerRegisztracio.id))
        .where(
          and(
            projektIdFilter
              ? eq(beosztasCsoport.projektId, Number(projektIdFilter))
              : sql`true`,
            projektIdSzuro(lathato, beosztasCsoport.projektId) ?? sql`true`,
          ),
        )
        .orderBy(desc(beosztasCsoport.letrehozva));

      const muszakok = await db
        .select({
          muszak: muszak,
          beosztott: sql<number>`(
            SELECT count(*)::int FROM beosztas b
            WHERE b.muszak_id = ${muszak.id}
              AND b.statusz NOT IN ('lemondva', 'lemondás_kérvényezve')
          )`,
          projekt_azonosito: projekt.azonosito,
          projekt_nev: projekt.nev,
          partner_cegnev: partnerRegisztracio.cegnev,
        })
        .from(muszak)
        .leftJoin(projekt, eq(muszak.projektId, projekt.id))
        .leftJoin(partnerRegisztracio, eq(muszak.partnerId, partnerRegisztracio.id))
        .where(and(...feltetelek))
        .orderBy(desc(muszak.datum), desc(muszak.kezdet));

      const maStr = new Date().toISOString().slice(0, 10);
      const ketHet = new Date();
      ketHet.setDate(ketHet.getDate() + 14);
      const ketHetStr = ketHet.toISOString().slice(0, 10);

      const kovetkezo = muszakok.filter(
        (m) => String(m.muszak.datum) >= maStr && String(m.muszak.datum) <= ketHetStr,
      );

      const [fuggőRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(jelenlet)
        .innerJoin(beosztas, eq(jelenlet.beosztasId, beosztas.id))
        .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
        .where(
          and(
            eq(jelenlet.statusz, 'rögzített'),
            projektIdFilter ? eq(muszak.projektId, Number(projektIdFilter)) : sql`true`,
          ),
        );

      return Response.json({
        lezarasOra: MUSZAK_LEZARAS_ORA,
        beosztasok: beosztasok.map((r) => ({
          ...r.csoport,
          projekt_azonosito: r.projekt_azonosito,
          projekt_nev: r.projekt_nev,
          partner_cegnev: r.partner_cegnev,
        })),
        muszakok: muszakok.map((r) => ({
          ...r.muszak,
          beosztott: r.beosztott,
          projekt_azonosito: r.projekt_azonosito,
          projekt_nev: r.projekt_nev,
          partner_cegnev: r.partner_cegnev,
        })),
        statistikak: {
          osszesMuszak: muszakok.length,
          kovetkezo2Het: kovetkezo.length,
          beosztottOsszesen: muszakok.reduce((s, m) => s + (m.beosztott ?? 0), 0),
          fuggőJelenlet: fuggőRow?.count ?? 0,
        },
      });
    }

    if (partner) {
      const ctx = await getPartnerContext();
      if (ctx instanceof Response) return ctx;

      const beosztasok = await db
        .select({
          csoport: beosztasCsoport,
          projekt_azonosito: projekt.azonosito,
          projekt_nev: projekt.nev,
        })
        .from(beosztasCsoport)
        .leftJoin(projekt, eq(beosztasCsoport.projektId, projekt.id))
        .where(eq(beosztasCsoport.partnerId, ctx.partnerId))
        .orderBy(desc(beosztasCsoport.letrehozva));

      const muszakok = await db
        .select({
          muszak: muszak,
          beosztott: sql<number>`(
            SELECT count(*)::int FROM beosztas b
            WHERE b.muszak_id = ${muszak.id}
              AND b.statusz NOT IN ('lemondva', 'lemondás_kérvényezve')
          )`,
          projekt_azonosito: projekt.azonosito,
        })
        .from(muszak)
        .leftJoin(projekt, eq(muszak.projektId, projekt.id))
        .where(and(eq(muszak.partnerId, ctx.partnerId), ne(muszak.statusz, 'törölve')))
        .orderBy(desc(muszak.datum), desc(muszak.kezdet));

      const maStr = new Date().toISOString().slice(0, 10);
      const ketHet = new Date();
      ketHet.setDate(ketHet.getDate() + 14);
      const ketHetStr = ketHet.toISOString().slice(0, 10);

      const kovetkezo = muszakok.filter(
        (m) => String(m.muszak.datum) >= maStr && String(m.muszak.datum) <= ketHetStr,
      );

      const [fuggőRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(jelenlet)
        .where(and(eq(jelenlet.partnerId, ctx.partnerId), eq(jelenlet.statusz, 'rögzített')));

      return Response.json({
        demo: ctx.demo,
        lezarasOra: MUSZAK_LEZARAS_ORA,
        beosztasok: beosztasok.map((r) => ({
          ...r.csoport,
          projekt_azonosito: r.projekt_azonosito,
          projekt_nev: r.projekt_nev,
        })),
        muszakok: muszakok.map((r) => {
          const muveletek = partnerMuszakMuveletek(r.muszak, r.beosztott ?? 0);
          return {
            ...r.muszak,
            beosztott: r.beosztott,
            projekt_azonosito: r.projekt_azonosito,
            modosithato: muveletek.modosithato,
            torolheto: muveletek.torolheto,
            muveletIndok: muveletek.indok ?? null,
          };
        }),
        statistikak: {
          osszesMuszak: muszakok.length,
          kovetkezo2Het: kovetkezo.length,
          beosztottOsszesen: muszakok.reduce((s, m) => s + (m.beosztott ?? 0), 0),
          fuggőJelenlet: fuggőRow?.count ?? 0,
        },
      });
    }

    const auth = await getIceAuth();

    if (diakIdParam) {
      const diakId = Number(diakIdParam);
      if (auth?.szerep === 'diak' && auth.diakId !== diakId) {
        return Response.json({ hiba: 'Forbidden' }, { status: 403 });
      }

      const sorok = await db
        .select({ beosztas: beosztas, muszak: muszak })
        .from(beosztas)
        .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
        .where(eq(beosztas.diakId, diakId))
        .orderBy(desc(muszak.datum));

      return Response.json({
        lezarasOra: MUSZAK_LEZARAS_ORA,
        sorok: sorok.map((s) => {
          const lemondas = diakLemondasInfo(s.beosztas, s.muszak);
          return {
            ...s,
            ...diakCheckinMeta(s.muszak),
            lemondhato: lemondas.lemondhato,
            lemondasKerelem: lemondas.kerelem ?? false,
            lemondasIndok: lemondas.indok ?? null,
          };
        }),
        count: sorok.length,
      });
    }

    if (auth?.szerep === 'diak' && auth.diakId) {
      const sorok = await db
        .select({ beosztas: beosztas, muszak: muszak })
        .from(beosztas)
        .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
        .where(eq(beosztas.diakId, auth.diakId))
        .orderBy(desc(muszak.datum));

      return Response.json({
        lezarasOra: MUSZAK_LEZARAS_ORA,
        sorok: sorok.map((s) => {
          const lemondas = diakLemondasInfo(s.beosztas, s.muszak);
          return {
            ...s,
            ...diakCheckinMeta(s.muszak),
            lemondhato: lemondas.lemondhato,
            lemondasKerelem: lemondas.kerelem ?? false,
            lemondasIndok: lemondas.indok ?? null,
          };
        }),
        count: sorok.length,
      });
    }

    const diakAuth = await requireDiak();
    if (diakAuth instanceof Response) return diakAuth;

    return Response.json({ sorok: [], count: 0 });
  }

  if (req.method === 'PATCH') {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (body.lemondas === true && body.beosztas_id) {
      const auth = await requireDiak();
      if (auth instanceof Response) return auth;

      const beosztasId = Number(body.beosztas_id);
      const [sor] = await db
        .select({ beosztas: beosztas, muszak: muszak })
        .from(beosztas)
        .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
        .where(and(eq(beosztas.id, beosztasId), eq(beosztas.diakId, auth.diakId!)));

      if (!sor) return Response.json({ hiba: 'Beosztás nem található' }, { status: 404 });

      const lemondas = diakLemondasInfo(sor.beosztas, sor.muszak);
      if (!lemondas.lemondhato) {
        return Response.json({ hiba: lemondas.indok ?? 'Lemondás nem lehetséges' }, { status: 403 });
      }

      const ujStatusz = lemondas.kerelem ? 'lemondás_kérvényezve' : 'lemondva';
      const [friss] = await db
        .update(beosztas)
        .set({ statusz: ujStatusz })
        .where(eq(beosztas.id, beosztasId))
        .returning();

      return Response.json({
        ok: true,
        beosztas: friss,
        uzenet: lemondas.kerelem
          ? 'Lemondási kérelem rögzítve — a mentort értesítjük.'
          : 'Műszak lemondva.',
      });
    }

    const belsoWrite = url.searchParams.get('belso') === '1';
    if (belsoWrite) {
      const auth = await requireBelso('beosztas', 'iras');
      if (auth instanceof Response) return auth;

      if (body.muvelet === 'lemondas_dontes') {
        const beosztasId = Number(body.beosztas_id);
        const elfogadva = body.elfogadva === true;
        if (!beosztasId) {
          return Response.json({ hiba: 'Hiányzó beosztas_id' }, { status: 400 });
        }
        const [friss] = await db
          .update(beosztas)
          .set({ statusz: elfogadva ? 'lemondva' : 'beosztva' })
          .where(eq(beosztas.id, beosztasId))
          .returning();
        if (!friss) return Response.json({ hiba: 'Beosztás nem található' }, { status: 404 });
        return Response.json({ ok: true, beosztas: friss });
      }

      if (body.muvelet === 'csoport_letrehoz') {
        const nev = typeof body.nev === 'string' ? body.nev.trim() : '';
        if (!nev) return Response.json({ hiba: 'Név kötelező' }, { status: 400 });
        const [cs] = await db
          .insert(beosztasCsoport)
          .values({
            nev,
            projektId: body.projekt_id ? Number(body.projekt_id) : null,
            partnerId: body.partner_id ? Number(body.partner_id) : null,
            leiras: typeof body.leiras === 'string' ? body.leiras.trim() : null,
            statusz: 'aktív',
          })
          .returning();
        return Response.json({ ok: true, csoport: cs }, { status: 201 });
      }

      if (body.muvelet === 'diak_hozzaad') {
        const muszakId = Number(body.muszak_id);
        const diakIds = Array.isArray(body.diak_ids)
          ? body.diak_ids.map(Number).filter((n) => n > 0)
          : [];
        if (!muszakId || !diakIds.length) {
          return Response.json({ hiba: 'muszak_id és diak_ids kötelező' }, { status: 400 });
        }

        const [mRow] = await db
          .select({
            muszak: muszak,
            beosztott: sql<number>`(
              SELECT count(*)::int FROM beosztas b
              WHERE b.muszak_id = ${muszak.id}
                AND b.statusz NOT IN ('lemondva', 'lemondás_kérvényezve')
            )`,
          })
          .from(muszak)
          .where(and(eq(muszak.id, muszakId), ne(muszak.statusz, 'törölve')));

        if (!mRow) return Response.json({ hiba: 'Műszak nem található' }, { status: 404 });

        const letszam = mRow.muszak.letszamMegrendelt ?? 1;
        const ujBeosztott = (mRow.beosztott ?? 0) + diakIds.length;
        if (ujBeosztott > letszam) {
          return Response.json(
            { hiba: `Létszám túllépés (${ujBeosztott}/${letszam})` },
            { status: 400 },
          );
        }

        const letezo = await db
          .select({ diakId: beosztas.diakId })
          .from(beosztas)
          .where(
            and(
              eq(beosztas.muszakId, muszakId),
              ne(beosztas.statusz, 'lemondva'),
            ),
          );
        const letezoSet = new Set(letezo.map((b) => b.diakId));
        const ujak = diakIds.filter((id) => !letezoSet.has(id));
        if (!ujak.length) {
          return Response.json({ hiba: 'Minden diák már be van osztva' }, { status: 400 });
        }

        const beszurt = await db
          .insert(beosztas)
          .values(
            ujak.map((diakId) => ({
              muszakId,
              diakId,
              statusz: 'beosztva',
            })),
          )
          .returning();

        return Response.json({ ok: true, beosztasok: beszurt, count: beszurt.length });
      }

      if (body.muvelet === 'diak_torol') {
        const beosztasId = Number(body.beosztas_id);
        if (!beosztasId) {
          return Response.json({ hiba: 'Hiányzó beosztas_id' }, { status: 400 });
        }
        const [torolt] = await db
          .update(beosztas)
          .set({ statusz: 'lemondva' })
          .where(eq(beosztas.id, beosztasId))
          .returning();
        if (!torolt) return Response.json({ hiba: 'Beosztás nem található' }, { status: 404 });
        return Response.json({ ok: true, beosztas: torolt });
      }

      const muszakId = Number(body.muszak_id);
      if (!muszakId) return Response.json({ hiba: 'Hiányzó műszak azonosító' }, { status: 400 });

      const [row] = await db
        .select({
          muszak: muszak,
          beosztott: sql<number>`(
            SELECT count(*)::int FROM beosztas b
            WHERE b.muszak_id = ${muszak.id}
              AND b.statusz NOT IN ('lemondva', 'lemondás_kérvényezve')
          )`,
        })
        .from(muszak)
        .where(and(eq(muszak.id, muszakId), ne(muszak.statusz, 'törölve')));

      if (!row) return Response.json({ hiba: 'Műszak nem található' }, { status: 404 });

      const patch: Partial<typeof muszak.$inferInsert> = {};
      if (typeof body.kezdet === 'string') patch.kezdet = body.kezdet;
      if (typeof body.vege === 'string') patch.vege = body.vege;
      if (typeof body.cim === 'string') patch.cim = body.cim.trim();
      if (typeof body.hely === 'string') patch.hely = body.hely.trim() || null;
      if (typeof body.leiras === 'string') patch.leiras = body.leiras.trim() || null;
      if (typeof body.munkakor === 'string') patch.munkakor = body.munkakor.trim();
      if (body.letszam != null) patch.letszamMegrendelt = Math.max(1, Number(body.letszam));
      if (typeof body.statusz === 'string' && ['piszkozat', 'publikus', 'zárt', 'lezárt'].includes(body.statusz)) {
        patch.statusz = body.statusz;
      }
      if (body.projekt_id != null) patch.projektId = Number(body.projekt_id) || null;

      if (!Object.keys(patch).length) {
        return Response.json({ hiba: 'Nincs módosítandó mező' }, { status: 400 });
      }

      const [friss] = await db.update(muszak).set(patch).where(eq(muszak.id, muszakId)).returning();
      return Response.json({ ok: true, muszak: { ...friss, beosztott: row.beosztott } });
    }

    const ctx = await getPartnerContext();
    if (ctx instanceof Response) return ctx;

    const muszakId = Number(body.muszak_id);
    if (!muszakId) return Response.json({ hiba: 'Hiányzó műszak azonosító' }, { status: 400 });

    const row = await partnerMuszak(muszakId, ctx.partnerId);
    if (!row) return Response.json({ hiba: 'Műszak nem található' }, { status: 404 });

    const muveletek = partnerMuszakMuveletek(row.muszak, row.beosztott ?? 0);
    if (!muveletek.modosithato) {
      return Response.json({ hiba: muveletek.indok ?? 'Műszak nem módosítható' }, { status: 403 });
    }

    const patch: Partial<typeof muszak.$inferInsert> = {};
    if (typeof body.kezdet === 'string') patch.kezdet = body.kezdet;
    if (typeof body.vege === 'string') patch.vege = body.vege;
    if (typeof body.cim === 'string') patch.cim = body.cim.trim();
    if (typeof body.hely === 'string') patch.hely = body.hely.trim() || null;
    if (typeof body.leiras === 'string') patch.leiras = body.leiras.trim() || null;
    if (typeof body.munkakor === 'string') patch.munkakor = body.munkakor.trim();
    if (body.letszam != null) patch.letszamMegrendelt = Math.max(1, Number(body.letszam));
    if (typeof body.statusz === 'string' && ['piszkozat', 'publikus', 'zárt'].includes(body.statusz)) {
      patch.statusz = body.statusz;
    }

    if (!Object.keys(patch).length) {
      return Response.json({ hiba: 'Nincs módosítandó mező' }, { status: 400 });
    }

    const [friss] = await db.update(muszak).set(patch).where(eq(muszak.id, muszakId)).returning();
    const muveletekUj = partnerMuszakMuveletek(friss, row.beosztott ?? 0);

    return Response.json({
      ok: true,
      muszak: {
        ...friss,
        beosztott: row.beosztott,
        modosithato: muveletekUj.modosithato,
        torolheto: muveletekUj.torolheto,
        muveletIndok: muveletekUj.indok ?? null,
      },
    });
  }

  if (req.method === 'DELETE') {
    const belsoWrite = url.searchParams.get('belso') === '1';
    if (belsoWrite) {
      const auth = await requireBelso('beosztas', 'iras');
      if (auth instanceof Response) return auth;

      let muszakId: number;
      try {
        const body = await req.json();
        muszakId = Number(body.muszak_id);
      } catch {
        muszakId = Number(url.searchParams.get('muszak_id'));
      }
      if (!muszakId) return Response.json({ hiba: 'Hiányzó műszak azonosító' }, { status: 400 });

      const [torolt] = await db
        .update(muszak)
        .set({ statusz: 'törölve' })
        .where(eq(muszak.id, muszakId))
        .returning();
      if (!torolt) return Response.json({ hiba: 'Műszak nem található' }, { status: 404 });
      return Response.json({ ok: true, muszak: torolt });
    }

    const ctx = await getPartnerContext();
    if (ctx instanceof Response) return ctx;

    let muszakId: number;
    try {
      const body = await req.json();
      muszakId = Number(body.muszak_id);
    } catch {
      muszakId = Number(url.searchParams.get('muszak_id'));
    }

    if (!muszakId) return Response.json({ hiba: 'Hiányzó műszak azonosító' }, { status: 400 });

    const row = await partnerMuszak(muszakId, ctx.partnerId);
    if (!row) return Response.json({ hiba: 'Műszak nem található' }, { status: 404 });

    const muveletek = partnerMuszakMuveletek(row.muszak, row.beosztott ?? 0);
    if (!muveletek.torolheto) {
      return Response.json({ hiba: muveletek.indok ?? 'Műszak nem törölhető' }, { status: 403 });
    }

    const [torolt] = await db
      .update(muszak)
      .set({ statusz: 'törölve' })
      .where(eq(muszak.id, muszakId))
      .returning();

    return Response.json({ ok: true, muszak: torolt });
  }

  if (req.method === 'POST') {
    const belsoWrite = url.searchParams.get('belso') === '1';
    if (belsoWrite) {
      const auth = await requireBelso('beosztas', 'iras');
      if (auth instanceof Response) return auth;

      let body: {
        napok?: string[];
        kezdet?: string;
        vege?: string;
        letszam?: number;
        munkakor?: string;
        cim?: string;
        hely?: string;
        leiras?: string;
        partner_id?: number;
        projekt_id?: number;
        statusz?: string;
      };
      try {
        body = await req.json();
      } catch {
        return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
      }

      const napok = body.napok?.filter(Boolean) ?? [];
      if (!napok.length || !body.kezdet || !body.vege) {
        return Response.json({ hiba: 'Napok, kezdet és vég időpont kötelező' }, { status: 400 });
      }

      const partnerId = body.partner_id ? Number(body.partner_id) : null;
      const projektId = body.projekt_id ? Number(body.projekt_id) : null;
      const cim = body.cim?.trim() || 'Belső műszak';
      const letszam = Math.max(1, Number(body.letszam) || 1);
      const statusz =
        body.statusz && ['piszkozat', 'publikus', 'zárt'].includes(body.statusz)
          ? body.statusz
          : 'publikus';

      const ujak = await db
        .insert(muszak)
        .values(
          napok.map((datum) => ({
            projektId,
            partnerId,
            cim,
            hely: body.hely?.trim() || null,
            datum,
            kezdet: body.kezdet!,
            vege: body.vege!,
            letszamMegrendelt: letszam,
            munkakor: body.munkakor?.trim() || 'Adminisztratív, irodai',
            statusz,
            leiras: body.leiras?.trim() || null,
          })),
        )
        .returning();

      return Response.json({ ok: true, muszakok: ujak, count: ujak.length }, { status: 201 });
    }

    const ctx = await getPartnerContext();
    if (ctx instanceof Response) return ctx;

    let body: {
      napok?: string[];
      kezdet?: string;
      vege?: string;
      letszam?: number;
      munkakor?: string;
      cim?: string;
      hely?: string;
      leiras?: string;
      beosztas_csoport_id?: number;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const napok = body.napok?.filter(Boolean) ?? [];
    if (!napok.length || !body.kezdet || !body.vege) {
      return Response.json({ hiba: 'Napok, kezdet és vég időpont kötelező' }, { status: 400 });
    }

    let csoportId = body.beosztas_csoport_id;
    let projektId: number | null = null;

    if (csoportId) {
      const [cs] = await db
        .select()
        .from(beosztasCsoport)
        .where(
          and(eq(beosztasCsoport.id, csoportId), eq(beosztasCsoport.partnerId, ctx.partnerId)),
        );
      if (!cs) return Response.json({ hiba: 'Beosztás nem található' }, { status: 404 });
      projektId = cs.projektId;
    } else {
      const [cs] = await db
        .select()
        .from(beosztasCsoport)
        .where(eq(beosztasCsoport.partnerId, ctx.partnerId))
        .orderBy(desc(beosztasCsoport.letrehozva))
        .limit(1);
      if (cs) {
        csoportId = cs.id;
        projektId = cs.projektId;
      }
    }

    const cim = body.cim?.trim() || 'Új műszak — megrendelés';
    const letszam = Math.max(1, Number(body.letszam) || 1);

    const ujak = await db
      .insert(muszak)
      .values(
        napok.map((datum) => ({
          projektId,
          beosztasCsoportId: csoportId ?? null,
          partnerId: ctx.partnerId,
          cim,
          hely: body.hely?.trim() || null,
          datum,
          kezdet: body.kezdet!,
          vege: body.vege!,
          letszamMegrendelt: letszam,
          munkakor: body.munkakor?.trim() || 'Adminisztratív, irodai',
          statusz: 'piszkozat',
          leiras: body.leiras?.trim() || null,
        })),
      )
      .returning();

    return Response.json({ ok: true, muszakok: ujak, count: ujak.length }, { status: 201 });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/beosztas',
};
