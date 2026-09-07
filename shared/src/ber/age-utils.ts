/** Életkor a számfejtési hónap utolsó napján */
export function ageAtEndOfPayrollMonth(birthDate: string, payrollPeriod: string): number {
  const [yearStr, monthStr] = payrollPeriod.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const lastDay = new Date(year, month, 0);

  const birth = new Date(birthDate);
  let age = lastDay.getFullYear() - birth.getFullYear();
  const monthDiff = lastDay.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && lastDay.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function isUnder25AtPayrollMonth(birthDate: string, payrollPeriod: string): boolean {
  return ageAtEndOfPayrollMonth(birthDate, payrollPeriod) < 25;
}

export function isUnder30AtPayrollMonth(birthDate: string, payrollPeriod: string): boolean {
  return ageAtEndOfPayrollMonth(birthDate, payrollPeriod) < 30;
}

/** Nyilatkozat érvényes a számfejtési hónapban */
export function allowanceValidInPeriod(
  validFrom: string,
  validTo: string | null | undefined,
  payrollPeriod: string,
): boolean {
  const [yearStr, monthStr] = payrollPeriod.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const periodStart = `${payrollPeriod}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${payrollPeriod}-${String(lastDay).padStart(2, '0')}`;

  if (validFrom > periodEnd) return false;
  if (validTo && validTo < periodStart) return false;
  return true;
}
