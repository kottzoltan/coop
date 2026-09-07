import { describe, expect, it } from 'vitest';
import {
  calculatePayrollTaxes,
  defaultTaxYearConfig2026,
} from '../calculate-payroll-taxes.js';
import type { CalculatePayrollTaxesInput, RelationType } from '../types.js';

function mockInput(overrides: {
  gross: number;
  birthDate?: string | null;
  relationType?: RelationType;
  isInsured?: boolean;
  isFullTime?: boolean;
  payrollPeriod?: string;
  activeAllowances?: CalculatePayrollTaxesInput['activeAllowances'];
  taxYearConfig?: ReturnType<typeof defaultTaxYearConfig2026>;
}): CalculatePayrollTaxesInput {
  const config = overrides.taxYearConfig ?? defaultTaxYearConfig2026();
  return {
    payrollLine: { grossAmount: overrides.gross },
    member: { birthDate: overrides.birthDate ?? '2003-06-15' },
    membership: { status: 'AKTIV' },
    studentStatus: { isFullTime: overrides.isFullTime ?? true },
    taxProfile: {},
    taxYearConfig: config,
    activeAllowances: overrides.activeAllowances ?? [],
    employmentRelation: {
      relationType: overrides.relationType ?? 'SCHOOL_COOP_MEMBER_WORK',
      isInsured: overrides.isInsured ?? false,
    },
    payrollPeriod: overrides.payrollPeriod ?? '2026-03',
    calculationVersion: '1.0.0',
  };
}

