export type IntezmenyTipus = 'egyetem' | 'kozepiskola';

export interface MagyarIntezmeny {
  id: string;
  nev: string;
  tipus: IntezmenyTipus;
  varos: string;
  /** Rövidítés / kereső alias (pl. ELTE, BME) */
  aliasok?: string[];
}

export function intezmenyKulcs(nev: string, varos: string, tipus: IntezmenyTipus): string {
  return `${tipus}:${varos}:${nev}`.toLowerCase();
}

/** Ékezet- és írásjelmentes kereséshez */
export function normalizaltKereses(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function egyezesiPont(intezmeny: MagyarIntezmeny, q: string): number {
  const nev = normalizaltKereses(intezmeny.nev);
  const varos = normalizaltKereses(intezmeny.varos);
  const aliasok = (intezmeny.aliasok ?? []).map(normalizaltKereses);

  if (nev.startsWith(q)) return 100;
  if (aliasok.some((a) => a === q || a.startsWith(q))) return 95;
  if (nev.includes(q)) return 80;
  if (varos.startsWith(q)) return 70;
  if (varos.includes(q)) return 60;
  if (aliasok.some((a) => a.includes(q))) return 55;

  const szavak = q.split(' ').filter(Boolean);
  if (szavak.length > 1 && szavak.every((s) => nev.includes(s) || varos.includes(s))) return 50;
  if (szavak.some((s) => nev.includes(s))) return 40;
  if (szavak.some((s) => varos.includes(s))) return 35;

  return 0;
}

export function keresIntezmenyek(
  lista: MagyarIntezmeny[],
  kereso: string,
  tipus?: IntezmenyTipus,
  limit = 12,
): MagyarIntezmeny[] {
  const q = normalizaltKereses(kereso);
  if (q.length < 2) return [];

  const szurt = lista.filter((i) => !tipus || i.tipus === tipus);
  const pontok = szurt
    .map((i) => ({ i, p: egyezesiPont(i, q) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.i.nev.localeCompare(b.i.nev, 'hu'));

  return pontok.slice(0, limit).map((x) => x.i);
}
