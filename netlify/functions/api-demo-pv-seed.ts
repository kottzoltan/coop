import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { projekt } from '../../db/schema.js';
import { inArray } from 'drizzle-orm';
import { identityBelsoFelhasznaloUpsert } from './lib/belso-felhasznalo.js';
import { szereploHozzarendel } from './lib/projekt-scope.js';
import { envGet } from './lib/netlify-env.js';

/** Projektvezető teszt jogosultságok — nincs admin (csak saját projektek). */
const PV_JOGOK = [
  { ugycsoport: 'projektek', olvasas: true, iras: true },
  { ugycsoport: 'beosztas', olvasas: true, iras: true },
  { ugycsoport: 'berszamfejtes', olvasas: true, iras: true },
  { ugycsoport: 'toborzas', olvasas: true, iras: true },
  { ugycsoport: 'partnerek', olvasas: true, iras: true },
  { ugycsoport: 'erdeklodok', olvasas: true, iras: true },
  { ugycsoport: 'tagok', olvasas: true, iras: false },
  { ugycsoport: 'penzugy', olvasas: true, iras: false },
  { ugycsoport: 'admin', olvasas: false, iras: false },
];

const PV_FIOKOK: Array<{
  email: string;
  nev: string;
  szerepkor: string;
  projektAzonositok: string[];
}> = [
  {
    email: 'konfar.kitti@melodiak.hu',
    nev: 'Konfár Kitti',
    szerepkor: 'Piackutató',
    projektAzonositok: ['B09450', 'B0359192', 'B0472200'],
  },
  {
    email: 'edocs.adam@melodiak.hu',
    nev: 'Edőcs Ádám',
    szerepkor: 'Témavezető/Mentor',
    projektAzonositok: ['B0472100', 'B0510001'],
  },
  {
    email: 'dilingai.pal@melodiak.hu',
    nev: 'Dilingai Pál',
    szerepkor: 'Témavezető/Mentor',
    projektAzonositok: ['B09781', 'B0043100'],
  },
  {
    email: 'kiss.andrea@melodiak.hu',
    nev: 'Kiss Andrea',
    szerepkor: 'Témavezető/Mentor',
    projektAzonositok: ['B09450', 'B09781'],
  },
];

function seedKulcsOk(req: Request): boolean {
  const expected = envGet('ICE_DEMO_SEED_KEY') ?? 'ice-demo-pv-2026';
  const header = req.headers.get('x-ice-demo-seed') ?? '';
  const bodyKey = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return header === expected || bodyKey === expected;
}

async function upsertPv(
  email: string,
  nev: string,
  password: string,
  fallback: string,
) {
  try {
    const user = await identityBelsoFelhasznaloUpsert(email, password, PV_JOGOK, nev);
    return { ...user, jelszo: password };
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (
      password !== fallback &&
      (msg.includes('password') || msg.includes('short') || msg.includes('length'))
    ) {
      const user = await identityBelsoFelhasznaloUpsert(email, fallback, PV_JOGOK, nev);
      return { ...user, jelszo: fallback };
    }
    throw err;
  }
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
    /* üres body ok */
  }

  const requested = String(body.password ?? '12345');
  const fallback = requested.length >= 8 ? requested : `${requested}Ice!!`;

  try {
    const mindenAzon = [...new Set(PV_FIOKOK.flatMap((f) => f.projektAzonositok))];
    const projektek = await db
      .select({ id: projekt.id, azonosito: projekt.azonosito })
      .from(projekt)
      .where(inArray(projekt.azonosito, mindenAzon));
    const azonMap = new Map(projektek.map((p) => [p.azonosito, p.id]));

    const fiokok = [];
    for (const f of PV_FIOKOK) {
      const user = await upsertPv(f.email, f.nev, requested, fallback);
      const hozzarendelt: string[] = [];
      for (const azon of f.projektAzonositok) {
        const projektId = azonMap.get(azon);
        if (!projektId) continue;
        await szereploHozzarendel(projektId, f.nev, f.email, f.szerepkor);
        hozzarendelt.push(azon);
      }
      fiokok.push({
        email: user.email,
        nev: f.nev,
        jelszo: user.jelszo,
        identityId: user.id,
        projektek: hozzarendelt,
      });
    }

    return Response.json({
      ok: true,
      fiokok,
      belpes_url: 'https://ice89.netlify.app/belso/belepes',
      pv_url: 'https://ice89.netlify.app/belso/pv-munkaterulet',
      megjegyzes:
        'PV csak azokhoz a projektekhez fér hozzá, ahol szereplőként fel van víve. Admin minden projektet lát.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Seed sikertelen';
    return Response.json({ hiba: msg }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/demo-pv-seed',
};
