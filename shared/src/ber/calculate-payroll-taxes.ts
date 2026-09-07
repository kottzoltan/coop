import {
  allowanceValidInPeriod,
  isUnder25AtPayrollMonth,
  isUnder30AtPayrollMonth,
} from './age-utils.js';
import { ALLOWANCE_PRIORITY } from './kedvezmeny-sorrend.js';
import { mapIncomeCategory, resolveJogviszonyRule } from './jogviszony-szabaly.js';
import { roundMoney } from './rounding.js';
import type {
  AllowanceType,
  AppliedAllowance,
  CalculatePayrollTaxesInput,
  TaxAllowanceDeclaration,
  TaxCalculationResult,
  TaxYearConfig,
} from './types.js';

interface ResolvedAllowance {
  amount: number;
  source: 'AUTO' | 'DECLARATION';
}

function activeDeclaration(
  declarations: TaxAllowanceDeclaration[],
  type: AllowanceType,
  payrollPeriod: string,
): TaxAllowanceDeclaration | undefined {
  return declarations.find(
    (d) =>
      d.allowanceType === type &&
      d.status === 'AKTIV' &&
      allowanceValidInPeriod(d.validFrom, d.validTo, payrollPeriod),
  );
}

function resolveAllowanceAmount(
  type: AllowanceType,
  input: CalculatePayrollTaxesInput,
): ResolvedAllowance {
  const { member, taxYearConfig, activeAllowances, payrollPeriod } = input;
  const declared = activeDeclaration(activeAllowances, type, payrollPeriod);

  switch (type) {
    case 'UNDER_25': {
      if (!member.birthDate) return { amount: 0, source: 'AUTO' };
      const rejected = activeAllowances.some(
        (d) =>
          d.allowanceType === 'UNDER_25' &&
          d.status === 'ELUTASITVA' &&
          allowanceValidInPeriod(d.validFrom, d.validTo, payrollPeriod),
      );
      if (rejected) return { amount: 0, source: 'AUTO' };
      if (!isUnder25AtPayrollMonth(member.birthDate, payrollPeriod)) {
        return { amount: 0, source: 'AUTO' };
      }
      return {
        amount: taxYearConfig.under25MonthlyAllowanceLimit,
        source: declared ? 'DECLARATION' : 'AUTO',
      };
    }

    case 'UNDER_30_MOTHER': {
      if (!member.birthDate || !isUnder30AtPayrollMonth(member.birthDate, payrollPeriod)) {
        return { amount: 0, source: 'AUTO' };
      }
      if (!declared) return { amount: 0, source: 'AUTO' };
      return {
        amount: declared.requestedMonthlyAmount ?? taxYearConfig.personalAllowanceMonthlyLimit,
        source: 'DECLARATION',
      };
    }

    case 'MOTHERS_4_OR_MORE': {
      if (!declared) return { amount: 0, source: 'AUTO' };
      return {
        amount: declared.requestedMonthlyAmount ?? taxYearConfig.personalAllowanceMonthlyLimit,
        source: 'DECLARATION',
      };
    }

    case 'PERSONAL_ALLOWANCE': {
      if (!declared) return { amount: 0, source: 'AUTO' };
      return {
        amount: declared.requestedMonthlyAmount ?? taxYearConfig.personalAllowanceMonthlyLimit,
        source: 'DECLARATION',
      };
    }

    case 'FIRST_MARRIAGE': {
      if (!declared) return { amount: 0, source: 'AUTO' };
      const base = taxYearConfig.firstMarriageMonthlyAllowance;
      const amount =
        declared.sharedWithSpouse === true
          ? Math.floor(base / 2)
          : (declared.requestedMonthlyAmount ?? base);
      return { amount, source: 'DECLARATION' };
    }

    case 'FAMILY_ALLOWANCE': {
      if (!declared) return { amount: 0, source: 'AUTO' };
      if (declared.requestedMonthlyAmount != null) {
        return { amount: declared.requestedMonthlyAmount, source: 'DECLARATION' };
      }
      const childrenCount = (declared as TaxAllowanceDeclaration & { childrenCount?: number })
        .childrenCount;
      const rule = taxYearConfig.familyAllowanceRules.find(
        (r) => r.childrenCount === childrenCount,
      );
      return { amount: rule?.monthlyAmount ?? 0, source: 'DECLARATION' };
    }

    case 'FAMILY_CONTRIBUTION_ALLOWANCE': {
      if (!declared) return { amount: 0, source: 'AUTO' };
      return {
        amount: declared.requestedMonthlyAmount ?? 0,
        source: 'DECLARATION',
      };
    }

    default:
      return { amount: 0, source: 'AUTO' };
  }
}

