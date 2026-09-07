import type { MunkaHirdetes } from '../../api/coop';

export function sorokbol(szoveg: string | null | undefined): string[] {
  if (!szoveg?.trim()) return [];
  return szoveg
    .split('\n')
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

export function berSzoveg(munka: MunkaHirdetes): string {
  if (munka.berezes_szoveg?.trim()) return munka.berezes_szoveg.trim();
  if (munka.berezes === 'Egyéni' && munka.egyeni_ber) return munka.egyeni_ber;
  return `${munka.ber.toLocaleString('hu-HU')} Ft/óra`;
}

export function cimkekTomb(munka: MunkaHirdetes): string[] {
  return munka.cimkek?.split(',').map((c) => c.trim()).filter(Boolean) ?? [];
}
