import type { MunkalapDiak } from '../../../../shared/src/munkalap.js';
import { diakBruttoOra, orakKozott } from '../../../../shared/src/munkalap.js';
import type { SzjaKedvezmeny } from '../../../../shared/src/tag.js';
import type { AllowanceType, RelationType, TaxAllowanceDeclaration } from '../../../../shared/src/ber/types.js';

export const CALCULATION_VERSION = '1.0.0';

export type BerKod = { id?: string; ar?: number; nev?: string };

export interface BuiltPayrollLine {
  tagId: number;
  projektId: number;
  wageCodeId: string;
  grossAmount: number;
  workHours: number;
  workDateFrom: string | null;
  workDateTo: string | null;
  jogviszonyTipus: RelationType;
  sourceMunkalapId: number;
}

function parseDiakok(raw: unknown): MunkalapDiak[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
    .map((d) => ({
      student_id: Number(d.student_id) || 0,
      student_nev: typeof d.student_nev === 'string' ? d.student_nev : undefined,
      idoadatok:
        d.idoadatok && typeof d.idoadatok === 'object'
          ? (d.idoadatok as MunkalapDiak['idoadatok'])
          : {},
    }));
}

function napKulcsRendezett(kulcs: string): string {
  return kulcs;
}

export function buildLinesFromMunkalap(
  munkalap: {
    id: number;
    projektId: number;
    szfIdoszak: string;
    diakok: unknown;
  },
  berKodok: BerKod[],
  tagJogviszony: Map<number, RelationType>,
): BuiltPayrollLine[] {
  const diakok = parseDiakok(munkalap.diakok);
  const sorok: BuiltPayrollLine[] = [];

  for (const diak of diakok) {
    if (!diak.student_id) continue;

    const byKod = new Map<
      string,
      { gross: number; hours: number; napok: string[] }
    >();

    for (const [nap, e] of Object.entries(diak.idoadatok ?? {})) {
      const kod = e.kod ?? '1';
      const hours = orakKozott(e.tol, e.ig);
      const ar = berKodok.find((b) => b.id === kod)?.ar ?? 0;
      const gross = hours * ar;
      if (gross <= 0 && hours <= 0) continue;

      const prev = byKod.get(kod) ?? { gross: 0, hours: 0, napok: [] };
      prev.gross += gross;
      prev.hours += hours;
      prev.napok.push(napKulcsRendezett(nap));
      byKod.set(kod, prev);
    }

    for (const [wageCodeId, agg] of byKod) {
      const napok = agg.napok.sort();
      sorok.push({
        tagId: diak.student_id,
        projektId: munkalap.projektId,
        wageCodeId,
        grossAmount: Math.round(agg.gross),
        workHours: Math.round(agg.hours * 100) / 100,
        workDateFrom: napok[0] ? `${munkalap.szfIdoszak}-${napok[0].padStart(2, '0')}` : null,
        workDateTo: napok.length
          ? `${munkalap.szfIdoszak}-${napok[napok.length - 1].padStart(2, '0')}`
          : null,
        jogviszonyTipus: tagJogviszony.get(diak.student_id) ?? 'SCHOOL_COOP_MEMBER_WORK',
        sourceMunkalapId: munkalap.id,
      });
    }
  }

  return sorok;
}

export function inferJogviszonyFromTag(tag: {
  diakigMunkarend: string | null;
}): RelationType {
  return 'SCHOOL_COOP_MEMBER_WORK';
}

export function isFullTimeStudent(tag: {
  diakigMunkarend: string | null;
}): boolean {
  const m = (tag.diakigMunkarend ?? 'nappali').toLowerCase();
  return m === 'nappali' || m === 'tanköteles';
}

const SZJA_TIPUS_MAP: Record<string, AllowanceType> = {
  négy_gyermek_anyuka: 'MOTHERS_4_OR_MORE',
  személyi: 'PERSONAL_ALLOWANCE',
  első_házas: 'FIRST_MARRIAGE',
  családi: 'FAMILY_ALLOWANCE',
};

export function mapTagSzjaKedvezmenyek(
  raw: unknown,
  payrollPeriod: string,
): TaxAllowanceDeclaration[] {
  if (!Array.isArray(raw)) return [];

  const [yearStr, monthStr] = payrollPeriod.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const periodStart = `${payrollPeriod}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${payrollPeriod}-${String(lastDay).padStart(2, '0')}`;

  return raw
    .filter((k): k is SzjaKedvezmeny => k != null && typeof k === 'object' && 'tipus' in k)
    .map((k) => {
      const allowanceType = SZJA_TIPUS_MAP[k.tipus as string];
      if (!allowanceType) return null;

      const status =
        k.statusz === 'aktív' &&
        k.ervenyes_tol <= periodEnd &&
        (!k.ervenyes_ig || k.ervenyes_ig >= periodStart)
          ? ('AKTIV' as const)
          : k.statusz === 'megszűnt'
            ? ('LEJART' as const)
            : ('LEJART' as const);

      return {
        allowanceType,
        validFrom: k.ervenyes_tol,
        validTo: k.ervenyes_ig,
        requestedMonthlyAmount: k.havi_adokedvezmeny,
        status,
      };
    })
    .filter((d): d is TaxAllowanceDeclaration => d != null && d.status === 'AKTIV');
}

/** Bruttó összeg ellenőrzés — diakBruttoOra összevetés */
export function diakOsszBrutto(diak: MunkalapDiak, berKodok: BerKod[]): number {
  return diakBruttoOra(diak, berKodok).brutto;
}
