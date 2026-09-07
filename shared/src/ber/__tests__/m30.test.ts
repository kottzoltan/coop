import { describe, expect, it } from 'vitest';
import { m30HasBlockingErrors, validateM30 } from '../m30.js';

describe('validateM30', () => {
  it('hibát ad érvénytelen adóévre', () => {
    const issues = validateM30({ taxYear: 0, summaries: [] });
    expect(m30HasBlockingErrors(issues)).toBe(true);
    expect(issues.some((i) => i.code === 'M30_INVALID_YEAR')).toBe(true);
  });

  it('hibát ad üres összesítésre', () => {
    const issues = validateM30({ taxYear: 2025, summaries: [] });
    expect(issues.some((i) => i.code === 'M30_NO_DATA')).toBe(true);
  });

  it('hibát ad hiányzó adóazonosítóra', () => {
    const issues = validateM30({
      taxYear: 2025,
      summaries: [
        {
          tagId: 1,
          name: 'Teszt Diák',
          taxIdentificationNumber: '',
          birthDate: '2003-01-01',
          taxYear: 2025,
          totalGross: 100000,
          totalSzjaBase: 100000,
          totalAllowances: 0,
          totalSzja: 15000,
          totalTb: 0,
          totalSzocho: 0,
          paymentCategories: ['1'],
          monthCount: 1,
        },
      ],
    });
    expect(issues.some((i) => i.code === 'M30_MISSING_TAX_ID')).toBe(true);
  });

  it('elfogad érvényes összesítést', () => {
    const issues = validateM30({
      taxYear: 2025,
      summaries: [
        {
          tagId: 1,
          name: 'Teszt Diák',
          taxIdentificationNumber: '8123456789',
          birthDate: '2003-01-01',
          taxYear: 2025,
          totalGross: 500000,
          totalSzjaBase: 500000,
          totalAllowances: 0,
          totalSzja: 75000,
          totalTb: 0,
          totalSzocho: 0,
          paymentCategories: ['1'],
          monthCount: 6,
        },
      ],
    });
    expect(m30HasBlockingErrors(issues)).toBe(false);
  });
});
