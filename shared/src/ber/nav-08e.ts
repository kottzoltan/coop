export interface Nav08eExportInput {
  tagId: number;
  name: string;
  taxIdentificationNumber: string;
  birthDate: string;
  taj: string | null;
  relationType: string;
  startDate: string;
  endDate: string | null;
  navDeclarationRequired: boolean;
  membershipAgreementSigned: boolean;
  status: 'DRAFT' | 'SCHEDULED' | 'READY' | 'EXPORTED' | 'SUBMITTED';
}

export interface Nav08eValidationIssue {
  severity: 'ERROR' | 'WARN';
  code: string;
  message: string;
}

export function validateNav08e(input: Nav08eExportInput): Nav08eValidationIssue[] {
  const issues: Nav08eValidationIssue[] = [];

  if (!input.navDeclarationRequired) {
    issues.push({
      severity: 'ERROR',
      code: 'NAV08E_NOT_REQUIRED',
      message: 'Ehhez a jogviszonyhoz nem kötelező biztosítotti bejelentés.',
    });
  }

  if (input.relationType === 'SCHOOL_COOP_MEMBER_WORK') {
    issues.push({
      severity: 'WARN',
      code: 'NAV08E_SCHOOL_COOP_DEFAULT',
      message: 'Iskolaszövetkezeti tagi munkára alapértelmezetten nem kell 08E.',
    });
  }

  if (!input.membershipAgreementSigned) {
    issues.push({
      severity: 'ERROR',
      code: 'NAV08E_CONTRACT_UNSIGNED',
      message: 'A tagsági szerződés nincs aláírva — nem beküldhető.',
    });
  }

  if (!input.taxIdentificationNumber?.trim()) {
    issues.push({ severity: 'ERROR', code: 'NAV08E_MISSING_TAX_ID', message: 'Adóazonosító kötelező.' });
  }
  if (!input.name?.trim()) {
    issues.push({ severity: 'ERROR', code: 'NAV08E_MISSING_NAME', message: 'Név kötelező.' });
  }
  if (!input.birthDate) {
    issues.push({ severity: 'ERROR', code: 'NAV08E_MISSING_BIRTH_DATE', message: 'Születési dátum kötelező.' });
  }

  return issues;
}

export function nav08eHasBlockingErrors(issues: Nav08eValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'ERROR');
}

export function nav08eStatusFromStartDate(startDate: string): 'SCHEDULED' | 'READY' {
  const today = new Date().toISOString().slice(0, 10);
  return startDate > today ? 'SCHEDULED' : 'READY';
}
