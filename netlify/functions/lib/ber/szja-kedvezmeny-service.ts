import { eq, and, lte, or, isNull, gte } from 'drizzle-orm';
import { db } from '../../../../db/index.js';
import { szjaKedvezmenyNyilatkozat } from '../../../../db/schema.js';
import type { SzjaKedvezmeny, SzjaKedvezmenyTipus } from '../../../../shared/src/tag.js';
import type { AllowanceType, TaxAllowanceDeclaration } from '../../../../shared/src/ber/types.js';
import { SZJA_KEDVEZMENY_LABEL } from '../../../../shared/src/tag.js';

const TIPUS_TO_ALLOWANCE: Record<string, AllowanceType> = {
  négy_gyermek_anyuka: 'MOTHERS_4_OR_MORE',
  személyi: 'PERSONAL_ALLOWANCE',
  első_házas: 'FIRST_MARRIAGE',
  családi: 'FAMILY_ALLOWANCE',
};

const ALLOWANCE_TO_TIPUS: Record<string, SzjaKedvezmenyTipus> = {
  MOTHERS_4_OR_MORE: 'négy_gyermek_anyuka',
  PERSONAL_ALLOWANCE: 'személyi',
  FIRST_MARRIAGE: 'első_házas',
  FAMILY_ALLOWANCE: 'családi',
};

function datumStr(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

function dbStatusToUi(status: string): SzjaKedvezmeny['statusz'] {
  if (status === 'AKTIV') return 'aktív';
  if (status === 'MEGSZUNT') return 'megszűnt';
  return 'lejárt';
}

function uiStatusToDb(status: SzjaKedvezmeny['statusz']): string {
  if (status === 'aktív') return 'AKTIV';
  if (status === 'megszűnt') return 'MEGSZUNT';
  return 'LEJART';
}

export function rowToSzjaKedvezmeny(row: typeof szjaKedvezmenyNyilatkozat.$inferSelect): SzjaKedvezmeny {
  const tipus =
    ALLOWANCE_TO_TIPUS[row.allowanceType] ??
    (row.tipus as SzjaKedvezmenyTipus) ??
    'családi';
  return {
    id: row.legacyId ?? String(row.id),
    db_id: row.id,
    tipus,
    adoeloleghonap: row.adoeloleghonap,
    ervenyes_tol: datumStr(row.validFrom) ?? '',
    ervenyes_ig: datumStr(row.validTo),
    havi_adokedvezmeny: row.requestedMonthlyAmount,
    megjegyzes: row.megjegyzes,
    statusz: dbStatusToUi(row.status),
    document_id: row.documentId,
    shared_with_spouse: row.sharedWithSpouse,
  } as SzjaKedvezmeny & { db_id?: number; document_id?: string | null; shared_with_spouse?: boolean };
}

export async function listSzjaKedvezmenyek(tagId: number): Promise<SzjaKedvezmeny[]> {
  const sorok = await db
    .select()
    .from(szjaKedvezmenyNyilatkozat)
    .where(eq(szjaKedvezmenyNyilatkozat.tagId, tagId))
    .orderBy(szjaKedvezmenyNyilatkozat.validFrom);
  return sorok.map(rowToSzjaKedvezmeny);
}

export async function listActiveAllowancesForPayroll(
  tagId: number,
  payrollPeriod: string,
): Promise<TaxAllowanceDeclaration[]> {
  const [yearStr, monthStr] = payrollPeriod.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const periodStart = `${payrollPeriod}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${payrollPeriod}-${String(lastDay).padStart(2, '0')}`;

  const sorok = await db
    .select()
    .from(szjaKedvezmenyNyilatkozat)
    .where(
      and(
        eq(szjaKedvezmenyNyilatkozat.tagId, tagId),
        eq(szjaKedvezmenyNyilatkozat.status, 'AKTIV'),
        lte(szjaKedvezmenyNyilatkozat.validFrom, periodEnd),
        or(
          isNull(szjaKedvezmenyNyilatkozat.validTo),
          gte(szjaKedvezmenyNyilatkozat.validTo, periodStart),
        ),
      ),
    );

  return sorok.map((row) => ({
    allowanceType: row.allowanceType as AllowanceType,
    validFrom: datumStr(row.validFrom) ?? periodStart,
    validTo: datumStr(row.validTo),
    requestedMonthlyAmount: row.requestedMonthlyAmount,
    sharedWithSpouse: row.sharedWithSpouse,
    status: 'AKTIV' as const,
  }));
}

export async function syncSzjaKedvezmenyekFromUi(tagId: number, kedvezmenyek: SzjaKedvezmeny[]) {
  const existing = await db
    .select()
    .from(szjaKedvezmenyNyilatkozat)
    .where(eq(szjaKedvezmenyNyilatkozat.tagId, tagId));

  const existingByLegacy = new Map(existing.map((e) => [e.legacyId ?? String(e.id), e]));
  const seen = new Set<string>();

  for (const k of kedvezmenyek) {
    const allowanceType = TIPUS_TO_ALLOWANCE[k.tipus] ?? 'FAMILY_ALLOWANCE';
    const legacyId = k.id;
    seen.add(legacyId);
    const prev = existingByLegacy.get(legacyId);

    const values = {
      tagId,
      legacyId,
      tipus: k.tipus,
      allowanceType,
      adoeloleghonap: k.adoeloleghonap,
      validFrom: k.ervenyes_tol,
      validTo: k.ervenyes_ig,
      requestedMonthlyAmount: k.havi_adokedvezmeny,
      megjegyzes: k.megjegyzes,
      status: uiStatusToDb(k.statusz),
      documentId: (k as SzjaKedvezmeny & { document_id?: string }).document_id ?? null,
      sharedWithSpouse: (k as SzjaKedvezmeny & { shared_with_spouse?: boolean }).shared_with_spouse ?? false,
      updatedAt: new Date(),
    };

    if (prev) {
      await db
        .update(szjaKedvezmenyNyilatkozat)
        .set(values)
        .where(eq(szjaKedvezmenyNyilatkozat.id, prev.id));
    } else {
      await db.insert(szjaKedvezmenyNyilatkozat).values(values);
    }
  }

  for (const e of existing) {
    const key = e.legacyId ?? String(e.id);
    if (!seen.has(key)) {
      await db.delete(szjaKedvezmenyNyilatkozat).where(eq(szjaKedvezmenyNyilatkozat.id, e.id));
    }
  }
}

export async function getSzjaKedvezmenyMonthlyLimitPreview(
  tagId: number,
  payrollPeriod: string,
): Promise<{ tipus: string; label: string; havi_limit: number | null }[]> {
  const sorok = await listActiveAllowancesForPayroll(tagId, payrollPeriod);
  return sorok.map((s) => ({
    tipus: s.allowanceType,
    label: SZJA_KEDVEZMENY_LABEL[ALLOWANCE_TO_TIPUS[s.allowanceType] ?? 'családi'] ?? s.allowanceType,
    havi_limit: s.requestedMonthlyAmount ?? null,
  }));
}
