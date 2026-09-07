import type { RoundingMode } from './types.js';

export function roundMoney(amount: number, mode: RoundingMode): number {
  switch (mode) {
    case 'ceil':
      return Math.ceil(amount);
    case 'round':
      return Math.round(amount);
    case 'floor':
    default:
      return Math.floor(amount);
  }
}
