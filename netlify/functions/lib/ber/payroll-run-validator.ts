import type { BerSzamfejtettSorRow } from '../../../../db/schema.js';

export type ValidationSeverity = 'ERROR' | 'WARN';

export interface PayrollValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  tagId?: number;
  munkalapId?: number;
  payrollLineId?: number;
}

interface TagForValidation {
  id: number;
  nev: string;
  adoszam: string | null;
  szuldat: string | null;
  tagsagStatusz: string;
  diakigErvenyes: string | null;
}

interface MunkalapForValidation {
  id: number;
  azonosito: string;
  statusz: string;
  szfIdoszak: string;
}

export function validatePayrollRun(input: {
  futas: { payrollPeriod: string; status: string };
  munkalapok: MunkalapForValidation[];
  sorok: BerSzamfejtettSorRow[];
  tagok: TagForValidation[];
}): PayrollValidationIssue[] {
  const issues: PayrollValidationIssue[] = [];
  const tagMap = new Map(input.tagok.map((t) => [t.id, t]));

  if (input.munkalapok.length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'PR_NO_MUNKALAP',
      message: 'Nincs jóváhagyott munkalap a futáshoz.',
    });
  }

  for (const ml of input.munkalapok) {
    if (ml.statusz !== 'Jóváhagyott' && ml.statusz !== 'Korrekció Jóváhagyott') {
      issues.push({
        severity: 'ERROR',
        code: 'PR_MUNKALAP_NOT_APPROVED',
        message: `A ${ml.azonosito} munkalap nincs jóváhagyva (${ml.statusz}).`,
        munkalapId: ml.id,
      });
    }
    if (ml.szfIdoszak !== input.futas.payrollPeriod) {
      issues.push({
        severity: 'ERROR',
        code: 'PR_MUNKALAP_PERIOD_MISMATCH',
        message: `A ${ml.azonosito} munkalap szf_idoszak (${ml.szfIdoszak}) nem egyezik a futás időszakával.`,
        munkalapId: ml.id,
      });
    }
  }

  if (input.sorok.length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'PR_NO_LINES',
      message: 'Nincs bérszámfejtési sor — ellenőrizd a munkalap diák adatokat.',
    });
  }

  const seen = new Set<string>();

  for (const sor of input.sorok) {
    if (sor.grossAmount < 0) {
      issues.push({
        severity: 'ERROR',
        code: 'PR_GROSS_NEGATIVE',
        message: 'Negatív bruttó összeg.',
        tagId: sor.tagId,
        payrollLineId: sor.id,
      });
    }

    const key = `${sor.tagId}:${sor.projektId}:${sor.wageCodeId}:${sor.sourceMunkalapId}`;
    if (seen.has(key)) {
      issues.push({
        severity: 'WARN',
        code: 'PR_DUPLICATE_LINE',
        message: 'Duplikált sor ugyanarra a tag+projekt+kód+munkalap kombinációra.',
        tagId: sor.tagId,
        payrollLineId: sor.id,
        munkalapId: sor.sourceMunkalapId ?? undefined,
      });
    }
    seen.add(key);

    const tag = tagMap.get(sor.tagId);
    if (!tag) {
      issues.push({
        severity: 'ERROR',
        code: 'PR_TAG_NOT_FOUND',
        message: `Ismeretlen tag (id: ${sor.tagId}).`,
        tagId: sor.tagId,
        payrollLineId: sor.id,
      });
      continue;
    }

    if (!tag.adoszam?.trim()) {
      issues.push({
        severity: 'ERROR',
        code: 'PR_TAG_MISSING_TAX_ID',
        message: `${tag.nev}: hiányzó adóazonosító jel.`,
        tagId: tag.id,
        payrollLineId: sor.id,
      });
    }

    if (!tag.szuldat) {
      issues.push({
        severity: 'ERROR',
        code: 'PR_TAG_MISSING_BIRTH_DATE',
        message: `${tag.nev}: hiányzó születési dátum.`,
        tagId: tag.id,
        payrollLineId: sor.id,
      });
    }

    const aktiv = ['aktív', 'felfüggesztett'].includes(tag.tagsagStatusz.toLowerCase());
    if (!aktiv) {
      issues.push({
        severity: 'ERROR',
        code: 'PR_TAG_INACTIVE',
        message: `${tag.nev}: tagság nem aktív (${tag.tagsagStatusz}).`,
        tagId: tag.id,
        payrollLineId: sor.id,
      });
    }

    if (tag.diakigErvenyes && tag.diakigErvenyes < `${input.futas.payrollPeriod}-01`) {
      issues.push({
        severity: 'WARN',
        code: 'PR_STUDENT_STATUS_EXPIRED',
        message: `${tag.nev}: diákigazolvány / hallgatói jogviszony lejárt.`,
        tagId: tag.id,
        payrollLineId: sor.id,
      });
    }
  }

  return issues;
}

export function hasBlockingErrors(issues: PayrollValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'ERROR');
}
