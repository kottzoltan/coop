import { describe, expect, it } from 'vitest';
import {
  nav08eHasBlockingErrors,
  nav08eStatusFromStartDate,
  validateNav08e,
} from '../nav-08e.js';

const baseInput = {
  tagId: 1,
  name: 'Teszt Diák',
  taxIdentificationNumber: '8123456789',
  birthDate: '2003-01-01',
  taj: '123456789',
  relationType: 'EMPLOYMENT' as const,
  startDate: '2026-01-01',
  endDate: null,
  navDeclarationRequired: true,
  membershipAgreementSigned: true,
  status: 'READY' as const,
};

describe('validateNav08e', () => {
  it('hibát ad ha nem kötelező a bejelentés', () => {
    const issues = validateNav08e({ ...baseInput, navDeclarationRequired: false });
    expect(nav08eHasBlockingErrors(issues)).toBe(true);
    expect(issues.some((i) => i.code === 'NAV08E_NOT_REQUIRED')).toBe(true);
  });

  it('figyelmeztet iskolaszövetkezeti tagi munkára', () => {
    const issues = validateNav08e({
      ...baseInput,
      relationType: 'SCHOOL_COOP_MEMBER_WORK',
      navDeclarationRequired: true,
    });
    expect(issues.some((i) => i.code === 'NAV08E_SCHOOL_COOP_DEFAULT')).toBe(true);
  });

  it('hibát ad aláíratlan tagsági szerződésre', () => {
    const issues = validateNav08e({ ...baseInput, membershipAgreementSigned: false });
    expect(issues.some((i) => i.code === 'NAV08E_CONTRACT_UNSIGNED')).toBe(true);
  });

  it('elfogad érvényes munkaviszony bejelentést', () => {
    const issues = validateNav08e(baseInput);
    expect(nav08eHasBlockingErrors(issues)).toBe(false);
  });
});

describe('nav08eStatusFromStartDate', () => {
  it('SCHEDULED ha a kezdés a jövőben van', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(nav08eStatusFromStartDate(future.toISOString().slice(0, 10))).toBe('SCHEDULED');
  });

  it('READY ha a kezdés múltban vagy ma van', () => {
    expect(nav08eStatusFromStartDate('2020-01-01')).toBe('READY');
  });
});
