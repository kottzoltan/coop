/** Digitális szerződés sablon meta (Netlify Blobs) */

export interface SzerzodesSablonMeta {
  blob_key: string;
  fajlnev: string;
  content_type?: string;
  meret?: string;
  feltoltve?: string;
  feltolto?: string;
}

export const KERETSZERZODES_SABLON_KULCS = 'keretszerzodes_sablon';
export const ESETI_ALAP_SABLON_KULCS = 'eseti_szerzodes_alap_sablon';

export const SZERZODES_SABLON_TIPUSOK = ['keretszerzodes', 'eseti_alap', 'eseti_projekt'] as const;
export type SzerzodesSablonTipus = (typeof SZERZODES_SABLON_TIPUSOK)[number];
