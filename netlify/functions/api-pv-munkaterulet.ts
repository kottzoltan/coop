import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { jelenlet, muszak, partnerRegisztracio, projekt } from '../../db/schema.js';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import {
  jelenletAuditNaplo,
  jelenletListaJoin,
  jelenletPvVeglegesites,
  jelenletSorLekerdezes,
  jelenletStatuszValtas,
} from './lib/jelenlet-service.js';
import {
  assertProjektHozzaferes,
  belsoLathatoProjektIds,
  projektIdSzuro,
} from './lib/projekt-scope.js';

async function pvOsszesitoScoped(lathato: number[] | null) {
  if (lathato === null) {
    const rows = await db.execute(sql`
      SELECT 'jelenlet_rogzitett' AS k, count(*)::int AS v FROM jelenlet WHERE statusz = 'rögzített'
      UNION ALL
      SELECT 'jelenlet_partner_jovahagyva', count(*)::int FROM jelenlet WHERE statusz = 'partner_jóváhagyva'
      UNION ALL
      SELECT 'jelenlet_pv_veglegesitett', count(*)::int FROM jelenlet WHERE statusz = 'pv_véglegesített'
      UNION ALL
      SELECT 'megrendeles_piszkozat', count(*)::int FROM muszak WHERE statusz = 'piszkozat'
    `);
    const out: Record<string, number> = {};
    for (const r of ((rows as { rows?: { k: string; v: number }[] }).rows ??
      (rows as unknown as { k: string; v: number }[])) as { k: string; v: number }[]) {
      out[r.k] = Number(r.v);
    }
    return out;
  }

  if (lathato.length === 0) {
    return {
      jelenlet_rogzitett: 0,
      jelenlet_partner_jovahagyva: 0,
      jelenlet_pv_veglegesitett: 0,
      megrendeles_piszkozat: 0,
    };
  }

  const [rogzitett] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(jelenlet)
    .where(and(eq(jelenlet.statusz, 'rögzített'), inArray(jelenlet.projektId, lathato)));
  const [partner] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(jelenlet)
    .where(and(eq(jelenlet.statusz, 'partner_jóváhagyva'), inArray(jelenlet.projektId, lathato)));
  const [vegleges] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(jelenlet)
    .where(and(eq(jelenlet.statusz, 'pv_véglegesített'), inArray(jelenlet.projektId, lathato)));
  const [megr] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(muszak)
    .where(and(eq(muszak.statusz, 'piszkozat'), inArray(muszak.projektId, lathato)));

  return {
    jelenlet_rogzitett: Number(rogzitett?.v ?? 0),
    jelenlet_partner_jovahagyva: Number(partner?.v ?? 0),
    jelenlet_pv_veglegesitett: Number(vegleges?.v ?? 0),
    megrendeles_piszkozat: Number(megr?.v ?? 0),
  };
}

