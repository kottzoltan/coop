import type { Config } from '@netlify/functions';
import { requireBelso } from './lib/auth.js';
import type { Ugycsoport } from '../../shared/src/ugycsoportok.js';
import { csvResponse } from './lib/riport-csv.js';
import {
  erdeklodokCsv,
  jelentkezesekCsv,
  munkalapokCsv,
  partnerRegisztraciokCsv,
  projektListaCsv,
  tagHianyossagCsv,
  tagokCsv,
  partnerekCsv,
  teljesitesOsszesitoCsv,
} from './lib/riportok.js';

const RIPORT_JOG: Record<string, Ugycsoport> = {
  'projekt-lista': 'projektek',
  'teljesites-osszesito': 'projektek',
  erdeklodok: 'erdeklodok',
  jelentkezesek: 'toborzas',
  'partner-regisztraciok': 'partnerek',
  tagok: 'tagok',
  partnerek: 'partnerek',
  munkalapok: 'berszamfejtes',
  'tag-hianyossag': 'tagok',
};

const RIPORT_FAJL: Record<string, string> = {
  'projekt-lista': 'ice-projekt-lista.csv',
  'teljesites-osszesito': 'ice-teljesites-osszesito.csv',
  erdeklodok: 'ice-erdeklodok.csv',
  jelentkezesek: 'ice-jelentkezesek.csv',
  'partner-regisztraciok': 'ice-partner-regisztraciok.csv',
  tagok: 'ice-tag-adat-export.csv',
  partnerek: 'ice-partner-riport.csv',
  munkalapok: 'ice-munkalapok.csv',
  'tag-hianyossag': 'ice-tag-hianyossag.csv',
};

export default async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const tipus = url.searchParams.get('tipus') ?? '';
  const ugycsoport = RIPORT_JOG[tipus];
  if (!ugycsoport) {
    return Response.json({ hiba: 'Ismeretlen riport típus' }, { status: 400 });
  }

  const auth = await requireBelso(ugycsoport, 'olvasas');
  if (auth instanceof Response) return auth;

  try {
    let csv: string;
    switch (tipus) {
      case 'projekt-lista':
        csv = await projektListaCsv();
        break;
      case 'teljesites-osszesito':
        csv = await teljesitesOsszesitoCsv();
        break;
      case 'erdeklodok':
        csv = await erdeklodokCsv();
        break;
      case 'jelentkezesek':
        csv = await jelentkezesekCsv(
          url.searchParams.get('hirdetes_id')
            ? Number(url.searchParams.get('hirdetes_id'))
            : undefined,
        );
        break;
      case 'partner-regisztraciok':
        csv = await partnerRegisztraciokCsv();
        break;
      case 'tagok':
        csv = await tagokCsv();
        break;
      case 'partnerek':
        csv = await partnerekCsv();
        break;
      case 'munkalapok':
        csv = await munkalapokCsv();
        break;
      case 'tag-hianyossag':
        csv = await tagHianyossagCsv();
        break;
      default:
        return Response.json({ hiba: 'Ismeretlen riport típus' }, { status: 400 });
    }

    return csvResponse(csv, RIPORT_FAJL[tipus] ?? 'ice-riport.csv');
  } catch (err) {
    console.error('api-riportok hiba:', err);
    const reszlet = err instanceof Error ? err.message : String(err);
    return Response.json({ hiba: 'Riport generálás sikertelen', reszlet }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/riportok',
};
