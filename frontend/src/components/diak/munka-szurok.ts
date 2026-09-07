import type { MunkaHirdetes } from '../../api/coop';

/** Kanonikus munkakör lista (SAM / melodiak.hu) */
export const MUNKAKOROK = [
  'Promóciós, host/hostess, animátor',
  'Fizikai, gyári, raktári',
  'Üzlet, bolt, értékesítés',
  'Adminisztratív, irodai',
  'Vendéglátás, gyorsétterem, turizmus',
  'Telefonos munka, értékesítés, piackutatás',
  'HR, jog, oktatás',
  'Gazdasági, pénzügyi, marketing',
] as const;

/** Címke lista — legalább egy egyezés */
export const CIMKEK = [
  'gyakornoki, szakmai munkák',
  'hétvégi munkák',
  'délutános munkák',
  'éjszakás munkák',
  '18 alatt is végezhető',
  'nyelvtudást igénylő',
  'munkák szállással',
  'otthon végezhető',
  'hosszútávú munkák',
  'alkalmi munkák',
] as const;

/** Gyors kategória chip a keresősáv alatt */
export const GYORS_KATEGORIAK = [
  { id: '', label: 'Összes' },
  { id: 'vendéglátás', label: 'Vendéglátás' },
  { id: 'adminisztratív', label: 'Adminisztratív' },
  { id: 'host', label: 'Host/Hostess' },
  { id: 'fizikai', label: 'Fizikai' },
  { id: 'értékesítés', label: 'Értékesítés' },
  { id: 'alkalmi', label: 'Alkalmi' },
] as const;

export const MIN_BER_OPCIOK = [1800, 2000, 2200, 2400] as const;

export type MunkaSzuroAllapot = {
  munkakor: string;
  cimkek: string[];
  minBer: number | null;
};

export const URES_SZURO: MunkaSzuroAllapot = {
  munkakor: '',
  cimkek: [],
  minBer: null,
};

export function szurokSzama(s: MunkaSzuroAllapot, varos: string, gyorsKategoria: string): number {
  let n = 0;
  if (s.munkakor) n++;
  if (s.cimkek.length) n += s.cimkek.length;
  if (s.minBer != null) n++;
  if (varos) n++;
  if (gyorsKategoria) n++;
  return n;
}

export function alkalmazSzurok(
  munkak: MunkaHirdetes[],
  szuro: MunkaSzuroAllapot,
  gyorsKategoria: string,
): MunkaHirdetes[] {
  return munkak.filter((m) => {
    if (szuro.munkakor && m.munkakor !== szuro.munkakor) return false;
    if (szuro.minBer != null && m.ber < szuro.minBer) return false;

    if (szuro.cimkek.length > 0) {
      const lista = m.cimkek?.toLowerCase() ?? '';
      const egyezik = szuro.cimkek.some((c) => lista.includes(c.toLowerCase()));
      if (!egyezik) return false;
    }

    if (gyorsKategoria) {
      const a = gyorsKategoria.toLowerCase();
      const illeszkedik =
        m.munkakor.toLowerCase().includes(a) ||
        (m.cimkek?.toLowerCase().includes(a) ?? false) ||
        m.cim.toLowerCase().includes(a);
      if (!illeszkedik) return false;
    }

    return true;
  });
}
