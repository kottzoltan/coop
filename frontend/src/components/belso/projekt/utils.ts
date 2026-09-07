import { parseSzam } from '@coop/shared';

export function ft(n: number) {
  return new Intl.NumberFormat('hu-HU').format(Math.round(n)) + ' Ft';
}

export function parseArInput(v: string): number {
  return parseSzam(v);
}
