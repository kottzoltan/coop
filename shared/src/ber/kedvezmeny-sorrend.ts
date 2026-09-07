import type { AllowanceType } from './types.js';

/** SZJA-kedvezmények érvényesítési sorrendje (jogszabályi prioritás) */
export const ALLOWANCE_PRIORITY: AllowanceType[] = [
  'MOTHERS_4_OR_MORE',
  'UNDER_25',
  'UNDER_30_MOTHER',
  'PERSONAL_ALLOWANCE',
  'FIRST_MARRIAGE',
  'FAMILY_ALLOWANCE',
  'FAMILY_CONTRIBUTION_ALLOWANCE',
];
