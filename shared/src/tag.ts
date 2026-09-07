/** Szövetkezeti tag — közös típusok és hiányosság-számítás */

import type { TagsagStatusz } from './enums.js';

export const TAG_IRODAK = ['Budapest', 'Debrecen', 'Szeged', 'Pécs', 'Győr'] as const;
export const TAG_ISKOLAK = [
  'BME',
  'ELTE',
  'Corvinus',
  'SZTE',
  'PTE',
  'DE',
  'SZE',
  'Budapesti Gazdasági Egyetem',
] as const;

export const DIAKIG_TIPUSOK = [
  'magyar_diakigazolvany',
  'hallgatoi_jogviszony',
  'tankoteles_hallgatoi',
  'kulfoldi_jogviszony',
] as const;

export const DIAKIG_TIPUS_LABEL: Record<(typeof DIAKIG_TIPUSOK)[number], string> = {
  magyar_diakigazolvany: 'Magyar diákigazolvány',
  hallgatoi_jogviszony: 'Hallgatói jogviszony igazolás',
  tankoteles_hallgatoi: 'Tanköteles — hallgatói jogviszony',
  kulfoldi_jogviszony: 'Külföldi oktatási intézmény',
};

export const DIAKIG_MUNKARENDEK = ['nappali', 'esti', 'levelező', 'tanköteles'] as const;

export const SZJA_KEDVEZMENY_TIPUSOK = [
  'családi',
  'első_házas',
  'négy_gyermek_anyuka',
  'személyi',
] as const;

export const SZJA_KEDVEZMENY_LABEL: Record<(typeof SZJA_KEDVEZMENY_TIPUSOK)[number], string> = {
  családi: 'Családi adókedvezmény',
  első_házas: 'Első házasok kedvezménye',
  négy_gyermek_anyuka: 'Négy vagy több gyermeket nevelő anyák kedvezménye',
  személyi: 'Személyi kedvezmény',
};

export type HianyStatusz = 'van' | 'nincs' | 'lejárt';
export type DiakigTipus = (typeof DIAKIG_TIPUSOK)[number];
export type SzjaKedvezmenyTipus = (typeof SZJA_KEDVEZMENY_TIPUSOK)[number];
export type SzjaKedvezmenyStatusz = 'aktív' | 'lejárt' | 'megszűnt';

export type SzjaKedvezmeny = {
  id: string;
  db_id?: number;
  tipus: SzjaKedvezmenyTipus;
  adoeloleghonap: string | null;
  ervenyes_tol: string;
  ervenyes_ig: string | null;
  havi_adokedvezmeny: number | null;
  megjegyzes: string | null;
  statusz: SzjaKedvezmenyStatusz;
  document_id?: string | null;
  shared_with_spouse?: boolean;
};

export type TagDokumentumMeta = {
  id?: string;
  nev: string;
  tipus?: string;
  feltoltve?: string;
  meret?: string;
  blob_key?: string;
};

export type SzovetkezetiTag = {
  id: number;
  diak_regisztracio_id: number | null;
  nev: string;
  adoszam: string;
  taj: string | null;
  email: string;
  telefon: string | null;
  szuldat: string | null;
  lakcim: string | null;
  iroda: string;
  iskola: string | null;
  bankszamlaszam: string | null;
  diakig: string | null;
  diakig_tipus: DiakigTipus | null;
  diakig_munkarend: string | null;
  diakig_ervenyes: string | null;
  diakig_online_hosszabbitas: boolean;
  tagsag_statusz: TagsagStatusz;
  belepes: string | null;
  nav_bejelentes?: string | null;
  kilepes: string | null;
  reszjegy: number;
  bank: HianyStatusz;
  eszerz: HianyStatusz;
  eszerz_lejar: string | null;
  uzemorv: HianyStatusz;
  uzemorv_lejar: string | null;
  tudo: HianyStatusz;
  tudo_lejar: string | null;
  szja_kedvezmenyek: SzjaKedvezmeny[];
  dokumentumok: TagDokumentumMeta[];
  letrehozva: string;
};

export type TagHianyossagSor = {
  kod: string;
  label: string;
  statusz: 'ok' | 'figyelmeztetes' | 'hiba';
  leiras: string;
};

function maStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function napokKulonbseg(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.floor(ms / 86_400_000);
}

export function szjaKedvezmenyAktualisStatusz(
  k: Pick<SzjaKedvezmeny, 'statusz' | 'ervenyes_tol' | 'ervenyes_ig'>,
  ref = maStr(),
): SzjaKedvezmenyStatusz {
  if (k.statusz === 'megszűnt') return 'megszűnt';
  if (k.ervenyes_ig && k.ervenyes_ig < ref) return 'lejárt';
  if (k.ervenyes_tol > ref) return 'megszűnt';
  return 'aktív';
}

export function normalizaltSzjaKedvezmenyek(raw: unknown): SzjaKedvezmeny[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((k): k is Record<string, unknown> => !!k && typeof k === 'object')
    .map((k) => {
      const tipus = SZJA_KEDVEZMENY_TIPUSOK.includes(k.tipus as SzjaKedvezmenyTipus)
        ? (k.tipus as SzjaKedvezmenyTipus)
        : 'családi';
      const alap: SzjaKedvezmeny = {
        id: typeof k.id === 'string' ? k.id : `szja-${Date.now()}`,
        tipus,
        adoeloleghonap: typeof k.adoeloleghonap === 'string' ? k.adoeloleghonap : null,
        ervenyes_tol: typeof k.ervenyes_tol === 'string' ? k.ervenyes_tol.slice(0, 10) : maStr(),
        ervenyes_ig: typeof k.ervenyes_ig === 'string' ? k.ervenyes_ig.slice(0, 10) : null,
        havi_adokedvezmeny: k.havi_adokedvezmeny != null ? Number(k.havi_adokedvezmeny) || null : null,
        megjegyzes: typeof k.megjegyzes === 'string' ? k.megjegyzes : null,
        statusz:
          k.statusz === 'aktív' || k.statusz === 'lejárt' || k.statusz === 'megszűnt'
            ? k.statusz
            : 'aktív',
      };
      return { ...alap, statusz: szjaKedvezmenyAktualisStatusz(alap) };
    });
}

