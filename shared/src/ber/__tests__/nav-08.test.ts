import { describe, expect, it } from 'vitest';
import {
  nav08HasBlockingErrors,
  summarizePersonLines,
  validateNav08,
  type Nav08PersonLine,
} from '../nav-08.js';

const basePerson = (overrides: Partial<Nav08PersonLine> = {}): Nav08PersonLine => ({
  tagId: 1,
  taxIdentificationNumber: '8123456789',
  name: 'Teszt Diák',
  birthDate: '2003-01-15',
  relationType: 'SCHOOL_COOP_MEMBER_WORK',
  grossAmount: 300_000,
  finalSzjaBase: 0,
  calculatedSzja: 0,
  tbAmount: 0,
  szochoAmount: 0,
  exemptionsJson: { szja: 'UNDER_25', tb: 'ISKOLASZOVETKEZETI_TAG_NAPPALI', szocho: 'ISKOLASZOVETKEZETI_JOGVISZONY' },
  ...overrides,
});

describe('validateNav08', () => {
  it('összesítő és személyi sorok egyeznek', () => {
    const personLines = [basePerson(), basePerson({ tagId: 2, name: 'Másik', taxIdentificationNumber: '8987654321' })];
    const summary = summarizePersonLines(personLines);
    const issues = validateNav08({ period: '2026-03', personLines, summary });
    expect(nav08HasBlockingErrors(issues)).toBe(false);
  });

  it('hibás adóazonosító esetén validációs hiba', () => {
    const personLines = [basePerson({ taxIdentificationNumber: '' })];
    const summary = summarizePersonLines(personLines);
    const issues = validateNav08({ period: '2026-03', personLines, summary });
    expect(issues.some((i) => i.code === 'NAV08_MISSING_TAX_ID')).toBe(true);
    expect(nav08HasBlockingErrors(issues)).toBe(true);
  });

  it('összesítő eltérés hibát dob', () => {
    const personLines = [basePerson()];
    const summary = summarizePersonLines(personLines);
    summary.totalGross += 1000;
    const issues = validateNav08({ period: '2026-03', personLines, summary });
    expect(issues.some((i) => i.code === 'NAV08_SUM_MISMATCH')).toBe(true);
  });

  it('duplikált személy+jogviszony+időszak hibás', () => {
    const personLines = [
      basePerson({ tagId: 1 }),
      basePerson({ tagId: 1, grossAmount: 100_000 }),
    ];
    const summary = summarizePersonLines(personLines);
    const issues = validateNav08({ period: '2026-03', personLines, summary });
    expect(issues.some((i) => i.code === 'NAV08_DUPLICATE_PERSON')).toBe(true);
  });
});
