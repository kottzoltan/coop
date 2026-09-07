import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { beosztas, jelenlet, muszak } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireBelso, requireDiak } from './lib/auth.js';
import { getPartnerContext, partnerIrasSzukseges } from './lib/partner-auth.js';
import {
  jelenletAuditNaplo,
  jelenletListaJoin,
  jelenletMezoFrissites,
  jelenletPartnerJovahagyas,
  jelenletPvVeglegesites,
  jelenletRogzites,
  jelenletSorLekerdezes,
  jelenletStatuszValtas,
} from './lib/jelenlet-service.js';
import {
  jelenletStatuszNormalizalas,
  type JelenletStatusz,
} from '../../shared/src/jelenlet-workflow.js';
import { jelenletCheckinEllenorzes } from '../../shared/src/jelenlet-checkin.js';
import { assertProjektHozzaferes, belsoLathatoProjektIds } from './lib/projekt-scope.js';

function formatIdo(iso: string | Date | null | undefined): string | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toTimeString().slice(0, 5);
}

function sorFormazas(row: Awaited<ReturnType<typeof jelenletListaJoin>>[number]) {
  const datum =
    row.muszak_datum_join ??
    (row.jelenlet.muszakDatum ? String(row.jelenlet.muszakDatum) : '');
  const cim =
    row.muszak_cim ??
    (row.jelenlet.rogzitesMod === 'szabad' ? 'Szabad rögzítés' : 'Jelenléti ív');

  return {
    jelenlet: row.jelenlet,
    beosztas: row.jelenlet.beosztasId ? { id: row.jelenlet.beosztasId, statusz: 'beosztva' } : undefined,
    muszak: {
      cim,
      datum,
      kezdet: formatIdo(row.jelenlet.erkezes) ?? '—',
      vege: formatIdo(row.jelenlet.tavozas) ?? '—',
    },
    diak_nev: row.diak_nev,
    projekt_azonosito: row.projekt_azonosito,
    projekt_nev: row.projekt_nev,
    partner_cegnev: row.partner_cegnev,
  };
}

function statuszNormalizalas(statusz?: string): JelenletStatusz | 'elutasítva' | undefined {
  if (!statusz) return undefined;
  if (statusz === 'jóváhagyva') return 'partner_jóváhagyva';
  if (statusz === 'elutasítva') return 'elutasítva';
  return jelenletStatuszNormalizalas(statusz);
}

async function qrJelenlet(beosztasId: number, tipus: 'qr_erkezes' | 'qr_tavozas') {
  const [b] = await db
    .select({ beosztas: beosztas, muszak: muszak })
    .from(beosztas)
    .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
    .where(eq(beosztas.id, beosztasId));

  if (!b) return Response.json({ hiba: 'Beosztás nem található' }, { status: 404 });

  const now = new Date();
  const [meglevo] = await db
    .select()
    .from(jelenlet)
    .where(eq(jelenlet.beosztasId, beosztasId))
    .orderBy(desc(jelenlet.letrehozva))
    .limit(1);

  if (tipus === 'qr_erkezes') {
    if (meglevo && !meglevo.tavozas) {
      const [sor] = await db
        .update(jelenlet)
        .set({
          qrErkezes: now,
          erkezes: meglevo.erkezes ?? now,
          statusz: 'rögzített',
        })
        .where(eq(jelenlet.id, meglevo.id))
        .returning();
      return Response.json({ ok: true, sor }, { status: 200 });
    }

    const [sor] = await db
      .insert(jelenlet)
      .values({
        beosztasId,
        diakId: b.beosztas.diakId,
        projektId: b.muszak.projektId,
        muszakDatum: b.muszak.datum,
        partnerId: b.muszak.partnerId,
        erkezes: now,
        qrErkezes: now,
        statusz: 'rögzített',
        forras: 'qr',
        rogzitesMod: 'beosztas',
        megjegyzes: 'QR check-in',
      })
      .returning();

    return Response.json({ ok: true, sor }, { status: 201 });
  }

  if (!meglevo) {
    return Response.json({ hiba: 'Nincs nyitott jelenlét ehhez a beosztáshoz' }, { status: 400 });
  }

  const ujStatusz =
    jelenletStatuszNormalizalas(meglevo.statusz) === 'pv_véglegesített'
      ? 'pv_véglegesített'
      : 'rögzített';

  const [sor] = await db
    .update(jelenlet)
    .set({ qrTavozas: now, tavozas: now, statusz: ujStatusz })
    .where(eq(jelenlet.id, meglevo.id))
    .returning();

  return Response.json({ ok: true, sor });
}

