import type { BerezesMod, JelentkezesStatusz } from './enums.js';

/** Toborzási hirdetés (3.4) */
export interface Hirdetes {
  id: string;
  aktiv: boolean;
  projekt_statusz?: string;
  /** Projekt azonosítóra hivatkozik */
  projektszam: string;
  partner?: string;
  cim?: string;
  nyelv?: string;
  toborzo?: string;
  varos?: string;
  megtekintesek?: number;
  jelentkezok?: number;
  elfogadottak?: number;
  letrehozva?: string;
  /** Projekt Szereplőiből jön */
  felelos?: string;
  /** Projekt számfejtési bérekből választható kifizetési kód — nem szabad szöveg */
  kifizetesi_kod?: string;
  berezes?: BerezesMod;
  egyeni_ber?: string;
  extra_varos?: string;
  extra_varmegye?: string;
  munkanapok?: string[];
  szoveges_munkaido?: boolean;
  munkaido_leiras?: string;
  cimkek?: string[];
  min_korhatar?: number;
  erv_datum?: string;
  oneletrajz?: boolean;
  telefonszam?: boolean;
  megjegyzes?: string;
  nem_ertem_el?: string;
  munkavegzes_helye?: string;
  munkavegzes_idopontja?: string;
  berezes_szoveg?: string;
  befejezo_szoveg?: string;
  eloszo_fejlec?: string;
  eloszo_torzs: string;
  eloszo_lablec?: string;
  amit_kinalunk?: string;
  fobb_feladatok: string;
  elvarasok?: string;
  elonyt_jelent?: string;
  kep_nev?: string;
  kep_focim: string;
  kep_alcim?: string;
  kep_alcim_szin?: string;
}

/** Jelentkezés (3.4) */
export interface Jelentkezes {
  id: string;
  hirdetes_id: string;
  nev: string;
  email?: string;
  telefon?: string;
  datum?: string;
  statusz: JelentkezesStatusz;
}

/** „24 óra”, „48 óra”, „2 nap” → órákban */
export function parseNemErtemElOrak(szoveg: string | null | undefined): number {
  if (!szoveg?.trim()) return 24;
  const ora = szoveg.match(/(\d+)\s*(óra|ora|h)\b/i);
  if (ora) return Math.max(1, Number(ora[1]));
  const nap = szoveg.match(/(\d+)\s*(nap)\b/i);
  if (nap) return Math.max(1, Number(nap[1])) * 24;
  const szam = szoveg.match(/(\d+)/);
  if (szam) return Math.max(1, Number(szam[1]));
  return 24;
}

/** Hátralévő órák a visszaállításig (0 ha lejárt) */
export function nemErtemElHatralevoOrak(
  nemErtemElAt: string | Date,
  limitSzoveg: string | null | undefined,
): number {
  const at = nemErtemElAt instanceof Date ? nemErtemElAt : new Date(nemErtemElAt);
  const limit = parseNemErtemElOrak(limitSzoveg) * 60 * 60 * 1000;
  const hatra = limit - (Date.now() - at.getTime());
  return Math.max(0, Math.ceil(hatra / (60 * 60 * 1000)));
}