export default async (req: Request) => {
  const auth = await requireBelso('beosztas', req.method === 'GET' ? 'olvasas' : 'iras');
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const lathato = await belsoLathatoProjektIds(auth);

  if (req.method === 'GET') {
    const nezet = url.searchParams.get('nezet') ?? 'osszesito';

    if (nezet === 'osszesito') {
      const szamok = await pvOsszesitoScoped(lathato);
      return Response.json({ szamok });
    }

    if (nezet === 'megrendelesek') {
      const feltetelek = [eq(muszak.statusz, 'piszkozat')];
      const scope = projektIdSzuro(lathato, muszak.projektId);
      if (scope) feltetelek.push(scope);

      const sorok = await db
        .select({
          muszak: muszak,
          projekt_azonosito: projekt.azonosito,
          projekt_nev: projekt.nev,
          partner_cegnev: partnerRegisztracio.cegnev,
        })
        .from(muszak)
        .leftJoin(projekt, eq(muszak.projektId, projekt.id))
        .leftJoin(partnerRegisztracio, eq(muszak.partnerId, partnerRegisztracio.id))
        .where(and(...feltetelek))
        .orderBy(desc(muszak.datum))
        .limit(200);

      return Response.json({ sorok, count: sorok.length });
    }

    if (nezet === 'jelenletek') {
      const statusz = url.searchParams.get('statusz') ?? 'partner_jóváhagyva';
      const rows = await jelenletListaJoin({
        statusz,
        projektId: url.searchParams.get('projekt_id')
          ? Number(url.searchParams.get('projekt_id'))
          : undefined,
        projektIds: lathato,
        limit: 500,
      });

      const sorok = await Promise.all(
        rows.map(async (r) => ({
          jelenlet: r.jelenlet,
          diak_nev: r.diak_nev,
          projekt_azonosito: r.projekt_azonosito,
          projekt_nev: r.projekt_nev,
          partner_cegnev: r.partner_cegnev,
          muszak_datum: r.muszak_datum_join ?? r.jelenlet.muszakDatum,
          naplo: await jelenletAuditNaplo(r.jelenlet.id),
        })),
      );

      return Response.json({ sorok, count: sorok.length });
    }

    if (nezet === 'folyamat') {
      try {
        if (lathato !== null && lathato.length === 0) {
          return Response.json({ partnerek: [], count: 0 });
        }

        const feltetelek = [];
        if (lathato !== null) feltetelek.push(inArray(projekt.id, lathato));

        const parokNyers = await db
          .select({
            partner_id: partnerRegisztracio.id,
            partner_cegnev: partnerRegisztracio.cegnev,
            partner_email: partnerRegisztracio.email,
            projekt_id: projekt.id,
            projekt_azonosito: projekt.azonosito,
            projekt_nev: projekt.nev,
          })
          .from(muszak)
          .innerJoin(partnerRegisztracio, eq(muszak.partnerId, partnerRegisztracio.id))
          .innerJoin(projekt, eq(muszak.projektId, projekt.id))
          .where(feltetelek.length ? and(...feltetelek) : undefined);

        const parokMap = new Map<string, (typeof parokNyers)[number]>();
        for (const p of parokNyers) {
          parokMap.set(`${p.partner_id}:${p.projekt_id}`, p);
        }
        const parok = [...parokMap.values()];

        const partnerekMap = new Map<
          number,
          {
            partner_id: number;
            partner_cegnev: string;
            partner_email: string;
            projektek: Array<Record<string, unknown>>;
          }
        >();

        for (const par of parok) {
          const statRaw = await db.execute(sql`
            SELECT
              (SELECT count(*)::int FROM muszak m
                WHERE m.projekt_id = ${par.projekt_id} AND m.partner_id = ${par.partner_id}
                  AND m.statusz = 'piszkozat') AS muszak_piszkozat,
              (SELECT count(*)::int FROM muszak m
                WHERE m.projekt_id = ${par.projekt_id} AND m.partner_id = ${par.partner_id}
                  AND m.statusz IN ('publikus', 'zárt') AND m.datum >= CURRENT_DATE) AS muszak_jovobeli,
              (SELECT count(*)::int FROM beosztas b
                JOIN muszak m ON m.id = b.muszak_id
                WHERE m.projekt_id = ${par.projekt_id} AND m.partner_id = ${par.partner_id}
                  AND b.statusz NOT IN ('lemondva', 'lemondás_kérvényezve')
                  AND m.datum >= CURRENT_DATE - 7) AS beosztott_7nap,
              (SELECT count(*)::int FROM jelenlet j
                WHERE j.projekt_id = ${par.projekt_id} AND j.partner_id = ${par.partner_id}
                  AND j.statusz = 'rögzített') AS jelenlet_rogzitett,
              (SELECT count(*)::int FROM jelenlet j
                WHERE j.projekt_id = ${par.projekt_id} AND j.partner_id = ${par.partner_id}
                  AND j.statusz = 'partner_jóváhagyva') AS jelenlet_partner,
              (SELECT count(*)::int FROM jelenlet j
                WHERE j.projekt_id = ${par.projekt_id} AND j.partner_id = ${par.partner_id}
                  AND j.statusz = 'pv_véglegesített') AS jelenlet_pv,
              (SELECT count(*)::int FROM jelenlet j
                WHERE j.projekt_id = ${par.projekt_id} AND j.partner_id = ${par.partner_id}
                  AND j.statusz = 'elutasítva') AS jelenlet_elutasitva,
              (SELECT count(*)::int FROM jelenlet j
                WHERE j.projekt_id = ${par.projekt_id} AND j.partner_id = ${par.partner_id}
                  AND j.rogzites_mod = 'szabad' AND j.muszak_datum >= CURRENT_DATE - 14) AS szabad_jelenlet_14nap
          `);
          const statRows = (statRaw as { rows?: Record<string, unknown>[] }).rows ??
            (Array.isArray(statRaw) ? (statRaw as Record<string, unknown>[]) : [statRaw as unknown as Record<string, unknown>]);
          const r = (statRows[0] ?? {}) as Record<string, unknown>;

          if (!partnerekMap.has(par.partner_id)) {
            partnerekMap.set(par.partner_id, {
              partner_id: par.partner_id,
              partner_cegnev: par.partner_cegnev,
              partner_email: par.partner_email,
              projektek: [],
            });
          }

          const rogz = Number(r.jelenlet_rogzitett ?? 0);
          const partnerJ = Number(r.jelenlet_partner ?? 0);
          const beosztott = Number(r.beosztott_7nap ?? 0);
          const szabad = Number(r.szabad_jelenlet_14nap ?? 0);
          let fazis = 'üres';
          if (partnerJ > 0) fazis = 'PV véglegesítésre vár';
          else if (rogz > 0) fazis = 'Partner jóváhagyásra vár';
          else if (beosztott > 0) fazis = 'Beosztás aktív';
          else if (szabad > 0) fazis = 'Beosztás nélküli jelenlét';
          else if (Number(r.muszak_jovobeli ?? 0) > 0) fazis = 'Műszak kiírva';
          else if (Number(r.muszak_piszkozat ?? 0) > 0) fazis = 'Megrendelés piszkozat';

          partnerekMap.get(par.partner_id)!.projektek.push({
            projekt_id: par.projekt_id,
            projekt_azonosito: par.projekt_azonosito,
            projekt_nev: par.projekt_nev,
            muszak_piszkozat: Number(r.muszak_piszkozat ?? 0),
            muszak_jovobeli: Number(r.muszak_jovobeli ?? 0),
            beosztott_7nap: beosztott,
            jelenlet_rogzitett: rogz,
            jelenlet_partner: partnerJ,
            jelenlet_pv: Number(r.jelenlet_pv ?? 0),
            jelenlet_elutasitva: Number(r.jelenlet_elutasitva ?? 0),
            szabad_jelenlet_14nap: szabad,
            fazis,
          });
        }

        return Response.json({
          partnerek: [...partnerekMap.values()],
          count: partnerekMap.size,
        });
      } catch (err) {
        console.error('pv-folyamat hiba:', err);
        return Response.json(
          {
            hiba: 'Folyamat áttekintő betöltése sikertelen',
            reszlet: err instanceof Error ? err.message : String(err),
            partnerek: [],
            count: 0,
          },
          { status: 500 },
        );
      }
    }

    return Response.json({ hiba: 'Ismeretlen nézet' }, { status: 400 });
  }

  if (req.method === 'PATCH') {
    let body: {
      muvelet: 'megrendeles_visszaigazolas' | 'jelenlet_veglegesites' | 'jelenlet_elutasitas';
      muszak_id?: number;
      jelenlet_id?: number;
      indok?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (body.muvelet === 'megrendeles_visszaigazolas') {
      const muszakId = Number(body.muszak_id);
      if (!muszakId) return Response.json({ hiba: 'muszak_id kötelező' }, { status: 400 });

      const [meglevo] = await db.select().from(muszak).where(eq(muszak.id, muszakId));
      if (!meglevo) return Response.json({ hiba: 'Megrendelés nem található' }, { status: 404 });
      const tiltas = await assertProjektHozzaferes(auth, meglevo.projektId);
      if (tiltas) return tiltas;

      const [friss] = await db
        .update(muszak)
        .set({ statusz: 'publikus' })
        .where(and(eq(muszak.id, muszakId), eq(muszak.statusz, 'piszkozat')))
        .returning();

      if (!friss) return Response.json({ hiba: 'Megrendelés nem található vagy már visszaigazolt' }, { status: 404 });
      return Response.json({ ok: true, muszak: friss });
    }

    const jelenletId = Number(body.jelenlet_id);
    if (!jelenletId) return Response.json({ hiba: 'jelenlet_id kötelező' }, { status: 400 });

    const sor = await jelenletSorLekerdezes(jelenletId);
    if (!sor) return Response.json({ hiba: 'Jelenlét nem található' }, { status: 404 });
    const tiltas = await assertProjektHozzaferes(auth, sor.projektId);
    if (tiltas) return tiltas;

    const audit = {
      identityId: auth.identityId,
      szerep: 'pv' as const,
      indok: body.indok,
    };

    if (body.muvelet === 'jelenlet_veglegesites') {
      const friss = await jelenletPvVeglegesites(sor, audit);
      return Response.json({ ok: true, sor: friss });
    }

    if (body.muvelet === 'jelenlet_elutasitas') {
      const friss = await jelenletStatuszValtas(sor, 'elutasítva', audit);
      return Response.json({ ok: true, sor: friss });
    }

    return Response.json({ hiba: 'Ismeretlen művelet' }, { status: 400 });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/pv-munkaterulet',
};
