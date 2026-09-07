import { db } from '../../../db/index.js';
import { projekt } from '../../../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export type ProjektSor = {
  id: number;
  azonosito: string;
  nev: string;
  partner_nev: string | null;
  partner_id: number | null;
  iroda: string | null;
  statusz: string;
  prioritas: string;
  belso_munka: boolean;
  meta: Record<string, unknown>;
};

let kiterjesztettOszlopok: boolean | undefined;
let partnerIdOszlop: boolean | undefined;

function executeRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows: unknown }).rows;
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  }
  return [];
}

function parseMeta(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

function normalizaltProjektSor(row: Record<string, unknown>): ProjektSor {
  return {
    id: Number(row.id),
    azonosito: String(row.azonosito),
    nev: String(row.nev),
    partner_nev: row.partner_nev != null ? String(row.partner_nev) : null,
    partner_id: row.partner_id != null ? Number(row.partner_id) : null,
    iroda: row.iroda != null ? String(row.iroda) : null,
    statusz: row.statusz != null ? String(row.statusz) : 'aktív',
    prioritas: row.prioritas != null ? String(row.prioritas) : 'Elsődleges',
    belso_munka: row.belso_munka === true,
    meta: parseMeta(row.meta),
  };
}

export async function projektKiterjesztettOszlopok(): Promise<boolean> {
  if (kiterjesztettOszlopok !== undefined) return kiterjesztettOszlopok;
  try {
    const result = await db.execute(sql`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'projekt'
        AND column_name IN ('prioritas', 'belso_munka', 'meta')
    `);
    const row = executeRows(result)[0];
    kiterjesztettOszlopok = Number(row?.n ?? 0) >= 3;
  } catch {
    kiterjesztettOszlopok = false;
  }
  return kiterjesztettOszlopok;
}

export async function projektPartnerIdOszlop(): Promise<boolean> {
  if (partnerIdOszlop !== undefined) return partnerIdOszlop;
  try {
    const result = await db.execute(sql`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'projekt'
        AND column_name = 'partner_id'
    `);
    const row = executeRows(result)[0];
    partnerIdOszlop = Number(row?.n ?? 0) >= 1;
  } catch {
    partnerIdOszlop = false;
  }
  return partnerIdOszlop;
}

export async function projektMetaOszlopElerheto(): Promise<boolean> {
  return projektKiterjesztettOszlopok();
}

const PROJEKT_SELECT_EXTENDED = sql`
  id, azonosito, nev, partner_nev, partner_id, iroda, statusz,
  prioritas, belso_munka, meta
`;

const PROJEKT_SELECT_EXTENDED_NO_PARTNER_ID = sql`
  id, azonosito, nev, partner_nev, iroda, statusz,
  prioritas, belso_munka, meta
`;

const PROJEKT_SELECT_BASIC = sql`
  id, azonosito, nev, partner_nev, iroda, statusz
`;

async function projektSelectCols() {
  if (!(await projektKiterjesztettOszlopok())) return PROJEKT_SELECT_BASIC;
  if (await projektPartnerIdOszlop()) return PROJEKT_SELECT_EXTENDED;
  return PROJEKT_SELECT_EXTENDED_NO_PARTNER_ID;
}

export async function selectProjektById(id: number): Promise<ProjektSor | undefined> {
  if (await projektKiterjesztettOszlopok()) {
    try {
      const cols = await projektSelectCols();
      const result = await db.execute(sql`
        SELECT ${cols}
        FROM projekt WHERE id = ${id}
      `);
      const row = executeRows(result)[0];
      if (row) return normalizaltProjektSor(row);
    } catch (err) {
      console.warn('projekt extended select by id failed:', err);
    }
  }

  const result = await db.execute(sql`
    SELECT id, azonosito, nev, partner_nev, iroda, statusz
    FROM projekt WHERE id = ${id}
  `);
  const row = executeRows(result)[0];
  return row ? normalizaltProjektSor(row) : undefined;
}

export type ProjektListaSor = {
  projekt: ProjektSor;
  hirdetes_szam: number;
  aktiv_hirdetes: number;
  jelentkezok: number;
};

function mapListaSorok(rows: Record<string, unknown>[]): ProjektListaSor[] {
  return rows.map((row) => ({
    projekt: normalizaltProjektSor(row),
    hirdetes_szam: Number(row.hirdetes_szam ?? 0),
    aktiv_hirdetes: Number(row.aktiv_hirdetes ?? 0),
    jelentkezok: Number(row.jelentkezok ?? 0),
  }));
}

const LISTA_AGG_SQL = sql`
  (SELECT count(*)::int FROM munka_hirdetes h WHERE h.projekt_id = p.id) AS hirdetes_szam,
  (SELECT count(*)::int FROM munka_hirdetes h WHERE h.projekt_id = p.id AND h.aktiv = true) AS aktiv_hirdetes,
  (SELECT count(*)::int FROM munka_jelentkezes j
    INNER JOIN munka_hirdetes h ON h.id = j.hirdetes_id
    WHERE h.projekt_id = p.id) AS jelentkezok
`;

export async function selectProjektekListahoz(): Promise<ProjektListaSor[]> {
  if (await projektKiterjesztettOszlopok()) {
    try {
      const hasPartnerId = await projektPartnerIdOszlop();
      const partnerCol = hasPartnerId ? sql`p.partner_id,` : sql``;
      const result = await db.execute(sql`
        SELECT p.id, p.azonosito, p.nev, p.partner_nev, ${partnerCol}
               p.iroda, p.statusz,
               p.prioritas, p.belso_munka, p.meta,
               ${LISTA_AGG_SQL}
        FROM projekt p
        ORDER BY p.id
      `);
      return mapListaSorok(executeRows(result));
    } catch (err) {
      console.warn('projekt extended list select failed:', err);
    }
  }

  const result = await db.execute(sql`
    SELECT p.id, p.azonosito, p.nev, p.partner_nev, p.iroda, p.statusz,
           ${LISTA_AGG_SQL}
    FROM projekt p
    ORDER BY p.id
  `);
  return mapListaSorok(executeRows(result));
}

export async function mentProjektMetaHaLehet(
  projektId: number,
  meta: Record<string, unknown>,
): Promise<void> {
  if (!(await projektKiterjesztettOszlopok())) return;
  try {
    await db.update(projekt).set({ meta }).where(eq(projekt.id, projektId));
  } catch (err) {
    console.warn('projekt meta mentés sikertelen:', err);
  }
}
