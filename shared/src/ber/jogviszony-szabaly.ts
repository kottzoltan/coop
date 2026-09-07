import type { EmploymentRelationInput, RelationType } from './types.js';

export interface JogviszonySzabaly {
  isInsured: boolean;
  tbExemptReason: string | null;
  szochoExemptReason: string | null;
  navDeclarationRequired: boolean;
  szjaApplicable: boolean;
}

export const JOGVISZONY_ALAPERTELMEZES: Record<RelationType, JogviszonySzabaly> = {
  SCHOOL_COOP_MEMBER_WORK: {
    isInsured: false,
    tbExemptReason: 'ISKOLASZOVETKEZETI_TAG_NAPPALI',
    szochoExemptReason: 'ISKOLASZOVETKEZETI_JOGVISZONY',
    navDeclarationRequired: false,
    szjaApplicable: true,
  },
  EMPLOYMENT: {
    isInsured: true,
    tbExemptReason: null,
    szochoExemptReason: null,
    navDeclarationRequired: true,
    szjaApplicable: true,
  },
  ASSIGNMENT: {
    isInsured: true,
    tbExemptReason: null,
    szochoExemptReason: null,
    navDeclarationRequired: true,
    szjaApplicable: true,
  },
  SIMPLIFIED_EMPLOYMENT: {
    isInsured: false,
    tbExemptReason: 'EGYSZERUSITETT_FOGLALKOZTATAS',
    szochoExemptReason: 'EGYSZERUSITETT_FOGLALKOZTATAS',
    navDeclarationRequired: false,
    szjaApplicable: true,
  },
  OTHER: {
    isInsured: false,
    tbExemptReason: null,
    szochoExemptReason: null,
    navDeclarationRequired: false,
    szjaApplicable: true,
  },
};

export function resolveJogviszonyRule(relation: EmploymentRelationInput): JogviszonySzabaly {
  const base = JOGVISZONY_ALAPERTELMEZES[relation.relationType];
  return {
    isInsured: relation.isInsured ?? base.isInsured,
    tbExemptReason: relation.tbExemptReason ?? base.tbExemptReason,
    szochoExemptReason: relation.szochoExemptReason ?? base.szochoExemptReason,
    navDeclarationRequired: relation.navDeclarationRequired ?? base.navDeclarationRequired,
    szjaApplicable: base.szjaApplicable,
  };
}

export function mapIncomeCategory(relationType: RelationType): string {
  switch (relationType) {
    case 'SCHOOL_COOP_MEMBER_WORK':
      return 'ISKOLASZOVETKEZETI_TAGI_DIÁKMUNKA';
    case 'EMPLOYMENT':
      return 'MUNKAVISZONY';
    case 'ASSIGNMENT':
      return 'MEGBIZAS';
    case 'SIMPLIFIED_EMPLOYMENT':
      return 'EGYSZERUSITETT_FOGLALKOZTATAS';
    default:
      return 'EGYEB';
  }
}
