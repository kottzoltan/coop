import type { Config } from '@netlify/functions';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  beosztas,
  jelenlet,
  munkaHirdetes,
  munkaJelentkezes,
  muszak,
  partnerRegisztracio,
  projekt,
  diakRegisztracio,
} from '../../db/schema.js';
import {
  FOLYAMAT_CSOMOK,
  FOLYAMAT_ELEK,
  TEENDO_TIPUSOK,
  folyamatCsomopontById,
  type FolyamatCsomopontId,
} from '../../shared/src/folyamat-terkep.js';
import { requireBelso } from './lib/auth.js';
import { belsoLathatoProjektIds } from './lib/projekt-scope.js';
import { jelenletListaJoin } from './lib/jelenlet-service.js';

async function countWhere(
  // drizzle select count helper — table + where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: any,
): Promise<number> {
  const [row] = await db.select({ v: count() }).from(table).where(where);
  return Number(row?.v ?? 0);
}

async function folyamatSzamok(lathato: number[] | null): Promise<Record<string, number>> {
  if (lathato !== null && lathato.length === 0) {
    return Object.fromEntries(FOLYAMAT_CSOMOK.map((c) => [c.countKulcs, 0]));
  }

  const scopeJelenlet =
    lathato === null ? undefined : inArray(jelenlet.projektId, lathato);
  const scopeMuszak = lathato === null ? undefined : inArray(muszak.projektId, lathato);

  const jelenletFelt = (statusz: string) =>
    scopeJelenlet ? and(eq(jelenlet.statusz, statusz), scopeJelenlet) : eq(jelenlet.statusz, statusz);

  const [
    jelenlet_rogzitett,
    jelenlet_partner_jovahagyva,
    jelenlet_pv_veglegesitett,
    jelenlet_elutasitva,
    megrendeles_piszkozat,
    muszak_publikus,
    hirdetes_aktiv,
    jelentkezes_kezeletlen,
    jelentkezes_felveve,
  ] = await Promise.all([
    countWhere(jelenlet, jelenletFelt('rögzített')),
    countWhere(jelenlet, jelenletFelt('partner_jóváhagyva')),
    countWhere(jelenlet, jelenletFelt('pv_véglegesített')),
    countWhere(jelenlet, jelenletFelt('elutasítva')),
    countWhere(
      muszak,
      scopeMuszak
        ? and(eq(muszak.statusz, 'piszkozat'), scopeMuszak)
        : eq(muszak.statusz, 'piszkozat'),
    ),
    countWhere(
      muszak,
      scopeMuszak
        ? and(inArray(muszak.statusz, ['publikus', 'zárt']), scopeMuszak)
        : inArray(muszak.statusz, ['publikus', 'zárt']),
    ),
    countWhere(munkaHirdetes, eq(munkaHirdetes.aktiv, true)),
    countWhere(munkaJelentkezes, eq(munkaJelentkezes.statusz, 'Kezeletlen')),
    countWhere(munkaJelentkezes, eq(munkaJelentkezes.statusz, 'Felvéve')),
  ]);

  const szabadFelt =
    scopeJelenlet != null
      ? and(eq(jelenlet.rogzitesMod, 'szabad'), scopeJelenlet)
      : eq(jelenlet.rogzitesMod, 'szabad');
  const jelenlet_szabad = await countWhere(jelenlet, szabadFelt);

  // Aktív beosztás: közelgő (ma+) beosztva státusz, scope-olt műszakon
  const beosztasFeltetelek = [
    eq(beosztas.statusz, 'beosztva'),
    sql`${muszak.datum} >= CURRENT_DATE`,
  ];
  if (lathato !== null) beosztasFeltetelek.push(inArray(muszak.projektId, lathato));

  const [beosztasRow] = await db
    .select({ v: count() })
    .from(beosztas)
    .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
    .where(and(...beosztasFeltetelek));
  const beosztas_aktiv = Number(beosztasRow?.v ?? 0);

  // Check-in ablak: mai nap beosztva (közelítés — UI részletezi az ablakot)
  const checkinFeltetelek = [
    eq(beosztas.statusz, 'beosztva'),
    sql`${muszak.datum} = CURRENT_DATE`,
  ];
  if (lathato !== null) checkinFeltetelek.push(inArray(muszak.projektId, lathato));
  const [checkinRow] = await db
    .select({ v: count() })
    .from(beosztas)
    .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
    .where(and(...checkinFeltetelek));
  const checkin_nyitva = Number(checkinRow?.v ?? 0);

  return {
    megrendeles_piszkozat,
    muszak_publikus,
    beosztas_aktiv,
    checkin_nyitva,
    jelenlet_rogzitett,
    jelenlet_partner_jovahagyva,
    jelenlet_pv_veglegesitett,
    jelenlet_elutasitva,
    jelenlet_szabad,
    hirdetes_aktiv,
    jelentkezes_kezeletlen,
    jelentkezes_felveve,
  };
}

