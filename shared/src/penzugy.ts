export type PenzugySzamlaStatusz = 'piszkozat' | 'jóváhagyott' | 'kiszámlázva' | 'törölve';

export interface PenzugySzamla {
  id: number;
  munkalap_id: number;
  projekt_id: number;
  munkalap_azonosito: string;
  osszeg: number;
  statusz: PenzugySzamlaStatusz | string;
  megjegyzes?: string | null;
  letrehozva: string;
  projekt_azonosito?: string;
  projekt_nev?: string;
}

export interface BlogBejegyzes {
  id: number;
  cim: string;
  tartalom?: string | null;
  statusz: string;
  publikalva?: string | null;
  szerzo?: string | null;
  letrehozva: string;
}

export interface UgyTicket {
  id: number;
  tipus: string;
  targy: string;
  leiras?: string | null;
  statusz: string;
  prioritas: string;
  kapcsolat_nev?: string | null;
  kapcsolat_email?: string | null;
  hozzarendelt?: string | null;
  letrehozva: string;
}

export interface EAlairasKerelem {
  id: number;
  tag_id?: number | null;
  diak_regisztracio_id?: number | null;
  jelentkezes_id?: number | null;
  projekt_id?: number | null;
  szerzodes_tipus?: 'keretszerzodes' | 'eseti_szerzodes' | string | null;
  dokumentum_nev: string;
  statusz: string;
  blob_key?: string | null;
  megjegyzes?: string | null;
  microsec_idobelyeg?: string | null;
  alairva_at?: string | null;
  email_kuldve_at?: string | null;
  letrehozva: string;
  tag_nev?: string;
  hirdetes_cim?: string | null;
  projekt_nev?: string | null;
}