function isSchoolCoopFullTimeExempt(input: CalculatePayrollTaxesInput): boolean {
  const { employmentRelation, studentStatus } = input;
  return (
    employmentRelation.relationType === 'SCHOOL_COOP_MEMBER_WORK' &&
    studentStatus?.isFullTime === true &&
    !employmentRelation.isInsured
  );
}

/**
 * Bérszámfejtési sor adószámítása — pure function, nincs DB függőség.
 * Minden adókulcs és limit a TaxYearConfig-ból jön.
 */
export function calculatePayrollTaxes(input: CalculatePayrollTaxesInput): TaxCalculationResult {
  const { payrollLine, taxYearConfig, employmentRelation } = input;
  const rule = resolveJogviszonyRule(employmentRelation);

  const initialSzjaBase = payrollLine.grossAmount;
  const appliedAllowances: AppliedAllowance[] = [];
  let remainingBase = initialSzjaBase;

  for (const type of ALLOWANCE_PRIORITY) {
    if (remainingBase <= 0) break;

    const { amount: allowanceCap, source } = resolveAllowanceAmount(type, input);
    if (allowanceCap <= 0) continue;

    const appliedAmount = Math.min(allowanceCap, remainingBase);
    appliedAllowances.push({
      type,
      amount: appliedAmount,
      source,
      monthlyCapUsed: appliedAmount,
    });
    remainingBase -= appliedAmount;
  }

  const finalSzjaBase = Math.max(0, remainingBase);
  const calculatedSzja = rule.szjaApplicable
    ? roundMoney(finalSzjaBase * taxYearConfig.szjaRate, taxYearConfig.roundingRules.szja)
    : 0;

  let tbBase = 0;
  let tbAmount = 0;
  let szochoBase = 0;
  let szochoAmount = 0;
  let tbExemptReason: string | null = rule.tbExemptReason;
  let szochoExemptReason: string | null = rule.szochoExemptReason;

  if (isSchoolCoopFullTimeExempt(input)) {
    // Normál nappali iskolaszövetkezeti tagi diákmunka: TB és szocho nincs
    tbBase = 0;
    tbAmount = 0;
    szochoBase = 0;
    szochoAmount = 0;
  } else if (employmentRelation.isInsured || rule.isInsured) {
    tbBase = payrollLine.grossAmount;
    tbAmount = roundMoney(tbBase * taxYearConfig.tbRate, taxYearConfig.roundingRules.tb);
    szochoBase = payrollLine.grossAmount;
    szochoAmount = roundMoney(
      szochoBase * taxYearConfig.szochoRate,
      taxYearConfig.roundingRules.szocho,
    );
    tbExemptReason = null;
    szochoExemptReason = null;
  }

  const netAmount = payrollLine.grossAmount - calculatedSzja - tbAmount;

  return {
    initialSzjaBase,
    appliedAllowances,
    finalSzjaBase,
    calculatedSzja,
    tbBase,
    tbAmount,
    szochoBase,
    szochoAmount,
    netAmount,
    tbExemptReason,
    szochoExemptReason,
    incomeCategory: mapIncomeCategory(employmentRelation.relationType),
  };
}

/** Alapértelmezett 2026-os config — csak tesztekhez és seed referenciához, nem production forrás */
export function defaultTaxYearConfig2026(): TaxYearConfig {
  return {
    taxYear: 2026,
    szjaRate: 0.15,
    tbRate: 0.185,
    szochoRate: 0.13,
    under25MonthlyAllowanceLimit: 715_765,
    personalAllowanceMonthlyLimit: 96_900,
    firstMarriageMonthlyAllowance: 33_335,
    familyAllowanceRules: [
      { childrenCount: 1, monthlyAmount: 10_000 },
      { childrenCount: 2, monthlyAmount: 20_000 },
      { childrenCount: 3, monthlyAmount: 33_000 },
    ],
    roundingRules: { szja: 'floor', tb: 'floor', szocho: 'floor' },
  };
}