async function csomopontReszlet(
  csomopontId: FolyamatCsomopontId,
  lathato: number[] | null,
): Promise<{
  tipusa: string;
  sorok: Array<Record<string, unknown>>;
  count: number;
}> {
  const limit = 50;

  if (
    csomopontId === 'jelenlet_rogzitett' ||
    csomopontId === 'jelenlet_partner_jovahagyva' ||
    csomopontId === 'jelenlet_pv_veglegesitett' ||
    csomopontId === 'jelenlet_elutasitva' ||
    csomopontId === 'jelenlet_szabad'
  ) {
    const statuszMap: Partial<Record<FolyamatCsomopontId, string>> = {
      jelenlet_rogzitett: 'rögzített',
      jelenlet_partner_jovahagyva: 'partner_jóváhagyva',
      jelenlet_pv_veglegesitett: 'pv_véglegesített',
      jelenlet_elutasitva: 'elutasítva',
    };
    const statusz = statuszMap[csomopontId];
    const rows = await jelenletListaJoin({
      statusz,
      projektIds: lathato,
      limit: csomopontId === 'jelenlet_szabad' ? 200 : limit,
    });
    const filtered =
      csomopontId === 'jelenlet_szabad'
        ? rows.filter((r) => r.jelenlet.rogzitesMod === 'szabad').slice(0, limit)
        : rows;
    return {
      tipusa: 'jelenlet',
      count: filtered.length,
      sorok: filtered.map((r) => ({
        id: r.jelenlet.id,
        diak_nev: r.diak_nev,
        partner_cegnev: r.partner_cegnev,
        projekt_azonosito: r.projekt_azonosito,
        projekt_nev: r.projekt_nev,
        statusz: r.jelenlet.statusz,
        rogzites_mod: r.jelenlet.rogzitesMod,
        muszak_datum: r.muszak_datum_join ?? r.jelenlet.muszakDatum,
        href: '/belso/pv-munkaterulet',
      })),
    };
  }

  if (csomopontId === 'megrendeles_piszkozat' || csomopontId === 'megrendeles_publikus') {
    const statuszok =
      csomopontId === 'megrendeles_piszkozat' ? (['piszkozat'] as const) : (['publikus', 'zárt'] as const);
    const feltetelek = [inArray(muszak.statusz, [...statuszok])];
    if (lathato !== null) {
      if (lathato.length === 0) return { tipusa: 'muszak', sorok: [], count: 0 };
      feltetelek.push(inArray(muszak.projektId, lathato));
    }
    const sorok = await db
      .select({
        id: muszak.id,
        cim: muszak.cim,
        datum: muszak.datum,
        statusz: muszak.statusz,
        projekt_azonosito: projekt.azonosito,
        projekt_nev: projekt.nev,
        partner_cegnev: partnerRegisztracio.cegnev,
      })
      .from(muszak)
      .leftJoin(projekt, eq(muszak.projektId, projekt.id))
      .leftJoin(partnerRegisztracio, eq(muszak.partnerId, partnerRegisztracio.id))
      .where(and(...feltetelek))
      .orderBy(desc(muszak.datum))
      .limit(limit);
    return {
      tipusa: 'muszak',
      count: sorok.length,
      sorok: sorok.map((s) => ({
        ...s,
        href:
          csomopontId === 'megrendeles_piszkozat'
            ? '/belso/pv-munkaterulet'
            : '/belso/beosztas',
      })),
    };
  }

  if (csomopontId === 'beosztas_aktiv' || csomopontId === 'diak_checkin') {
    const feltetelek = [
      eq(beosztas.statusz, 'beosztva'),
      csomopontId === 'diak_checkin'
        ? sql`${muszak.datum} = CURRENT_DATE`
        : sql`${muszak.datum} >= CURRENT_DATE`,
    ];
    if (lathato !== null) {
      if (lathato.length === 0) return { tipusa: 'beosztas', sorok: [], count: 0 };
      feltetelek.push(inArray(muszak.projektId, lathato));
    }
    const sorok = await db
      .select({
        id: beosztas.id,
        diak_nev: diakRegisztracio.nev,
        muszak_cim: muszak.cim,
        muszak_datum: muszak.datum,
        kezdet: muszak.kezdet,
        vege: muszak.vege,
        projekt_azonosito: projekt.azonosito,
        partner_cegnev: partnerRegisztracio.cegnev,
      })
      .from(beosztas)
      .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
      .innerJoin(diakRegisztracio, eq(beosztas.diakId, diakRegisztracio.id))
      .leftJoin(projekt, eq(muszak.projektId, projekt.id))
      .leftJoin(partnerRegisztracio, eq(muszak.partnerId, partnerRegisztracio.id))
      .where(and(...feltetelek))
      .orderBy(desc(muszak.datum))
      .limit(limit);
    return {
      tipusa: 'beosztas',
      count: sorok.length,
      sorok: sorok.map((s) => ({
        ...s,
        href: csomopontId === 'diak_checkin' ? '/diak/beosztas' : '/belso/beosztas',
      })),
    };
  }

  if (csomopontId === 'hirdetes_aktiv') {
    const sorok = await db
      .select({
        id: munkaHirdetes.id,
        cim: munkaHirdetes.cim,
        varos: munkaHirdetes.varos,
        partner: munkaHirdetes.partner,
        aktiv: munkaHirdetes.aktiv,
      })
      .from(munkaHirdetes)
      .where(eq(munkaHirdetes.aktiv, true))
      .orderBy(desc(munkaHirdetes.letrehozva))
      .limit(limit);
    return {
      tipusa: 'hirdetes',
      count: sorok.length,
      sorok: sorok.map((s) => ({ ...s, href: `/belso/toborzas/hirdetesek/${s.id}` })),
    };
  }

  if (csomopontId === 'jelentkezes_kezeletlen' || csomopontId === 'jelentkezes_felveve') {
    const statusz = csomopontId === 'jelentkezes_felveve' ? 'Felvéve' : 'Kezeletlen';
    const sorok = await db
      .select({
        id: munkaJelentkezes.id,
        nev: munkaJelentkezes.nev,
        email: munkaJelentkezes.email,
        statusz: munkaJelentkezes.statusz,
        hirdetes_cim: munkaHirdetes.cim,
      })
      .from(munkaJelentkezes)
      .leftJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
      .where(eq(munkaJelentkezes.statusz, statusz))
      .orderBy(desc(munkaJelentkezes.letrehozva))
      .limit(limit);
    return {
      tipusa: 'jelentkezes',
      count: sorok.length,
      sorok: sorok.map((s) => ({
        ...s,
        href: `/belso/toborzas/jelentkezesek/${s.id}`,
      })),
    };
  }

  return { tipusa: 'ismeretlen', sorok: [], count: 0 };
}

