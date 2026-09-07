import type { MunkalapStatusz } from './enums.js';
import type { HonapIdoszak, NapKulcs } from './common.js';

export const MUNKALAP_STATUSZOK: MunkalapStatusz[] = [
  'Piszkozat',
  'Lezárt',
  'Jóváhagyott',
  'Elutasított',
  'Számfejtett',
  'Korrekció Piszkozat',
  'Korrekció Lezárt',
  'Korrekció Jóváhagyott',
  'Korrekció Elutasított',
];

export const MUNKALAP_STATUS_BETU: Record<string, { l: string; c: string }> = {
  Piszkozat: { l: 'P', c: '#8A8570' },
  Lezárt: { l: 'L', c: '#B8863F' },
  Jóváhagyott: { l: 'J', c: '#2F7A4E' },
  Elutasított: { l: 'E', c: '#B4402C' },
  Számfejtett: { l: 'K', c: '#1C4E7A' },
  'Korrekció Piszkozat': { l: 'KP', c: '#8A8570' },
  'Korrekció Lezárt': { l: 'KL', c: '#B8863F' },
  'Korrekció Jóváhagyott': { l: 'KJ', c: '#2F7A4E' },
  'Korrekció Elutasított': { l: 'KE', c: '#B4402C' },
};

export function munkalapSzerkesztheto(statusz: string): boolean {
  return (
    statusz === 'Piszkozat' ||
    statusz === 'Elutasított' ||
    statusz === 'Korrekció Piszkozat' ||
    statusz === 'Korrekció Elutasított'
  );
}

export function munkalapKorrekcios(statusz: string): boolean {
  return statusz.startsWith('Korrekció');
}

/** Controlling flag címkék (mock/spec sorrend) */
export const MUNKALAP_CONTROLLING_SOROK = [
  { key: 'magas_brutto_ber' as const, label: 'Magas bruttó bér?', hint: '>300 000 Ft/diák' },
  { key: 'magas_oraszam' as const, label: 'Magas óraszám?', hint: '>200 óra/diák' },
  { key: 'keves_alapber' as const, label: 'Kevés alapbér?', hint: 'bérkód < aktuális minimálbér' },
  { key: 'problemas_szunet' as const, label: 'Problémás szünet?', hint: 'egybefüggő műszak >9 óra' },
];

/** Napi munkaidő bejegyzés a havi naptár-rácson */
export interface NapiIdoadat {
  kod?: string;
  tol?: string;
  ig?: string;
}

/** Tag meta a munkalap diák sorokhoz (join szovetkezeti_tag) */
export interface MunkalapTagMeta {
  azonosito: number;
  szuldat?: string | null;
  adoszam?: string;
  /** NAV bejelentés dátuma — jelenleg tagság kezdete (belepes) */
  nav_bejelentes?: string | null;
  tagsag_kezdete?: string | null;
  tagsag_vege?: string | null;
  tagsag_statusz?: string;
}

/** Diák a munkalapon (API) */
export interface MunkalapDiak {
  id?: number;
  student_id: number;
  student_nev?: string;
  idoadatok: Record<NapKulcs, NapiIdoadat>;
  cimkek?: string[];
  hozzaadva?: string;
}

/** Kifizetés bontás összesítő sor */
export interface KifizetesBontasSor {
  azonosito: string;
  megnevezes: string;
  egysegar: number;
  mennyiseg: number;
  osszesen: number;
}

/** Controlling flag-ek (munkalap lezáráskor) */
export interface MunkalapControlling {
  magas_brutto_ber?: boolean;
  magas_oraszam?: boolean;
  keves_alapber?: boolean;
  problemas_szunet?: boolean;
}

/** Munkalap (bérszámfejtés API) */
export interface Munkalap {
  id: number;
  azonosito: string;
  nev: string | null;
  projekt_id: number;
  projekt_azonosito?: string;
  projekt_nev?: string;
  projekt_iroda?: string | null;
  temavezeto: string | null;
  telj_idoszak: HonapIdoszak;
  szf_idoszak: HonapIdoszak;
  tipus_egyosszegu: boolean;
  megjegyzes: string | null;
  statusz: MunkalapStatusz;
  korrekcio_szulo_id?: number | null;
  letrehozo: string | null;
  letrehozva: string;
  diakok: MunkalapDiak[];
  controlling: MunkalapControlling;
  ossz_brutto?: number;
  ossz_ora?: number;
}

export function orakKozott(tol?: string, ig?: string): number {
  if (!tol || !ig) return 0;
  const [h1, m1] = tol.split(':').map(Number);
  const [h2, m2] = ig.split(':').map(Number);
  let mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

type BerKod = { id?: string; ar?: number; nev?: string };

export function munkalapControlling(
  diakok: MunkalapDiak[],
  berKodok: BerKod[],
  minBer = 1900,
): MunkalapControlling {
  let magas_brutto_ber = false;
  let magas_oraszam = false;
  let keves_alapber = false;
  let problemas_szunet = false;

  const kodAr = (id: string | undefined) => {
    const k = berKodok.find((b) => b.id === id);
    return k?.ar ?? 0;
  };

  for (const d of diakok) {
    let brutto = 0;
    let orak = 0;
    let maxMuszak = 0;
    for (const e of Object.values(d.idoadatok ?? {})) {
      const h = orakKozott(e.tol, e.ig);
      brutto += h * kodAr(e.kod);
      orak += h;
      if (h > maxMuszak) maxMuszak = h;
    }
    if (brutto > 300_000) magas_brutto_ber = true;
    if (orak > 200) magas_oraszam = true;
    if (maxMuszak > 9) problemas_szunet = true;
  }
  for (const k of berKodok) {
    if ((k.ar ?? 0) < minBer) keves_alapber = true;
  }

  return { magas_brutto_ber, magas_oraszam, keves_alapber, problemas_szunet };
}

export function diakBruttoOra(
  diak: MunkalapDiak,
  berKodok: BerKod[],
): { brutto: number; orak: number } {
  const kodAr = (id: string | undefined) => berKodok.find((b) => b.id === id)?.ar ?? 0;
  let brutto = 0;
  let orak = 0;
  for (const e of Object.values(diak.idoadatok ?? {})) {
    const h = orakKozott(e.tol, e.ig);
    brutto += h * kodAr(e.kod);
    orak += h;
  }
  return { brutto, orak };
}
