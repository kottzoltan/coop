import { getStore } from '@netlify/blobs';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { iceBeallitas, projekt } from '../../../db/schema.js';
import { mergeProjektMeta } from './projekt-meta.js';
import {
  ESETI_ALAP_SABLON_KULCS,
  KERETSZERZODES_SABLON_KULCS,
  type SzerzodesSablonMeta,
} from '../../../shared/src/szerzodes-sablon.js';

const BLOB_STORE = 'ice-dokumentumok';
const MAX_BYTES = 8 * 1024 * 1024;

const ENGEDELYEZETT_TIPUSOK = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/pdf',
]);

function sablonNormalizal(raw: unknown): SzerzodesSablonMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const blob_key = typeof o.blob_key === 'string' ? o.blob_key.trim() : '';
  const fajlnev = typeof o.fajlnev === 'string' ? o.fajlnev.trim() : '';
  if (!blob_key || !fajlnev) return null;
  return {
    blob_key,
    fajlnev,
    content_type: typeof o.content_type === 'string' ? o.content_type : undefined,
    meret: typeof o.meret === 'string' ? o.meret : undefined,
    feltoltve: typeof o.feltoltve === 'string' ? o.feltoltve : undefined,
    feltolto: typeof o.feltolto === 'string' ? o.feltolto : undefined,
  };
}

function blobKey(tipus: string, scopeId: string, fajlnev: string): string {
  const safe = fajlnev.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return `sablon/${tipus}/${scopeId}/${Date.now()}-${safe}`;
}

async function iceSablonLekerdezes(kulcs: string): Promise<SzerzodesSablonMeta | null> {
  const [row] = await db.select().from(iceBeallitas).where(eq(iceBeallitas.kulcs, kulcs));
  return sablonNormalizal(row?.ertek);
}

async function iceSablonMentes(kulcs: string, sablon: SzerzodesSablonMeta): Promise<void> {
  const [existing] = await db.select().from(iceBeallitas).where(eq(iceBeallitas.kulcs, kulcs));
  if (existing) {
    await db
      .update(iceBeallitas)
      .set({ ertek: sablon, modositva: new Date() })
      .where(eq(iceBeallitas.kulcs, kulcs));
  } else {
    await db.insert(iceBeallitas).values({ kulcs, ertek: sablon });
  }
}

export async function szerzodesSablonokListaz(projektId?: number) {
  const keretszerzodes = await iceSablonLekerdezes(KERETSZERZODES_SABLON_KULCS);
  const eseti_alap = await iceSablonLekerdezes(ESETI_ALAP_SABLON_KULCS);

  let eseti_projekt: SzerzodesSablonMeta | null = null;
  if (projektId) {
    const [p] = await db.select().from(projekt).where(eq(projekt.id, projektId));
    if (p) {
      const meta = mergeProjektMeta(p);
      eseti_projekt = sablonNormalizal(meta.eseti_szerzodes_sablon) ?? null;
    }
  }

  return { keretszerzodes, eseti_alap, eseti_projekt };
}

export async function szerzodesSablonFeltolt(input: {
  tipus: 'keretszerzodes' | 'eseti_alap' | 'eseti_projekt';
  fajlnev: string;
  tartalom_base64: string;
  content_type?: string;
  projekt_id?: number;
  feltolto: string;
}): Promise<SzerzodesSablonMeta> {
  const fajlnev = input.fajlnev.trim();
  const contentType = input.content_type ?? 'application/octet-stream';
  if (!fajlnev) throw new Error('Fájlnév kötelező.');
  if (!ENGEDELYEZETT_TIPUSOK.has(contentType) && !fajlnev.match(/\.(docx?|pdf)$/i)) {
    throw new Error('Csak Word (.docx) vagy PDF sablon tölthető fel.');
  }

  const buf = Buffer.from(input.tartalom_base64, 'base64');
  if (buf.byteLength > MAX_BYTES) throw new Error('Max. 8 MB fájlméret.');

  const scopeId =
    input.tipus === 'eseti_projekt'
      ? String(input.projekt_id ?? '')
      : input.tipus === 'keretszerzodes'
        ? 'keretszerzodes'
        : 'eseti_alap';

  if (input.tipus === 'eseti_projekt' && !input.projekt_id) {
    throw new Error('Projekt azonosító kötelező az eseti projekt sablonhoz.');
  }

  const key = blobKey(input.tipus, scopeId, fajlnev);
  const store = getStore({ name: BLOB_STORE, consistency: 'strong' });
  await store.set(key, buf, {
    metadata: { contentType, fajlnev, feltolto: input.feltolto, scope: 'sablon', scopeId },
  });

  const sablon: SzerzodesSablonMeta = {
    blob_key: key,
    fajlnev,
    content_type: contentType,
    meret: `${Math.round(buf.byteLength / 1024)} KB`,
    feltoltve: new Date().toISOString().slice(0, 10),
    feltolto: input.feltolto,
  };

  if (input.tipus === 'keretszerzodes') {
    await iceSablonMentes(KERETSZERZODES_SABLON_KULCS, sablon);
  } else if (input.tipus === 'eseti_alap') {
    await iceSablonMentes(ESETI_ALAP_SABLON_KULCS, sablon);
  } else {
    const [p] = await db.select().from(projekt).where(eq(projekt.id, input.projekt_id!));
    if (!p) throw new Error('Projekt nem található.');
    const meta = mergeProjektMeta(p);
    await db
      .update(projekt)
      .set({ meta: { ...meta, eseti_szerzodes_sablon: sablon } })
      .where(eq(projekt.id, input.projekt_id!));
  }

  return sablon;
}

/** Felvétel / aláírás: keret- és eseti sablon blob kulcs feloldása. */
export async function szerzodesSablonFeloldas(
  tipus: 'keretszerzodes' | 'eseti_szerzodes',
  projektId: number | null,
): Promise<SzerzodesSablonMeta | null> {
  if (tipus === 'keretszerzodes') {
    return iceSablonLekerdezes(KERETSZERZODES_SABLON_KULCS);
  }

  if (projektId) {
    const [p] = await db.select().from(projekt).where(eq(projekt.id, projektId));
    if (p) {
      const meta = mergeProjektMeta(p);
      const projektSablon = sablonNormalizal(meta.eseti_szerzodes_sablon);
      if (projektSablon) return projektSablon;
    }
  }

  return iceSablonLekerdezes(ESETI_ALAP_SABLON_KULCS);
}