export function tagDiakigFigyelmeztetes(
  tag: Pick<SzovetkezetiTag, 'diakig' | 'diakig_ervenyes'>,
  ref = maStr(),
): string | null {
  if (!tag.diakig) return 'Nincs diákigazolvány szám rögzítve';
  if (!tag.diakig_ervenyes) return 'Nincs diákigazolvány érvényesség';
  if (tag.diakig_ervenyes < ref) return 'Lejárt diákigazolvány';
  const nap = napokKulonbseg(tag.diakig_ervenyes, ref);
  if (nap <= 30) return `Diákigazolvány ${nap} napon belül lejár`;
  return null;
}

export function normalizaltTagDokumentumok(raw: unknown): TagDokumentumMeta[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d): TagDokumentumMeta | null => {
      if (typeof d === 'string') return { nev: d };
      if (d && typeof d === 'object' && typeof (d as TagDokumentumMeta).nev === 'string') {
        const o = d as TagDokumentumMeta;
        return {
          id: o.id,
          nev: o.nev,
          tipus: o.tipus,
          feltoltve: o.feltoltve,
          meret: o.meret,
          blob_key: o.blob_key,
        };
      }
      return null;
    })
    .filter((d): d is TagDokumentumMeta => d !== null);
}

export function tagHianyossagSorok(
  tag: Pick<
    SzovetkezetiTag,
    | 'bank'
    | 'bankszamlaszam'
    | 'eszerz'
    | 'uzemorv'
    | 'tudo'
    | 'diakig'
    | 'diakig_ervenyes'
  >,
  ref = maStr(),
): TagHianyossagSor[] {
  const sorok: TagHianyossagSor[] = [];

  const bankHiba = tag.bank === 'nincs' || !tag.bankszamlaszam?.trim();
  sorok.push({
    kod: 'bank',
    label: 'Bankszámla',
    statusz: bankHiba ? 'hiba' : 'ok',
    leiras: bankHiba
      ? 'Nincs bankszámlaszám — utalás előtt kötelező pótolni (FK #07)'
      : 'Bankszámlaszám rögzítve',
  });

  const eszerzHiba = tag.eszerz === 'nincs';
  const eszerzFigy = tag.eszerz === 'lejárt';
  sorok.push({
    kod: 'eszerz',
    label: 'Eseti szerződés',
    statusz: eszerzHiba ? 'hiba' : eszerzFigy ? 'figyelmeztetes' : 'ok',
    leiras: eszerzHiba ? 'Nincs eseti szerződés' : eszerzFigy ? 'Lejárt eseti szerződés' : 'Érvényes',
  });

  const orvHiba = tag.uzemorv === 'nincs';
  const orvFigy = tag.uzemorv === 'lejárt';
  sorok.push({
    kod: 'uzemorv',
    label: 'Üzemorvosi',
    statusz: orvHiba ? 'hiba' : orvFigy ? 'figyelmeztetes' : 'ok',
    leiras: orvHiba ? 'Nincs üzemorvosi' : orvFigy ? 'Lejárt üzemorvosi' : 'Érvényes',
  });

  const tudoHiba = tag.tudo === 'nincs';
  const tudoFigy = tag.tudo === 'lejárt';
  sorok.push({
    kod: 'tudo',
    label: 'Tüdőszűrő',
    statusz: tudoHiba ? 'hiba' : tudoFigy ? 'figyelmeztetes' : 'ok',
    leiras: tudoHiba ? 'Nincs tüdőszűrő' : tudoFigy ? 'Lejárt tüdőszűrő' : 'Érvényes',
  });

  const diakigWarn = tagDiakigFigyelmeztetes(tag, ref);
  sorok.push({
    kod: 'diakig',
    label: 'Diákigazolvány',
    statusz: !tag.diakig || (tag.diakig_ervenyes && tag.diakig_ervenyes < ref)
      ? 'hiba'
      : diakigWarn
        ? 'figyelmeztetes'
        : 'ok',
    leiras: diakigWarn ?? 'Érvényes diákigazolvány / jogviszony',
  });

  return sorok;
}

export function tagHianyossagok(
  tag: Pick<
    SzovetkezetiTag,
    | 'bank'
    | 'bankszamlaszam'
    | 'eszerz'
    | 'uzemorv'
    | 'tudo'
    | 'diakig'
    | 'diakig_ervenyes'
  >,
): string[] {
  return tagHianyossagSorok(tag)
    .filter((s) => s.statusz !== 'ok')
    .map((s) => s.leiras);
}

export function tagVanHianyossag(
  tag: Pick<
    SzovetkezetiTag,
    | 'bank'
    | 'bankszamlaszam'
    | 'eszerz'
    | 'uzemorv'
    | 'tudo'
    | 'diakig'
    | 'diakig_ervenyes'
  >,
): boolean {
  return tagHianyossagSorok(tag).some((s) => s.statusz !== 'ok');
}

export function normalizaltHianyStatusz(v: unknown): HianyStatusz {
  if (v === 'van' || v === 'lejárt') return v;
  return 'nincs';
}

export function normalizaltDiakigTipus(v: unknown): DiakigTipus | null {
  if (typeof v === 'string' && DIAKIG_TIPUSOK.includes(v as DiakigTipus)) {
    return v as DiakigTipus;
  }
  return null;
}
