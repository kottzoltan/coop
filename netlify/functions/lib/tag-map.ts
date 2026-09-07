import type { TagsagStatusz } from '../../../shared/src/enums.js';
import {
  normalizaltDiakigTipus,
  normalizaltHianyStatusz,
  normalizaltSzjaKedvezmenyek,
  normalizaltTagDokumentumok,
  type SzovetkezetiTag,
} from '../../../shared/src/tag.js';
import type { szovetkezetiTag } from '../../../db/schema.js';

type TagRow = typeof szovetkezetiTag.$inferSelect;

function datumStr(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

export function tagValasz(row: TagRow): SzovetkezetiTag {
  return {
    id: row.id,
    diak_regisztracio_id: row.diakRegisztracioId,
    nev: row.nev,
    adoszam: row.adoszam,
    taj: row.taj,
    email: row.email,
    telefon: row.telefon,
    szuldat: datumStr(row.szuldat),
    lakcim: row.lakcim,
    iroda: row.iroda,
    iskola: row.iskola,
    bankszamlaszam: row.bankszamlaszam,
    diakig: row.diakig,
    diakig_tipus: normalizaltDiakigTipus(row.diakigTipus),
    diakig_munkarend: row.diakigMunkarend,
    diakig_ervenyes: datumStr(row.diakigErvenyes),
    diakig_online_hosszabbitas: row.diakigOnlineHosszabbitas ?? false,
    tagsag_statusz: row.tagsagStatusz as TagsagStatusz,
    belepes: datumStr(row.belepes),
    nav_bejelentes: datumStr(row.navBejelentes) ?? datumStr(row.belepes),
    kilepes: datumStr(row.kilepes),
    reszjegy: row.reszjegy ?? 0,
    bank: normalizaltHianyStatusz(row.bank),
    eszerz: normalizaltHianyStatusz(row.eszerz),
    eszerz_lejar: datumStr(row.eszerzLejar),
    uzemorv: normalizaltHianyStatusz(row.uzemorv),
    uzemorv_lejar: datumStr(row.uzemorvLejar),
    tudo: normalizaltHianyStatusz(row.tudo),
    tudo_lejar: datumStr(row.tudoLejar),
    szja_kedvezmenyek: normalizaltSzjaKedvezmenyek(row.szjaKedvezmenyek),
    dokumentumok: normalizaltTagDokumentumok(row.dokumentumok),
    letrehozva: row.letrehozva.toISOString(),
  };
}

export function tagInsertFromBody(body: Record<string, unknown>): Partial<TagRow> {
  const patch: Partial<TagRow> = {};
  if (typeof body.nev === 'string') patch.nev = body.nev.trim();
  if (typeof body.adoszam === 'string') patch.adoszam = body.adoszam.trim();
  if (typeof body.email === 'string') patch.email = body.email.trim().toLowerCase();
  if (typeof body.taj === 'string') patch.taj = body.taj.trim() || null;
  if (typeof body.telefon === 'string') patch.telefon = body.telefon.trim() || null;
  if (typeof body.szuldat === 'string') patch.szuldat = body.szuldat || null;
  if (typeof body.lakcim === 'string') patch.lakcim = body.lakcim.trim() || null;
  if (typeof body.iroda === 'string') patch.iroda = body.iroda.trim();
  if (typeof body.iskola === 'string') patch.iskola = body.iskola.trim() || null;
  if (typeof body.bankszamlaszam === 'string') {
    patch.bankszamlaszam = body.bankszamlaszam.trim() || null;
  }
  if (typeof body.diakig === 'string') patch.diakig = body.diakig.trim() || null;
  if (typeof body.diakig_tipus === 'string') {
    patch.diakigTipus = normalizaltDiakigTipus(body.diakig_tipus);
  }
  if (typeof body.diakig_munkarend === 'string') {
    patch.diakigMunkarend = body.diakig_munkarend.trim() || null;
  }
  if (typeof body.diakig_ervenyes === 'string') patch.diakigErvenyes = body.diakig_ervenyes || null;
  if (body.diakig_online_hosszabbitas === true) patch.diakigOnlineHosszabbitas = true;
  if (body.diakig_online_hosszabbitas === false) patch.diakigOnlineHosszabbitas = false;
  if (typeof body.tagsag_statusz === 'string') patch.tagsagStatusz = body.tagsag_statusz;
  if (typeof body.belepes === 'string') patch.belepes = body.belepes || null;
  if (body.belepes === null) patch.belepes = null;
  if (typeof body.nav_bejelentes === 'string') patch.navBejelentes = body.nav_bejelentes || null;
  if (body.nav_bejelentes === null) patch.navBejelentes = null;
  if (typeof body.kilepes === 'string') patch.kilepes = body.kilepes || null;
  if (body.kilepes === null) patch.kilepes = null;
  if (body.reszjegy != null) patch.reszjegy = Number(body.reszjegy) || 0;
  if (typeof body.bank === 'string') patch.bank = normalizaltHianyStatusz(body.bank);
  if (typeof body.eszerz === 'string') patch.eszerz = normalizaltHianyStatusz(body.eszerz);
  if (typeof body.eszerz_lejar === 'string') patch.eszerzLejar = body.eszerz_lejar || null;
  if (typeof body.uzemorv === 'string') patch.uzemorv = normalizaltHianyStatusz(body.uzemorv);
  if (typeof body.uzemorv_lejar === 'string') patch.uzemorvLejar = body.uzemorv_lejar || null;
  if (typeof body.tudo === 'string') patch.tudo = normalizaltHianyStatusz(body.tudo);
  if (typeof body.tudo_lejar === 'string') patch.tudoLejar = body.tudo_lejar || null;
  if (Array.isArray(body.dokumentumok)) {
    patch.dokumentumok = normalizaltTagDokumentumok(body.dokumentumok) as unknown as string[];
  }
  if (Array.isArray(body.szja_kedvezmenyek)) {
    patch.szjaKedvezmenyek = normalizaltSzjaKedvezmenyek(body.szja_kedvezmenyek) as unknown as Record<
      string,
      unknown
    >[];
  }
  if (body.diak_regisztracio_id != null) {
    patch.diakRegisztracioId = Number(body.diak_regisztracio_id) || null;
  }
  return patch;
}
