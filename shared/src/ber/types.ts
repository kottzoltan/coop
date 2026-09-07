/** Bérszámfejtés + adószámítás domain típusok */

export type RelationType =
  | 'SCHOOL_COOP_MEMBER_WORK'
  | 'EMPLOYMENT'
  | 'ASSIGNMENT'
  | 'SIMPLIFIED_EMPLOYMENT'
  | 'OTHER';

export type AllowanceType =
  | 'MOTHERS_4_OR_MORE'
  | 'UNDER_25'
  | 'UNDER_30_MOTHER'
  | 'PERSONAL_ALLOWANCE'
  | 'FIRST_MARRIAGE'
  | 'FAMILY_ALLOWANCE'
  | 'FAMILY_CONTRIBUTION_ALLOWANCE';

export type AllowanceDeclarationStatus = 'AKTIV' | 'ELUTASITVA' | 'LEJART' | 'PISZKOZAT';

export type RoundingMode = 'floor' | 'round' | 'ceil';

export interface RoundingRules {
  szja: RoundingMode;
  tb: RoundingMode;
  szocho: RoundingMode;
}

export interface FamilyAllowanceRule {
  childrenCount: number;
  monthlyAmount: number;
  sharedEligible?: boolean;
}

export interface TaxYearConfig {
  taxYear: number;
  szjaRate: number;
  tbRate: number;
  szochoRate: number;
  under25MonthlyAllowanceLimit: number;
  personalAllowanceMonthlyLimit: number;
  firstMarriageMonthlyAllowance: number;
  familyAllowanceRules: FamilyAllowanceRule[];
  roundingRules: RoundingRules;
}

export interface PayrollLineInput {
  grossAmount: number;
  wageCodeId?: string;
  workHours?: number;
}

export interface MemberInput {
  id?: number;
  name?: string;
  birthDate: string | null;
  taxIdentificationNumber?: string | null;
}

export interface MembershipInput {
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface StudentStatusInput {
  isFullTime: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface TaxProfileInput {
  /** Üres vagy kiegészítő profil — jelenleg a kedvezmények a nyilatkozatokból jönnek */
}

export interface EmploymentRelationInput {
  relationType: RelationType;
  isInsured: boolean;
  tbExemptReason?: string | null;
  szochoExemptReason?: string | null;
  navDeclarationRequired?: boolean;
}

export interface TaxAllowanceDeclaration {
  allowanceType: AllowanceType;
  validFrom: string;
  validTo?: string | null;
  requestedMonthlyAmount?: number | null;
  sharedWithSpouse?: boolean;
  status: AllowanceDeclarationStatus;
}

export interface AppliedAllowance {
  type: AllowanceType;
  amount: number;
  source: 'AUTO' | 'DECLARATION';
  monthlyCapUsed: number;
}

export interface TaxCalculationResult {
  initialSzjaBase: number;
  appliedAllowances: AppliedAllowance[];
  finalSzjaBase: number;
  calculatedSzja: number;
  tbBase: number;
  tbAmount: number;
  szochoBase: number;
  szochoAmount: number;
  netAmount: number;
  tbExemptReason: string | null;
  szochoExemptReason: string | null;
  incomeCategory: string;
}

export interface CalculatePayrollTaxesInput {
  payrollLine: PayrollLineInput;
  member: MemberInput;
  membership: MembershipInput;
  studentStatus: StudentStatusInput | null;
  taxProfile: TaxProfileInput;
  taxYearConfig: TaxYearConfig;
  activeAllowances: TaxAllowanceDeclaration[];
  employmentRelation: EmploymentRelationInput;
  payrollPeriod: string;
  calculationVersion: string;
}
