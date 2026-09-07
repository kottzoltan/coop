import type {
  PartnerStatusz,
  KapcsolatTipus,
  CrmStatusz,
  KommunikacioTipus,
  KommunikacioStatusz,
  KapcsolattartoHozzaferes,
} from './enums.js';
import { TAG_IRODAK } from './tag.js';

export const PARTNER_IRODAK = TAG_IRODAK;

export const CRM_STATUSZOK = [
  'Új lead',
  'Kapcsolatfelvétel',
  'Ajánlat kiküldve',
  'Tárgyalás',
  'Megbízóvá alakítva',
  'Elutasítva',
] as const satisfies readonly CrmStatusz[];

export const CRM_STAGE_SZINEK: Record<CrmStatusz, string> = {
  'Új lead': '#6B7286',
  Kapcsolatfelvétel: '#2C5C8A',
  'Ajánlat kiküldve': '#B8863F',
  Tárgyalás: '#8A5CB8',
  'Megbízóvá alakítva': '#2F7A4E',
  Elutasítva: '#B4402C',
};

export const PARTNER_FELELOSOK = ['Kiss Andrea', 'Tóth Bálint', 'Farkas Dóra'] as const;

export const SZERZODES_TIPUSOK = ['Keretszerződés', 'Eseti szerződés'] as const;
export type SzerzodesTipus = (typeof SZERZODES_TIPUSOK)[number];

export const SZERZODES_STATUSZOK = ['aláírt', 'piszkozat', 'lejárt'] as const;
export type SzerzodesStatusz = (typeof SZERZODES_STATUSZOK)[number];

export type PartnerKapcsolattarto = {
  id: number;
  partner_id: number;
  nev: string;
  email: string | null;
  mobil: string | null;
  vezetekes: string | null;
  beosztas: string | null;
  szamlazasi: boolean;
  hozzaferes: KapcsolattartoHozzaferes;
  megjegyzes: string | null;
  aktiv: boolean;
};

export type PartnerKommunikacio = {
  id: number;
  partner_id: number;
  tipus: KommunikacioTipus;
  datum: string;
  szerzo: string | null;
  targy: string;
  leiras: string | null;
  statusz: KommunikacioStatusz | null;
};

export type PartnerSzerzodes = {
  id: number;
  partner_id: number;
  partner_nev?: string;
  tipus: SzerzodesTipus;
  statusz: SzerzodesStatusz;
  erv_kezdete: string | null;
  erv_vege: string | null;
  dokumentum_nev: string | null;
};

/** Partner (belső CRM API) */
export type Partner = {
  id: number;
  nev: string;
  adoszam: string | null;
  cim: string | null;
  iroda: string;
  statusz: PartnerStatusz;
  kapcsolat_tipus: KapcsolatTipus;
  crm_statusz: CrmStatusz;
  felelos: string | null;
  letrehozva: string;
  kapcsolattartok?: PartnerKapcsolattarto[];
  kommunikacio?: PartnerKommunikacio[];
  szerzodesek?: PartnerSzerzodes[];
  utolso_kommunikacio?: PartnerKommunikacio | null;
};

export function crmMegbizovaAllit(
  crmStatusz: CrmStatusz,
): { crm_statusz: CrmStatusz; kapcsolat_tipus: KapcsolatTipus } {
  if (crmStatusz === 'Megbízóvá alakítva') {
    return { crm_statusz: crmStatusz, kapcsolat_tipus: 'partner' };
  }
  return { crm_statusz: crmStatusz, kapcsolat_tipus: 'lead' };
}
