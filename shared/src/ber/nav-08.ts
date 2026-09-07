export interface NavFieldMapping {
  iceField: string;
  navFieldCode: string;
  transform?: 'DATE_ISO' | 'HUF' | 'TAX_ID' | 'NAME_UPPER' | 'YEAR' | 'INT';
  xmlPath?: string;
  required?: boolean;
}

export interface Nav08PersonLine {
  tagId: number;
  taxIdentificationNumber: string;
  name: string;
  birthDate: string;
  relationType: string;
  grossAmount: number;
  finalSzjaBase: number;
  calculatedSzja: number;
  tbAmount: number;
  szochoAmount: number;
  exemptionsJson?: Record<string, string>;
}

export interface Nav08Summary {
  personCount: number;
  totalGross: number;
  totalSzjaBase: number;
  totalSzja: number;
  totalTb: number;
  totalSzocho: number;
}

export interface Nav08ValidationIssue {
  severity: 'ERROR' | 'WARN';
  code: string;
  message: string;
  tagId?: number;
}

export interface Nav08ExportMeta {
  formCode: string;
  taxYear: number;
  period: string;
  cooperativeTaxId: string;
  cooperativeName: string;
}

export function summarizePersonLines(personLines: Nav08PersonLine[]): Nav08Summary {
  return {
    personCount: personLines.length,
    totalGross: personLines.reduce((s, p) => s + p.grossAmount, 0),
    totalSzjaBase: personLines.reduce((s, p) => s + p.finalSzjaBase, 0),
    totalSzja: personLines.reduce((s, p) => s + p.calculatedSzja, 0),
    totalTb: personLines.reduce((s, p) => s + p.tbAmount, 0),
    totalSzocho: personLines.reduce((s, p) => s + p.szochoAmount, 0),
  };
}

export function validateNav08(input: {
  period: string;
  personLines: Nav08PersonLine[];
  summary: Nav08Summary;
}): Nav08ValidationIssue[] {
  const issues: Nav08ValidationIssue[] = [];

  if (!input.period) {
    issues.push({ severity: 'ERROR', code: 'NAV08_MISSING_PERIOD', message: 'Időszak kötelező.' });
  }

  if (input.personLines.length === 0) {
    issues.push({ severity: 'ERROR', code: 'NAV08_NO_PERSONS', message: 'Nincs személyi sor.' });
  }

  const seen = new Set<string>();

  for (const p of input.personLines) {
    if (!p.taxIdentificationNumber?.trim()) {
      issues.push({
        severity: 'ERROR',
        code: 'NAV08_MISSING_TAX_ID',
        message: `${p.name}: adóazonosító kötelező.`,
        tagId: p.tagId,
      });
    }
    if (!p.name?.trim()) {
      issues.push({
        severity: 'ERROR',
        code: 'NAV08_MISSING_NAME',
        message: 'Név kötelező.',
        tagId: p.tagId,
      });
    }
    if (!p.birthDate) {
      issues.push({
        severity: 'ERROR',
        code: 'NAV08_MISSING_BIRTH_DATE',
        message: `${p.name}: születési dátum kötelező.`,
        tagId: p.tagId,
      });
    }
    if (p.grossAmount < 0) {
      issues.push({
        severity: 'ERROR',
        code: 'NAV08_GROSS_NEGATIVE',
        message: `${p.name}: bruttó nem lehet negatív.`,
        tagId: p.tagId,
      });
    }
    if (p.finalSzjaBase < 0 || p.calculatedSzja < 0) {
      issues.push({
        severity: 'ERROR',
        code: 'NAV08_SZJA_NEGATIVE',
        message: `${p.name}: SZJA adatok nem lehetnek negatívak.`,
        tagId: p.tagId,
      });
    }

    if (p.calculatedSzja === 0 && !p.exemptionsJson?.szja) {
      issues.push({
        severity: 'WARN',
        code: 'NAV08_ZERO_SZJA_NO_REASON',
        message: `${p.name}: SZJA 0 — rögzítsd a mentesség/kedvezmény okát.`,
        tagId: p.tagId,
      });
    }
    if (p.tbAmount === 0 && !p.exemptionsJson?.tb) {
      issues.push({
        severity: 'WARN',
        code: 'NAV08_ZERO_TB_NO_REASON',
        message: `${p.name}: TB 0 — rögzítsd a mentesség okát.`,
        tagId: p.tagId,
      });
    }
    if (p.szochoAmount === 0 && !p.exemptionsJson?.szocho) {
      issues.push({
        severity: 'WARN',
        code: 'NAV08_ZERO_SZOCHO_NO_REASON',
        message: `${p.name}: szocho 0 — rögzítsd a mentesség okát.`,
        tagId: p.tagId,
      });
    }

    const key = `${p.tagId}:${p.relationType}:${input.period}`;
    if (seen.has(key)) {
      issues.push({
        severity: 'ERROR',
        code: 'NAV08_DUPLICATE_PERSON',
        message: `${p.name}: duplikált személy ugyanarra a jogviszonyra és időszakra.`,
        tagId: p.tagId,
      });
    }
    seen.add(key);
  }

  const calcSummary = summarizePersonLines(input.personLines);
  if (
    calcSummary.totalGross !== input.summary.totalGross ||
    calcSummary.totalSzja !== input.summary.totalSzja ||
    calcSummary.totalSzjaBase !== input.summary.totalSzjaBase ||
    calcSummary.totalTb !== input.summary.totalTb ||
    calcSummary.totalSzocho !== input.summary.totalSzocho
  ) {
    issues.push({
      severity: 'ERROR',
      code: 'NAV08_SUM_MISMATCH',
      message: 'Az összesítő nem egyezik a személyi sorok összegével.',
    });
  }

  return issues;
}

export function nav08HasBlockingErrors(issues: Nav08ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'ERROR');
}
