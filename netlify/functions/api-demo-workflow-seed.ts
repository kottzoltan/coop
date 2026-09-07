import type { Config } from '@netlify/functions';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  beosztas,
  beosztasCsoport,
  jelenlet,
  muszak,
  projekt,
} from '../../db/schema.js';
import { demoDiakFiok, demoPartnerFiok } from './lib/demo-seed-users.js';
import { envGet } from './lib/netlify-env.js';

/** Partner belépés min. 8 karaktert vár — egységes demo jelszó */
const DEMO_JELSZO = 'Teszt123!';

const PARTNER_FIOKOK = [
  {
    email: 'partner.auchan@melodiak.hu',
    nev: 'Nagy Éva',
    cegnev: 'Auchan Magyarország Kft. (demo)',
    adoszam: '11111111-2-41',
    telefon: '+36 30 111 1111',
    projektAzon: 'B09450',
    hely: 'Budapest Soroksár',
    helyLat: '47.3975',
    helyLng: '19.1205',
    scenario: 'beosztas_es_diak_jelenlet',
  },
  {
    email: 'partner.greenpark@melodiak.hu',
    nev: 'Kornya József',
    cegnev: 'GreenPark Kft. (demo)',
    adoszam: '12345678-2-41',
    telefon: '+36 30 555 1234',
    projektAzon: 'B0510001',
    hely: 'Budapest Expo tér',
    helyLat: '47.4729',
    helyLng: '19.0490',
    scenario: 'beosztas_ma_gps',
  },
  {
    email: 'partner.biatorbagy@melodiak.hu',
    nev: 'Szabó Petra',
    cegnev: 'LogiLabel Kft. (demo)',
    adoszam: '22222222-2-13',
    telefon: '+36 70 222 2222',
    projektAzon: 'B0472100',
    hely: 'Biatorbágy Iparos u.',
    helyLat: '47.4667',
    helyLng: '18.8167',
    scenario: 'nincs_beosztas_szabad_jelenlet',
  },
] as const;

const DIAK_FIOKOK = [
  { email: 'diak.anna@melodiak.hu', nev: 'Teszt Anna', telefon: '+36 20 100 0001' },
  { email: 'diak.balazs@melodiak.hu', nev: 'Teszt Balázs', telefon: '+36 20 100 0002' },
  { email: 'diak.csilla@melodiak.hu', nev: 'Teszt Csilla', telefon: '+36 20 100 0003' },
  { email: 'diak.david@melodiak.hu', nev: 'Teszt Dávid', telefon: '+36 20 100 0004' },
  { email: 'diak.emese@melodiak.hu', nev: 'Teszt Emese', telefon: '+36 20 100 0005' },
  { email: 'diak.ferenc@melodiak.hu', nev: 'Teszt Ferenc', telefon: '+36 20 100 0006' },
] as const;

function seedKulcsOk(req: Request): boolean {
  const expected = envGet('ICE_DEMO_SEED_KEY') ?? 'ice-demo-pv-2026';
  const header = req.headers.get('x-ice-demo-seed') ?? '';
  return header === expected;
}

function maIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function napOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function mostKezdetVege(): { kezdet: string; vege: string } {
  const now = new Date();
  const h = now.getHours();
  const kezdetH = Math.max(0, h - 1);
  const vegeH = Math.min(23, h + 3);
  return {
    kezdet: `${String(kezdetH).padStart(2, '0')}:00`,
    vege: `${String(vegeH).padStart(2, '0')}:00`,
  };
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!seedKulcsOk(req)) {
    return Response.json({ hiba: 'Hiányzó vagy hibás seed kulcs (x-ice-demo-seed).' }, { status: 403 });
  }

  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ok */
  }
  const password = String(body.password ?? DEMO_JELSZO);
  if (password.length < 8) {
    return Response.json({ hiba: 'A demo jelszó legalább 8 karakter legyen (partner belépés miatt).' }, { status: 400 });
  }

  try {
    const projektek = await db
      .select({ id: projekt.id, azonosito: projekt.azonosito, nev: projekt.nev })
      .from(projekt)
      .where(inArray(projekt.azonosito, PARTNER_FIOKOK.map((p) => p.projektAzon)));
    const azonMap = new Map(projektek.map((p) => [p.azonosito, p]));

    const partnerek = [];
    for (const p of PARTNER_FIOKOK) {
      const fiok = await demoPartnerFiok({
        email: p.email,
        password,
        nev: p.nev,
        cegnev: p.cegnev,
        adoszam: p.adoszam,
        telefon: p.telefon,
      });
      partnerek.push({ ...fiok, ...p, projekt: azonMap.get(p.projektAzon) ?? null });
    }

    const diakok = [];
    for (const d of DIAK_FIOKOK) {
      const fiok = await demoDiakFiok({
        email: d.email,
        password,
        nev: d.nev,
        telefon: d.telefon,
        iroda: 'Budapest',
      });
      diakok.push(fiok);
    }

    const forgatokonyv: Array<Record<string, unknown>> = [];
    const { kezdet: maKezdet, vege: maVege } = mostKezdetVege();

    // --- Scenario A: Auchan — beosztás + diák rögzített jelenlét (partner jóváhagyásra vár) ---
    {
      const p = partnerek.find((x) => x.scenario === 'beosztas_es_diak_jelenlet')!;
      const proj = p.projekt;
      if (proj) {
        let [csoport] = await db
          .select()
          .from(beosztasCsoport)
          .where(
            and(eq(beosztasCsoport.projektId, proj.id), eq(beosztasCsoport.partnerId, p.partnerRegisztracioId)),
          )
          .limit(1);
        if (!csoport) {
          [csoport] = await db
            .insert(beosztasCsoport)
            .values({
              nev: `${proj.azonosito} — demo beosztás`,
              projektId: proj.id,
              partnerId: p.partnerRegisztracioId,
              statusz: 'aktív',
              leiras: 'Demo: partner adott beosztást, diák rögzített jelenlétet',
            })
            .returning();
        }

        const tegnap = napOffset(-1);
        let [mTegnap] = await db
          .select()
          .from(muszak)
          .where(
            and(
              eq(muszak.projektId, proj.id),
              eq(muszak.partnerId, p.partnerRegisztracioId),
              eq(muszak.datum, tegnap),
              eq(muszak.cim, 'Raktári segéd — demo tegnap'),
            ),
          )
          .limit(1);
        if (!mTegnap) {
          [mTegnap] = await db
            .insert(muszak)
            .values({
              projektId: proj.id,
              beosztasCsoportId: csoport.id,
              partnerId: p.partnerRegisztracioId,
              cim: 'Raktári segéd — demo tegnap',
              hely: p.hely,
              helyLat: p.helyLat,
              helyLng: p.helyLng,
              gpsSugarM: 400,
              datum: tegnap,
              kezdet: '08:00',
              vege: '16:00',
              letszamMegrendelt: 3,
              munkakor: 'Raktári',
              statusz: 'lezárt',
              leiras: 'Demo: diák jelenlét partner jóváhagyásra',
            })
            .returning();
        } else {
          await db
            .update(muszak)
            .set({ helyLat: p.helyLat, helyLng: p.helyLng, gpsSugarM: 400, partnerId: p.partnerRegisztracioId })
            .where(eq(muszak.id, mTegnap.id));
        }

        const diakA = [diakok[0], diakok[1], diakok[2]];
        for (const d of diakA) {
          let [b] = await db
            .select()
            .from(beosztas)
            .where(and(eq(beosztas.muszakId, mTegnap.id), eq(beosztas.diakId, d.diakId)))
            .limit(1);
          if (!b) {
            [b] = await db
              .insert(beosztas)
              .values({ muszakId: mTegnap.id, diakId: d.diakId, statusz: 'beosztva' })
              .returning();
          }
          const [j] = await db
            .select()
            .from(jelenlet)
            .where(eq(jelenlet.beosztasId, b.id))
            .limit(1);
          if (!j) {
            await db.insert(jelenlet).values({
              beosztasId: b.id,
              diakId: d.diakId,
              projektId: proj.id,
              muszakDatum: tegnap,
              partnerId: p.partnerRegisztracioId,
              erkezes: new Date(`${tegnap}T08:05:00`),
              tavozas: new Date(`${tegnap}T15:55:00`),
              statusz: 'rögzített',
              forras: 'diak',
              rogzitesMod: 'beosztas',
              gpsLat: p.helyLat,
              gpsLng: p.helyLng,
              megjegyzes: 'Demo: diák rögzítette, partner jóváhagyásra vár',
            });
          }
        }

        // Mai műszak GPS teszthez (nyitott időablak)
        let [mMa] = await db
          .select()
          .from(muszak)
          .where(
            and(
              eq(muszak.projektId, proj.id),
              eq(muszak.partnerId, p.partnerRegisztracioId),
              eq(muszak.datum, maIso()),
              eq(muszak.cim, 'Raktári segéd — demo ma'),
            ),
          )
          .limit(1);
        if (!mMa) {
          [mMa] = await db
            .insert(muszak)
            .values({
              projektId: proj.id,
              beosztasCsoportId: csoport.id,
              partnerId: p.partnerRegisztracioId,
              cim: 'Raktári segéd — demo ma',
              hely: p.hely,
              helyLat: p.helyLat,
              helyLng: p.helyLng,
              gpsSugarM: 400,
              datum: maIso(),
              kezdet: maKezdet,
              vege: maVege,
              letszamMegrendelt: 2,
              munkakor: 'Raktári',
              statusz: 'publikus',
              leiras: 'Demo: mai műszak — időablak + GPS check-in',
            })
            .returning();
        } else {
          await db
            .update(muszak)
            .set({
              kezdet: maKezdet,
              vege: maVege,
              helyLat: p.helyLat,
              helyLng: p.helyLng,
              gpsSugarM: 400,
            })
            .where(eq(muszak.id, mMa.id));
        }
        for (const d of [diakok[0], diakok[1]]) {
          const [meglevo] = await db
            .select()
            .from(beosztas)
            .where(and(eq(beosztas.muszakId, mMa.id), eq(beosztas.diakId, d.diakId)))
            .limit(1);
          if (!meglevo) {
            await db.insert(beosztas).values({ muszakId: mMa.id, diakId: d.diakId, statusz: 'beosztva' });
          }
        }

        forgatokonyv.push({
          partner: p.email,
          projekt: proj.azonosito,
          allapot: 'Partner adott beosztást; tegnapi jelenlétek diák által rögzítve (partner jóváhagyásra vár); mai műszak GPS/időablak teszthez',
          muszak_tegnap_id: mTegnap.id,
          muszak_ma_id: mMa.id,
        });
      }
    }

    // --- Scenario B: GreenPark — mai beosztás GPS-sel ---
    {
      const p = partnerek.find((x) => x.scenario === 'beosztas_ma_gps')!;
      const proj = p.projekt;
      if (proj) {
        let [csoport] = await db
          .select()
          .from(beosztasCsoport)
          .where(eq(beosztasCsoport.projektId, proj.id))
          .limit(1);
        if (!csoport) {
          [csoport] = await db
            .insert(beosztasCsoport)
            .values({
              nev: 'Kertész gyakornok — demo',
              projektId: proj.id,
              partnerId: p.partnerRegisztracioId,
              statusz: 'aktív',
            })
            .returning();
        } else {
          await db
            .update(beosztasCsoport)
            .set({ partnerId: p.partnerRegisztracioId })
            .where(eq(beosztasCsoport.id, csoport.id));
        }

        await db
          .update(muszak)
          .set({
            partnerId: p.partnerRegisztracioId,
            helyLat: p.helyLat,
            helyLng: p.helyLng,
            gpsSugarM: 350,
          })
          .where(eq(muszak.projektId, proj.id));

        let [mMa] = await db
          .select()
          .from(muszak)
          .where(
            and(eq(muszak.projektId, proj.id), eq(muszak.datum, maIso()), eq(muszak.cim, 'Kertész — demo ma GPS')),
          )
          .limit(1);
        if (!mMa) {
          [mMa] = await db
            .insert(muszak)
            .values({
              projektId: proj.id,
              beosztasCsoportId: csoport.id,
              partnerId: p.partnerRegisztracioId,
              cim: 'Kertész — demo ma GPS',
              hely: p.hely,
              helyLat: p.helyLat,
              helyLng: p.helyLng,
              gpsSugarM: 350,
              datum: maIso(),
              kezdet: maKezdet,
              vege: maVege,
              letszamMegrendelt: 2,
              munkakor: 'Kertész',
              statusz: 'publikus',
            })
            .returning();
        } else {
          await db
            .update(muszak)
            .set({ kezdet: maKezdet, vege: maVege, helyLat: p.helyLat, helyLng: p.helyLng })
            .where(eq(muszak.id, mMa.id));
        }

        for (const d of [diakok[2], diakok[3]]) {
          const [meglevo] = await db
            .select()
            .from(beosztas)
            .where(and(eq(beosztas.muszakId, mMa.id), eq(beosztas.diakId, d.diakId)))
            .limit(1);
          if (!meglevo) {
            await db.insert(beosztas).values({ muszakId: mMa.id, diakId: d.diakId, statusz: 'beosztva' });
          }
        }

        forgatokonyv.push({
          partner: p.email,
          projekt: proj.azonosito,
          allapot: 'Partner beosztás van (mai műszak GPS kötelező); még nincs diák check-in',
          muszak_ma_id: mMa.id,
        });
      }
    }

    // --- Scenario C: LogiLabel — nincs beosztás, partner szabad jelenlét ---
    {
      const p = partnerek.find((x) => x.scenario === 'nincs_beosztas_szabad_jelenlet')!;
      const proj = p.projekt;
      if (proj) {
        const d = diakok[4];
        const datum = napOffset(-1);
        const [meglevo] = await db
          .select()
          .from(jelenlet)
          .where(
            and(
              eq(jelenlet.diakId, d.diakId),
              eq(jelenlet.projektId, proj.id),
              eq(jelenlet.muszakDatum, datum),
              eq(jelenlet.rogzitesMod, 'szabad'),
            ),
          )
          .limit(1);
        if (!meglevo) {
          await db.insert(jelenlet).values({
            diakId: d.diakId,
            projektId: proj.id,
            muszakDatum: datum,
            partnerId: p.partnerRegisztracioId,
            erkezes: new Date(`${datum}T07:00:00`),
            tavozas: new Date(`${datum}T15:00:00`),
            statusz: 'partner_jóváhagyva',
            forras: 'partner',
            rogzitesMod: 'szabad',
            megjegyzes: 'Demo: beosztás nélkül, partner rögzítette és jóváhagyta — PV-re vár',
          });
        }

        // Másik diák: csak rögzített, partner még nem hagyta jóvá
        const d2 = diakok[5];
        const [meglevo2] = await db
          .select()
          .from(jelenlet)
          .where(
            and(
              eq(jelenlet.diakId, d2.diakId),
              eq(jelenlet.projektId, proj.id),
              eq(jelenlet.muszakDatum, datum),
              eq(jelenlet.forras, 'partner'),
            ),
          )
          .limit(1);
        if (!meglevo2) {
          await db.insert(jelenlet).values({
            diakId: d2.diakId,
            projektId: proj.id,
            muszakDatum: datum,
            partnerId: p.partnerRegisztracioId,
            erkezes: new Date(`${datum}T08:00:00`),
            tavozas: new Date(`${datum}T14:00:00`),
            statusz: 'rögzített',
            forras: 'partner',
            rogzitesMod: 'szabad',
            megjegyzes: 'Demo: nincs beosztás — partner rögzítette, még nem hagyta jóvá',
          });
        }

        forgatokonyv.push({
          partner: p.email,
          projekt: proj.azonosito,
          allapot: 'Nincs beosztás; partner szabad jelenlétek (1× partner_jóváhagyva → PV, 1× rögzített)',
        });
      }
    }

    // Összesítő számok
    const osszRaw = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM partner_regisztracio WHERE email LIKE '%@melodiak.hu' AND statusz = 'jóváhagyva') AS partnerek,
        (SELECT count(*)::int FROM diak_regisztracio WHERE email LIKE 'diak.%@melodiak.hu') AS diakok,
        (SELECT count(*)::int FROM jelenlet WHERE statusz = 'rögzített') AS jelenlet_rogzitett,
        (SELECT count(*)::int FROM jelenlet WHERE statusz = 'partner_jóváhagyva') AS jelenlet_partner,
        (SELECT count(*)::int FROM jelenlet WHERE statusz = 'pv_véglegesített') AS jelenlet_pv
    `);
    const osszRows = (osszRaw as { rows?: Record<string, number>[] }).rows ??
      (Array.isArray(osszRaw) ? (osszRaw as Record<string, number>[]) : [osszRaw as unknown as Record<string, number>]);

    return Response.json({
      ok: true,
      jelszo: password,
      belpes: {
        partner: 'https://ice89.netlify.app/partner/belepes',
        diak: 'https://ice89.netlify.app/diak/belepes',
        belso_pv: 'https://ice89.netlify.app/belso/belepes',
        folyamat: 'https://ice89.netlify.app/belso/pv-munkaterulet',
      },
      partnerek: partnerek.map((p) => ({
        email: p.email,
        nev: p.nev,
        cegnev: p.cegnev,
        projekt: p.projektAzon,
        scenario: p.scenario,
        jelszo: password,
      })),
      diakok: diakok.map((d) => ({ email: d.email, diakId: d.diakId, jelszo: password })),
      forgatokonyv,
      osszesito: osszRows[0] ?? {},
      megjegyzes:
        'Három partner-forgatókönyv: (1) beosztás + diák jelenlét, (2) mai GPS műszak, (3) beosztás nélküli szabad jelenlét. PV: /belso/pv-munkaterulet → Folyamat kontroll.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Seed sikertelen';
    console.error('demo-workflow-seed', err);
    return Response.json({ hiba: msg }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/demo-workflow-seed',
};
