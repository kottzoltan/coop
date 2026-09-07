export interface M30PersonSummary {
  tagId: number;
  name: string;
  taxIdentificationNumber: string;
  birthDate: string;
  taxYear: number;
  totalGross: number;
  totalSzjaBase: number;
  totalAllowances: number;
  totalSzja: number;
  totalTb: number;
  totalSzocho: number;
  paymentCategories: string[];
  monthCount: number;
}

export interface M30ValidationIssue {
  severity: 'ERROR' | 'WARN';
  code: string;
  message: string;
  tagId?: number;
}

export function validateM30(input: {
  taxYear: number;
  summaries: M30PersonSummary[];
}): M30ValidationIssue[] {
  const issues: M30ValidationIssue[] = [];
  if (!input.taxYear || input.taxYear < 2000) {
    issues.push({ severity: 'ERROR', code: 'M30_INVALID_YEAR', message: 'Érvénytelen adóév.' });
  }
  if (input.summaries.length === 0) {
    issues.push({ severity: 'ERROR', code: 'M30_NO_DATA', message: 'Nincs kifizetési adat az adóévre.' });
  }
  for (const s of input.summaries) {
    if (!s.taxIdentificationNumber?.trim()) {
      issues.push({
        severity: 'ERROR',
        code: 'M30_MISSING_TAX_ID',
        message: `${s.name}: hiányzó adóazonosító.`,
        tagId: s.tagId,
      });
    }
    if (s.totalGross < 0) {
      issues.push({
        severity: 'ERROR',
        code: 'M30_NEGATIVE_GROSS',
        message: `${s.name}: negatív bruttó.`,
        tagId: s.tagId,
      });
    }
  }
  return issues;
}

export function m30HasBlockingErrors(issues: M30ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'ERROR');
}
