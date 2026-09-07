import type {
  CrmStatusz,
  KapcsolatTipus,
  KapcsolattartoHozzaferes,
  KommunikacioStatusz,
  KommunikacioTipus,
  PartnerStatusz,
} from '../../../shared/src/enums.js';
import type {
  Partner,
  PartnerKapcsolattarto,
  PartnerKommunikacio,
  PartnerSzerzodes,
  SzerzodesStatusz,
  SzerzodesTipus,
} from '../../../shared/src/partner.js';
import type {
  partner,
  partnerKapcsolattarto,
  partnerKommunikacio,
  partnerSzerzodes,
} from '../../../db/schema.js';

type PartnerRow = typeof partner.$inferSelect;
type KapcsolattartoRow = typeof partnerKapcsolattarto.$inferSelect;
type KommunikacioRow = typeof partnerKommunikacio.$inferSelect;
type SzerzodesRow = typeof partnerSzerzodes.$inferSelect;

function datumStr(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

function hozzaferes(v: string | null | undefined): KapcsolattartoHozzaferes {
  if (v === 'olvasas' || v === 'iras') return v;
  return 'nincs';
}

export function kapcsolattartoValasz(row: KapcsolattartoRow): PartnerKapcsolattarto {
  return {
    id: row.id,
    partner_id: row.partnerId,
    nev: row.nev,
    email: row.email,
    mobil: row.mobil,
    vezetekes: row.vezetekes,
    beosztas: row.beosztas,
    szamlazasi: row.szamlazasi,
    hozzaferes: hozzaferes(row.hozzaferes),
    megjegyzes: row.megjegyzes,
    aktiv: row.aktiv ?? true,
  };
}

export function kommunikacioValasz(row: KommunikacioRow): PartnerKommunikacio {
  return {
    id: row.id,
    partner_id: row.partnerId,
    tipus: row.tipus as KommunikacioTipus,
    datum: datumStr(row.datum) ?? '',
    szerzo: row.szerzo,
    targy: row.targy,
    leiras: row.leiras,
    statusz: (row.statusz as KommunikacioStatusz | null) ?? null,
  };
}

export function szerzodesValasz(row: SzerzodesRow, partnerNev?: string): PartnerSzerzodes {
  return {
    id: row.id,
    partner_id: row.partnerId,
    partner_nev: partnerNev,
    tipus: row.tipus as SzerzodesTipus,
    statusz: row.statusz as SzerzodesStatusz,
    erv_kezdete: datumStr(row.ervKezdete),
    erv_vege: datumStr(row.ervVege),
    dokumentum_nev: row.dokumentumNev,
  };
}

export function partnerValasz(
  row: PartnerRow,
  extra?: {
    kapcsolattartok?: KapcsolattartoRow[];
    kommunikacio?: KommunikacioRow[];
    szerzodesek?: SzerzodesRow[];
    utolsoKommunikacio?: KommunikacioRow | null;
  },
): Partner {
  return {
    id: row.id,
    nev: row.nev,
    adoszam: row.adoszam,
    cim: row.cim,
    iroda: row.iroda,
    statusz: row.statusz as PartnerStatusz,
    kapcsolat_tipus: row.kapcsolatTipus as KapcsolatTipus,
    crm_statusz: row.crmStatusz as CrmStatusz,
    felelos: row.felelos,
    letrehozva: row.letrehozva.toISOString(),
    kapcsolattartok: extra?.kapcsolattartok?.map(kapcsolattartoValasz),
    kommunikacio: extra?.kommunikacio?.map(kommunikacioValasz),
    szerzodesek: extra?.szerzodesek?.map((s) => szerzodesValasz(s, row.nev)),
    utolso_kommunikacio: extra?.utolsoKommunikacio
      ? kommunikacioValasz(extra.utolsoKommunikacio)
      : extra?.utolsoKommunikacio === null
        ? null
        : undefined,
  };
}

export function partnerPatchFromBody(body: Record<string, unknown>): Partial<PartnerRow> {
  const patch: Partial<PartnerRow> = {};
  if (typeof body.nev === 'string') patch.nev = body.nev.trim();
  if (typeof body.adoszam === 'string') patch.adoszam = body.adoszam.trim() || null;
  if (typeof body.cim === 'string') patch.cim = body.cim.trim() || null;
  if (typeof body.iroda === 'string') patch.iroda = body.iroda.trim();
  if (typeof body.statusz === 'string') patch.statusz = body.statusz;
  if (typeof body.kapcsolat_tipus === 'string') patch.kapcsolatTipus = body.kapcsolat_tipus;
  if (typeof body.crm_statusz === 'string') patch.crmStatusz = body.crm_statusz;
  if (typeof body.felelos === 'string') patch.felelos = body.felelos.trim() || null;
  return patch;
}

export function kapcsolattartoInsertFromBody(
  body: Record<string, unknown>,
): Omit<KapcsolattartoRow, 'id'> | null {
  const nev = typeof body.nev === 'string' ? body.nev.trim() : '';
  if (!nev) return null;
  const partnerId = Number(body.partner_id);
  if (!partnerId) return null;
  return {
    partnerId,
    nev,
    email: typeof body.email === 'string' ? body.email.trim() || null : null,
    mobil: typeof body.mobil === 'string' ? body.mobil.trim() || null : null,
    vezetekes: typeof body.vezetekes === 'string' ? body.vezetekes.trim() || null : null,
    beosztas: typeof body.beosztas === 'string' ? body.beosztas.trim() || null : null,
    szamlazasi: Boolean(body.szamlazasi),
    hozzaferes: typeof body.hozzaferes === 'string' ? body.hozzaferes : 'nincs',
    megjegyzes: typeof body.megjegyzes === 'string' ? body.megjegyzes.trim() || null : null,
    aktiv: body.aktiv === false ? false : true,
  };
}

export function kapcsolattartoPatchFromBody(
  body: Record<string, unknown>,
): Partial<KapcsolattartoRow> | null {
  const id = Number(body.id);
  if (!id) return null;
  const patch: Partial<KapcsolattartoRow> = {};
  if (typeof body.nev === 'string' && body.nev.trim()) patch.nev = body.nev.trim();
  if (typeof body.email === 'string') patch.email = body.email.trim() || null;
  if (typeof body.mobil === 'string') patch.mobil = body.mobil.trim() || null;
  if (typeof body.vezetekes === 'string') patch.vezetekes = body.vezetekes.trim() || null;
  if (typeof body.beosztas === 'string') patch.beosztas = body.beosztas.trim() || null;
  if (typeof body.hozzaferes === 'string') patch.hozzaferes = body.hozzaferes;
  if (typeof body.megjegyzes === 'string') patch.megjegyzes = body.megjegyzes.trim() || null;
  if (typeof body.szamlazasi === 'boolean') patch.szamlazasi = body.szamlazasi;
  if (typeof body.aktiv === 'boolean') patch.aktiv = body.aktiv;
  if (!Object.keys(patch).length) return null;
  return patch;
}
