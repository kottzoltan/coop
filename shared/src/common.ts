import type { KapcsolattartoHozzaferes } from './enums.js';

/** Érvényességi időszak (pl. díjak, bérek, szereplők) */
export interface Ervenyesseg {
  kezdete?: string;
  vege?: string;
}

/** Postai cím (szerződés számlázási / levelezési cím) */
export interface Cim {
  irszam?: string;
  varos?: string;
  utca?: string;
  orszag?: string;
}

/** Kapcsolattartó (Partner és Projekt) */
export interface Kapcsolattarto {
  id?: string;
  nev: string;
  email?: string;
  mobil?: string;
  vezetekes?: string;
  szamlazasi: boolean;
  hozzaferes: KapcsolattartoHozzaferes;
  megjegyzes?: string;
}

/** Munkavégzési hely */
export interface MunkavegzesiHely {
  irszam?: string;
  varos?: string;
  utca?: string;
}

/** Általános dokumentum meta */
export interface Dokumentum {
  id?: string;
  nev: string;
  tipus?: string;
  meret?: string;
  feltoltve?: string;
  feltolto?: string;
  megjegyzes?: string;
}

/** Szerződés (Partnerhez vagy Projekthez kötve) */
export interface Szerzodes {
  id?: string;
  azonosito: string;
  kelte?: string;
  erv_kezdete?: string;
  erv_vege?: string;
  szamlazasi_cim?: Cim;
  levelezesi_cim?: Cim;
  megjegyzes?: string;
  dokumentumok?: Dokumentum[];
}

/** Havi időszak formátum: ÉÉÉÉ-HH */
export type HonapIdoszak = string;

/** Naptári nap kulcs: ÉÉÉÉ-HH-NN */
export type NapKulcs = string;