describe('calculatePayrollTaxes', () => {
  const config2026 = defaultTaxYearConfig2026();

  it('25 év alatti diák 300 000 Ft bruttóval → SZJA 0, TB 0, szocho 0', () => {
    const r = calculatePayrollTaxes(
      mockInput({ gross: 300_000, birthDate: '2003-01-01' }),
    );
    expect(r.calculatedSzja).toBe(0);
    expect(r.finalSzjaBase).toBe(0);
    expect(r.tbAmount).toBe(0);
    expect(r.szochoAmount).toBe(0);
    expect(r.netAmount).toBe(300_000);
    expect(r.appliedAllowances.some((a) => a.type === 'UNDER_25')).toBe(true);
  });

  it('25 év alatti diák 800 000 Ft bruttóval → csak a limit feletti rész SZJA-köteles', () => {
    const r = calculatePayrollTaxes(
      mockInput({ gross: 800_000, birthDate: '2003-01-01' }),
    );
    const limit = config2026.under25MonthlyAllowanceLimit;
    expect(r.finalSzjaBase).toBe(800_000 - limit);
    expect(r.calculatedSzja).toBe(Math.floor((800_000 - limit) * 0.15));
    expect(r.tbAmount).toBe(0);
    expect(r.szochoAmount).toBe(0);
  });

  it('25 év feletti nappali iskolaszövetkezeti tag → 15% SZJA, TB 0, szocho 0', () => {
    const r = calculatePayrollTaxes(
      mockInput({ gross: 300_000, birthDate: '1998-05-10' }),
    );
    expect(r.finalSzjaBase).toBe(300_000);
    expect(r.calculatedSzja).toBe(Math.floor(300_000 * 0.15));
    expect(r.tbAmount).toBe(0);
    expect(r.szochoAmount).toBe(0);
    expect(r.tbExemptReason).toBe('ISKOLASZOVETKEZETI_TAG_NAPPALI');
    expect(r.szochoExemptReason).toBe('ISKOLASZOVETKEZETI_JOGVISZONY');
  });

  it('munkaviszony típusú diák → általános TB/szocho szabály config szerint', () => {
    const r = calculatePayrollTaxes(
      mockInput({
        gross: 400_000,
        birthDate: '1998-05-10',
        relationType: 'EMPLOYMENT',
        isInsured: true,
        isFullTime: false,
      }),
    );
    expect(r.tbAmount).toBe(Math.floor(400_000 * config2026.tbRate));
    expect(r.szochoAmount).toBe(Math.floor(400_000 * config2026.szochoRate));
    expect(r.tbExemptReason).toBeNull();
    expect(r.szochoExemptReason).toBeNull();
    expect(r.netAmount).toBe(400_000 - r.calculatedSzja - r.tbAmount);
  });

  it('több SZJA kedvezmény helyes sorrendben érvényesül', () => {
    const r = calculatePayrollTaxes(
      mockInput({
        gross: 500_000,
        birthDate: '2003-01-01',
        activeAllowances: [
          {
            allowanceType: 'MOTHERS_4_OR_MORE',
            validFrom: '2026-01-01',
            requestedMonthlyAmount: 100_000,
            status: 'AKTIV',
          },
          {
            allowanceType: 'PERSONAL_ALLOWANCE',
            validFrom: '2026-01-01',
            requestedMonthlyAmount: 50_000,
            status: 'AKTIV',
          },
        ],
      }),
    );

    const types = r.appliedAllowances.map((a) => a.type);
    const mothersIdx = types.indexOf('MOTHERS_4_OR_MORE');
    const under25Idx = types.indexOf('UNDER_25');
    const personalIdx = types.indexOf('PERSONAL_ALLOWANCE');

    expect(mothersIdx).toBeGreaterThanOrEqual(0);
    expect(under25Idx).toBeGreaterThan(mothersIdx);
    if (personalIdx >= 0) {
      expect(personalIdx).toBeGreaterThan(under25Idx);
    }

    const totalAllowance = r.appliedAllowances.reduce((s, a) => s + a.amount, 0);
    expect(r.initialSzjaBase - r.finalSzjaBase).toBe(totalAllowance);
  });

  it('kedvezmény nem viheti negatívba az adóalapot', () => {
    const r = calculatePayrollTaxes(
      mockInput({
        gross: 50_000,
        birthDate: '2003-01-01',
        activeAllowances: [
          {
            allowanceType: 'MOTHERS_4_OR_MORE',
            validFrom: '2026-01-01',
            requestedMonthlyAmount: 200_000,
            status: 'AKTIV',
          },
        ],
      }),
    );
    expect(r.finalSzjaBase).toBe(0);
    expect(r.calculatedSzja).toBe(0);
    expect(r.appliedAllowances.reduce((s, a) => s + a.amount, 0)).toBeLessThanOrEqual(50_000);
  });

  it('25 év alatti limit configból jön — más érték más eredmény', () => {
    const customConfig = {
      ...config2026,
      under25MonthlyAllowanceLimit: 500_000,
    };
    const r = calculatePayrollTaxes(
      mockInput({
        gross: 600_000,
        birthDate: '2003-01-01',
        taxYearConfig: customConfig,
      }),
    );
    expect(r.finalSzjaBase).toBe(100_000);
    expect(r.calculatedSzja).toBe(Math.floor(100_000 * 0.15));
  });

  it('elutasított 25 év alatti nyilatkozat → nincs automatikus kedvezmény', () => {
    const r = calculatePayrollTaxes(
      mockInput({
        gross: 300_000,
        birthDate: '2003-01-01',
        activeAllowances: [
          {
            allowanceType: 'UNDER_25',
            validFrom: '2026-01-01',
            status: 'ELUTASITVA',
          },
        ],
      }),
    );
    expect(r.appliedAllowances.some((a) => a.type === 'UNDER_25')).toBe(false);
    expect(r.calculatedSzja).toBe(Math.floor(300_000 * 0.15));
  });
});

describe('snapshot immutability szerződés', () => {
  it('a számítási eredmény determinisztikus — ugyanaz a bemenet ugyanazt adja', () => {
    const input = mockInput({ gross: 450_000, birthDate: '2002-08-20' });
    const a = calculatePayrollTaxes(input);
    const b = calculatePayrollTaxes(input);
    expect(a).toEqual(b);
  });

  it('korrekció esetén új számítás külön inputtal — eredeti nem változik', () => {
    const original = mockInput({ gross: 300_000, birthDate: '2003-01-01' });
    const originalResult = calculatePayrollTaxes(original);

    const corrected = mockInput({ gross: 350_000, birthDate: '2003-01-01' });
    const correctedResult = calculatePayrollTaxes(corrected);

    expect(originalResult.calculatedSzja).toBe(0);
    expect(originalResult.netAmount).toBe(300_000);
    expect(correctedResult.calculatedSzja).toBe(0);
    expect(correctedResult.netAmount).toBe(350_000);
  });
});
