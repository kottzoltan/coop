import type { VallalasiDijTipus } from './enums.js';
import type {
  Ervenyesseg,
  Kapcsolattarto,
  MunkavegzesiHely,
  Szerzodes,
  Dokumentum,
  HonapIdoszak,
} from './common.js';
import type { ProjektSzereploSzerepkor, SzereploTipus } from './enums.js';

/** Projekt számlázási beállítások (meta.szamlazas) */
export interface ProjektSzamlazas {
  eszamla?: boolean;
  szamlazasi_integracio?: boolean;
  piszkozat_teljig?: boolean;
  szamla_mellek?: boolean;
  fizetesi_hatarido?: string;
  afa_bevallas?: string;
  fizetesi_kondicio?: string;
  afa?: string;
  munka_megnevezes?: string;
  fix_megjegyzes?: string;
  egyeb_info?: string;
}

/** Projekt meta blokk (3.3) */
export interface ProjektMeta {
  agazat?: string;
  kategoria?: string;
  varmegye?: string;
  cimkek?: string[];
  kezdete?: string;
  vege?: string;
  munkanap_formatum?: string;
  uzemorvosi_figyeles?: string;
  foglalkoztatas_eu_vizsgalat?: string;
  eu_vizsgalatok_figyeles?: string;
  szamlazas?: ProjektSzamlazas;
  nemzetgazdasagi_agazat?: string;
  valtozo_munkahely?: boolean;
  leiras?: string;
  ellatando_feladatok?: string;
  megjegyzes?: string;
}

/** Vállalási díj (partnernek kiszámlázott egységár) */
export interface VallalasiDij {
  id: string;
  nev: string;
  ar: number;
  egysegtipus?: string;
  tipus?: VallalasiDijTipus;
  ervenyesseg?: Ervenyesseg;
}

/**
 * Számfejtési bér (diáknak kifizetett egységár).
 * A vallalasi_dij_id kötelező — minden számfejtési bér pontosan egy vállalási díjhoz tartozik
 * (fedezetszámítás alapja, ld. spec 3.3 / 5. szakasz).
 */
export interface SzamfejtesiBer {
  id: string;
  nev: string;
  ar: number;
  egysegtipus?: string;
  normaora?: number;
  munkakor?: string;
  /** Kötelező FK — soha nem lehet null/undefined */
  vallalasi_dij_id: string;
  ervenyesseg?: Ervenyesseg;
}

/** Projekt költség */
export interface ProjektKoltseg {
  id?: string;
  nev: string;
  osszeg: number;
  datum?: string;
  elszamolasi_idoszak?: string;
  tipus?: string;
  szamlazando?: boolean;
}

/** Profitrészesedéses szereplő */
export interface ProjektSzereplo {
  id?: string;
  nev: string;
  email?: string;
  szerepkor?: ProjektSzereploSzerepkor;
  erv_kezdete?: string;
  erv_vege?: string;
  tipus?: SzereploTipus;
  osszeg?: number;
  min_osszeg?: number;
  reszesedes?: number;
}

/** Projekt kifizetés összesítő */
export interface ProjektKifizetes {
  id?: string;
  temavezeto?: string;
  szf_idoszak?: HonapIdoszak;
  teljesitesi_idoszak?: string;
  diakok_szama?: number;
  osszesen?: number;
  statusz?: string;
}

/** Teljesítés igazolás sor */
export interface TeljesitesSor {
  dij_id: string;
  menny: number;
  elsz_menny: number;
  kozvetitett?: boolean;
}

/** Teljesítés igazolás költség sor */
export interface TeljesitesKoltsegSor {
  koltseg_id: string;
  szorzo: number;
}

/** Teljesítés igazolás */
export interface Teljesites {
  id?: string;
  azonosito?: string;
  idoszak?: string;
  statusz?: string;
  teljig_datuma?: string;
  szl_idoszak_kezdete?: string;
  szl_idoszak_vege?: string;
  szl_po?: string;
  csoportositas?: string;
  megjegyzes?: string;
  sorok?: TeljesitesSor[];
  koltseg_sorok?: TeljesitesKoltsegSor[];
}

/** Projekt dokumentum */
export interface ProjektDokumentum extends Dokumentum {
  idoszak?: string;
  statusz?: string;
}

/** Projekt (3.3) */
export interface Projekt {
  id: string;
  azonosito: string;
  nev: string;
  partner_id?: string;
  iroda?: string;
  statusz?: string;
  prioritas?: string;
  belso_munka?: boolean;
  meta?: ProjektMeta;
  munkavegzesi_helyek?: MunkavegzesiHely[];
  kapcsolattartok?: Kapcsolattarto[];
  szereplok?: ProjektSzereplo[];
  dijak?: VallalasiDij[];
  szamfejtesi_berek?: SzamfejtesiBer[];
  koltsegek?: ProjektKoltseg[];
  szerzodesek?: Szerzodes[];
  kifizetesek?: ProjektKifizetes[];
  teljesitesek?: Teljesites[];
  dokumentumok?: ProjektDokumentum[];
}

/** Fedezetszámítás eredménye (számított, nem perzisztált entitás) */
export interface FedezetSzamitas {
  bevetel: number;
  tagi_ber: number;
  kozvetlen_koltsegek: number;
  fedezet: number;
}
