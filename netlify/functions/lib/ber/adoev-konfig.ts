import { eq } from 'drizzle-orm';
import { db } from '../../../../db/index.js';
import { adoevKonfig } from '../../../../db/schema.js';
import type { TaxYearConfig, RoundingMode } from '@coop/shared';

function parseRate(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function parseRoundingRules(raw: { szja: string; tb: string; szocho: string }): TaxYearConfig['roundingRules'] {
  const mode = (s: string): RoundingMode => {
    if (s === 'ceil' || s === 'round') return s;
    return 'floor';
  };
  return { szja: mode(raw.szja), tb: mode(raw.tb), szocho: mode(raw.szocho) };
}

export function mapAdoevKonfigRow(row: typeof adoevKonfig.$inferSelect): TaxYearConfig {
  return {
    taxYear: row.taxYear,
    szjaRate: parseRate(row.szjaRate),
    tbRate: parseRate(row.tbRate),
    szochoRate: parseRate(row.szochoRate),
    under25MonthlyAllowanceLimit: row.under25MonthlyAllowanceLimit,
    personalAllowanceMonthlyLimit: row.personalAllowanceMonthlyLimit,
    firstMarriageMonthlyAllowance: row.firstMarriageMonthlyAllowance,
    familyAllowanceRules: row.familyAllowanceRules ?? [],
    roundingRules: parseRoundingRules(row.roundingRules),
  };
}

export async function getActiveTaxYearConfig(taxYear: number): Promise<TaxYearConfig | null> {
  const [row] = await db
    .select()
    .from(adoevKonfig)
    .where(eq(adoevKonfig.taxYear, taxYear));
  if (!row || !row.isActive) return null;
  return mapAdoevKonfigRow(row);
}