export default async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = await requireBelso('beosztas', 'olvasas');
  if (auth instanceof Response) return auth;

  const lathato = await belsoLathatoProjektIds(auth);
  const url = new URL(req.url);
  const csomopontParam = url.searchParams.get('csomopont');

  try {
    if (csomopontParam) {
      const meta = folyamatCsomopontById(csomopontParam);
      if (!meta) {
        return Response.json({ hiba: 'Ismeretlen csomópont' }, { status: 400 });
      }
      const reszlet = await csomopontReszlet(csomopontParam as FolyamatCsomopontId, lathato);
      return Response.json({
        csomopont: meta,
        ...reszlet,
      });
    }

    const szamok = await folyamatSzamok(lathato);

    const csomok = FOLYAMAT_CSOMOK.map((c) => ({
      ...c,
      count: Number(szamok[c.countKulcs] ?? 0),
    }));

    const teendok = TEENDO_TIPUSOK.filter((t) => t.szerep === 'pv')
      .map((t) => ({
        id: t.id,
        cim: t.cim,
        db: Number(szamok[t.countKulcs] ?? 0),
        href: t.href,
        szerep: t.szerep,
        tabHint: t.tabHint,
      }))
      .filter((t) => t.db > 0);

    return Response.json({
      csomok,
      elek: FOLYAMAT_ELEK,
      szamok,
      teendok,
    });
  } catch (err) {
    console.error('folyamat-terkep hiba:', err);
    return Response.json(
      {
        hiba: 'Folyamat-térkép betöltése sikertelen',
        reszlet: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: '/api/folyamat-terkep',
};