async function partnerJogosult(jelenletId: number, partnerId: number) {
  const sor = await jelenletSorLekerdezes(jelenletId);
  if (!sor) return null;
  if (sor.partnerId === partnerId) return sor;

  if (sor.beosztasId) {
    const [row] = await db
      .select({ muszak: muszak })
      .from(beosztas)
      .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
      .where(eq(beosztas.id, sor.beosztasId));
    if (row?.muszak.partnerId === partnerId) return sor;
  }

  return null;
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auditId = url.searchParams.get('audit_jelenlet_id');
    if (auditId) {
      const auth = await requireBelso('beosztas', 'olvasas');
      if (auth instanceof Response) return auth;
      const naplo = await jelenletAuditNaplo(Number(auditId));
      return Response.json({ naplo });
    }

    const partner = url.searchParams.get('partner') === '1';
    const belso = url.searchParams.get('belso') === '1';

    if (belso) {
      const auth = await requireBelso('beosztas', 'olvasas');
      if (auth instanceof Response) return auth;

      const lathato = await belsoLathatoProjektIds(auth);
      const rows = await jelenletListaJoin({
        statusz: url.searchParams.get('statusz') ?? undefined,
        projektId: url.searchParams.get('projekt_id')
          ? Number(url.searchParams.get('projekt_id'))
          : undefined,
        projektIds: lathato ?? undefined,
      });

      const sorok = rows.map(sorFormazas);
      return Response.json({ sorok, count: sorok.length });
    }

    if (partner) {
      const ctx = await getPartnerContext();
      if (ctx instanceof Response) return ctx;

      const rows = await jelenletListaJoin({
        statusz: url.searchParams.get('statusz') ?? undefined,
        partnerId: ctx.partnerId,
      });

      const sorok = rows.map(sorFormazas);
      return Response.json({ sorok, count: sorok.length, demo: ctx.demo });
    }

    return Response.json({ hiba: 'Hiányzó paraméter' }, { status: 400 });
  }

  if (req.method === 'POST') {
    if (url.searchParams.get('belso') === '1') {
      const auth = await requireBelso('beosztas', 'iras');
      if (auth instanceof Response) return auth;

      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
      }

      if (body.tipus === 'qr_erkezes' || body.tipus === 'qr_tavozas') {
        const beosztasId = Number(body.beosztas_id);
        if (!beosztasId) {
          return Response.json({ hiba: 'beosztas_id kötelező' }, { status: 400 });
        }
        return qrJelenlet(beosztasId, body.tipus as 'qr_erkezes' | 'qr_tavozas');
      }

      if (body.muvelet === 'rogzites') {
        const projektId = body.projekt_id ? Number(body.projekt_id) : null;
        const tiltas = await assertProjektHozzaferes(auth, projektId);
        if (tiltas) return tiltas;

        const sor = await jelenletRogzites({
          diakId: Number(body.diak_id),
          beosztasId: body.beosztas_id ? Number(body.beosztas_id) : null,
          projektId,
          muszakDatum: body.muszak_datum ? String(body.muszak_datum) : null,
          partnerId: body.partner_id ? Number(body.partner_id) : null,
          erkezes: body.erkezes ? new Date(String(body.erkezes)) : null,
          tavozas: body.tavozas ? new Date(String(body.tavozas)) : null,
          megjegyzes: body.megjegyzes ? String(body.megjegyzes) : null,
          forras: 'pv',
          rogzitesMod: body.beosztas_id ? 'beosztas' : 'szabad',
          identityId: auth.identityId,
        });
        return Response.json({ ok: true, sor }, { status: 201 });
      }

      return Response.json({ hiba: 'Ismeretlen művelet' }, { status: 400 });
    }

    if (url.searchParams.get('partner') === '1') {
      const ctx = await getPartnerContext();
      if (ctx instanceof Response) return ctx;
      const irasHiba = partnerIrasSzukseges(ctx);
      if (irasHiba) return irasHiba;

      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
      }

      const sor = await jelenletRogzites({
        diakId: Number(body.diak_id),
        projektId: body.projekt_id ? Number(body.projekt_id) : null,
        muszakDatum: body.muszak_datum ? String(body.muszak_datum) : null,
        partnerId: ctx.partnerId,
        erkezes: body.erkezes ? new Date(String(body.erkezes)) : null,
        tavozas: body.tavozas ? new Date(String(body.tavozas)) : null,
        megjegyzes: body.megjegyzes ? String(body.megjegyzes) : null,
        forras: 'partner',
        rogzitesMod: 'szabad',
        identityId: undefined,
      });

      return Response.json({ ok: true, sor }, { status: 201 });
    }

    const auth = await requireDiak();
    if (auth instanceof Response) return auth;

    let body: { beosztas_id: number; tipus: 'erkezes' | 'tavozas'; gps_lat?: string; gps_lng?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const [b] = await db
      .select({ beosztas: beosztas, muszak: muszak })
      .from(beosztas)
      .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
      .where(eq(beosztas.id, body.beosztas_id));

    if (!b || b.beosztas.diakId !== auth.diakId) {
      return Response.json({ hiba: 'Beosztás nem található' }, { status: 404 });
    }

    const ellenorzes = jelenletCheckinEllenorzes(
      {
        datum: String(b.muszak.datum).slice(0, 10),
        kezdet: b.muszak.kezdet,
        vege: b.muszak.vege,
        helyLat: b.muszak.helyLat,
        helyLng: b.muszak.helyLng,
        gpsSugarM: b.muszak.gpsSugarM,
      },
      body.tipus,
      { lat: body.gps_lat, lng: body.gps_lng },
    );
    if (!ellenorzes.ok) {
      return Response.json(
        {
          hiba: ellenorzes.hibak[0] ?? 'Jelenlét rögzítése nem engedélyezett',
          hibak: ellenorzes.hibak,
          ido_ablak: {
            nyitas: ellenorzes.ido.nyitas.toISOString(),
            zaras: ellenorzes.ido.zaras.toISOString(),
          },
          gps: ellenorzes.gps,
        },
        { status: 422 },
      );
    }

    const meglevok = await db
      .select()
      .from(jelenlet)
      .where(eq(jelenlet.beosztasId, body.beosztas_id))
      .limit(1);

    const now = new Date();

    if (meglevok[0]) {
      const sor = meglevok[0];
      if (body.tipus === 'erkezes' && sor.erkezes) {
        return Response.json({ hiba: 'Érkezés már rögzítve van ehhez a műszakhoz' }, { status: 409 });
      }
      if (body.tipus === 'tavozas' && !sor.erkezes) {
        return Response.json({ hiba: 'Először az érkezést kell rögzíteni' }, { status: 400 });
      }
      if (body.tipus === 'tavozas' && sor.tavozas) {
        return Response.json({ hiba: 'Távozás már rögzítve van' }, { status: 409 });
      }

      const [friss] = await db
        .update(jelenlet)
        .set({
          ...(body.tipus === 'erkezes'
            ? { erkezes: now, gpsLat: body.gps_lat ?? sor.gpsLat, gpsLng: body.gps_lng ?? sor.gpsLng }
            : { tavozas: now, gpsLat: body.gps_lat ?? sor.gpsLat, gpsLng: body.gps_lng ?? sor.gpsLng }),
        })
        .where(eq(jelenlet.id, sor.id))
        .returning();

      return Response.json({
        ok: true,
        sor: friss,
        gps_tavolsag_m: ellenorzes.gps.tavolsagM ?? null,
      });
    }

    if (body.tipus === 'tavozas') {
      return Response.json({ hiba: 'Először az érkezést kell rögzíteni' }, { status: 400 });
    }

    const [sor] = await db
      .insert(jelenlet)
      .values({
        beosztasId: body.beosztas_id,
        diakId: auth.diakId!,
        projektId: b.muszak.projektId,
        muszakDatum: b.muszak.datum,
        partnerId: b.muszak.partnerId,
        erkezes: now,
        tavozas: null,
        gpsLat: body.gps_lat ?? null,
        gpsLng: body.gps_lng ?? null,
        statusz: 'rögzített',
        forras: 'diak',
        rogzitesMod: 'beosztas',
      })
      .returning();

    return Response.json({
      ok: true,
      sor,
      gps_tavolsag_m: ellenorzes.gps.tavolsagM ?? null,
    });
  }

  if (req.method === 'PATCH') {
    const belso = url.searchParams.get('belso') === '1';

    let body: {
      id: number;
      statusz?: string;
      erkezes?: string | null;
      tavozas?: string | null;
      megjegyzes?: string | null;
      indok?: string | null;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.id) return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });

    const sor = await jelenletSorLekerdezes(body.id);
    if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });

    const patchIdo = {
      erkezes: body.erkezes !== undefined ? (body.erkezes ? new Date(body.erkezes) : null) : undefined,
      tavozas: body.tavozas !== undefined ? (body.tavozas ? new Date(body.tavozas) : null) : undefined,
      megjegyzes: body.megjegyzes,
    };

    if (belso) {
      const auth = await requireBelso('beosztas', 'iras');
      if (auth instanceof Response) return auth;

      const tiltas = await assertProjektHozzaferes(auth, sor.projektId);
      if (tiltas) return tiltas;

      const audit = {
        identityId: auth.identityId,
        szerep: 'pv' as const,
        indok: body.indok ?? undefined,
      };

      const ujStatusz = statuszNormalizalas(body.statusz);
      let friss = sor;

      if (patchIdo.erkezes !== undefined || patchIdo.tavozas !== undefined || patchIdo.megjegyzes !== undefined) {
        friss = await jelenletMezoFrissites(
          friss,
          {
            erkezes: patchIdo.erkezes,
            tavozas: patchIdo.tavozas,
            megjegyzes: patchIdo.megjegyzes,
          },
          audit,
        );
      }

      if (ujStatusz === 'pv_véglegesített') {
        friss = await jelenletPvVeglegesites(friss, audit);
      } else if (ujStatusz === 'elutasítva') {
        friss = await jelenletStatuszValtas(friss, 'elutasítva', audit);
      } else if (ujStatusz === 'rögzített' || ujStatusz === 'partner_jóváhagyva') {
        friss = await jelenletStatuszValtas(friss, ujStatusz, audit);
      }

      return Response.json({ ok: true, sor: friss });
    }

    const ctx = await getPartnerContext();
    if (ctx instanceof Response) return ctx;

    const jogosult = await partnerJogosult(body.id, ctx.partnerId);
    if (!jogosult) return Response.json({ hiba: 'Nem található' }, { status: 404 });

    const irasHiba = partnerIrasSzukseges(ctx);
    if (irasHiba && body.statusz) return irasHiba;

    const audit = { szerep: 'partner' as const, indok: body.indok ?? undefined };
    let friss = jogosult;
    const ujStatusz = statuszNormalizalas(body.statusz);

    if (patchIdo.erkezes !== undefined || patchIdo.tavozas !== undefined || patchIdo.megjegyzes !== undefined) {
      friss = await jelenletMezoFrissites(
        friss,
        {
          erkezes: patchIdo.erkezes,
          tavozas: patchIdo.tavozas,
          megjegyzes: patchIdo.megjegyzes,
        },
        audit,
      );
    }

    if (ujStatusz === 'partner_jóváhagyva') {
      friss = await jelenletPartnerJovahagyas(friss, audit);
    } else if (ujStatusz === 'elutasítva') {
      friss = await jelenletStatuszValtas(friss, 'elutasítva', audit);
    }

    return Response.json({ ok: true, sor: friss });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/jelenlet',
};
