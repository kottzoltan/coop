/** Projekt kiegészítő adatok (mock + élő DB meta jsonb) */
export interface ProjektKapcsolattarto {
  nev: string;
  email?: string;
  mobil?: string;
  szamlazasi?: boolean;
  hozzaferes?: string;
}

export interface ProjektVallalasiDij {
  id: string;
  nev: string;
  ar: number;
  egysegtipus?: string;
  tipus?: string;
  ervenyesseg?: string;
}

export interface ProjektSzamfejtesiBerMeta {
  id: string;
  nev: string;
  ar: number;
  egysegtipus?: string;
  munkakor?: string;
  vallalasi_dij_id: string;
  ervenyesseg?: string;
  publikus?: boolean;
}

export interface ProjektKoltsegMeta {
  id?: string;
  nev: string;
  osszeg: number;
  datum?: string;
  idoszak?: string;
  tipus?: string;
  szamlazando?: boolean;
}

export interface ProjektTeljesitesSor {
  dij_id: string;
  menny: number;
  elsz_menny: number;
  kozvetitett?: boolean;
}

export interface ProjektTeljesitesKoltsegSor {
  koltseg_id: string;
  szorzo?: number;
}

export interface ProjektTeljesitesMeta {
  id?: string;
  azonosito?: string;
  idoszak?: string;
  statusz?: string;
  teljig_datuma?: string;
  szl_idoszak_kezdete?: string;
  szl_idoszak_vege?: string;
  szl_po?: string;
  csoportositas?: boolean;
  megjegyzes?: string;
  /** Munkalap azonosító, amiből generálódott (kereszt-modul kötés) */
  munkalap_azonosito?: string;
  sorok?: ProjektTeljesitesSor[];
  koltseg_sorok?: ProjektTeljesitesKoltsegSor[];
}

/** Projekt meta számfejtési bérei — hirdetés + munkalap közös kifizetési kód forrás */
export type SzamfejtesiBerKod = {
  id: string;
  ar: number;
  nev: string;
  munkakor?: string;
  vallalasi_dij_id?: string;
};

export function szamfejtesiBerekBerKodLista(
  meta: ProjektMetaPayload | null | undefined,
): SzamfejtesiBerKod[] {
  return (meta?.szamfejtesi_berek ?? []).map((b) => ({
    id: b.id,
    ar: b.ar,
    nev: b.nev,
    munkakor: b.munkakor,
    vallalasi_dij_id: b.vallalasi_dij_id,
  }));
}

export function validateHirdetesProjektMezok(
  meta: ProjektMetaPayload,
  szereplok: Array<{ nev: string }>,
  felelos: string | null | undefined,
  kifizetesiKod: string | null | undefined,
): string | null {
  if (felelos && szereplok.length && !szereplok.some((s) => s.nev === felelos)) {
    return 'A toborzásért felelős csak a projekt szereplői közül választható.';
  }
  const berek = szamfejtesiBerekBerKodLista(meta);
  if (!kifizetesiKod) return null;
  if (!berek.length) {
    return 'A projekthez nincs számfejtési bér — előbb rögzítsd a projekt Díjak & bérek fülén.';
  }
  const ok = berek.some((b) => b.id === kifizetesiKod || b.nev === kifizetesiKod);
  if (!ok) {
    return 'A kifizetési kód csak a projekt számfejtési bérei közül választható.';
  }
  return null;
}

export function validateMunkalapBerKodok(
  diakok: Array<{ idoadatok?: Record<string, { kod?: string }> }>,
  meta: ProjektMetaPayload,
): string | null {
  const berek = szamfejtesiBerekBerKodLista(meta);
  if (!berek.length) return 'A projekthez nincs számfejtési bér.';
  const engedelyezett = new Set(berek.flatMap((b) => [b.id, b.nev]));
  for (const diak of diakok) {
    for (const e of Object.values(diak.idoadatok ?? {})) {
      if (e.kod && !engedelyezett.has(e.kod)) {
        return `Érvénytelen kifizetési kód: „${e.kod}” — csak a projekt számfejtési bérei használhatók.`;
      }
    }
  }
  return null;
}

/** Munkalap napi bejegyzésekből órák összesítése számfejtési bér id szerint */
export function oraOsszesitesSzamfejtesiBerenkent(
  diakok: Array<{ idoadatok?: Record<string, { kod?: string; tol?: string; ig?: string }> }>,
): Map<string, number> {
  const oraPerKod = new Map<string, number>();
  for (const diak of diakok) {
    for (const e of Object.values(diak.idoadatok ?? {})) {
      if (!e.kod || !e.tol || !e.ig) continue;
      const [h1, m1] = e.tol.split(':').map(Number);
      const [h2, m2] = e.ig.split(':').map(Number);
      let mins = h2 * 60 + m2 - (h1 * 60 + m1);
      if (mins < 0) mins += 24 * 60;
      const orak = mins / 60;
      oraPerKod.set(e.kod, (oraPerKod.get(e.kod) ?? 0) + orak);
    }
  }
  return oraPerKod;
}

/** Teljesítés igazolás sorok: számfejtési bér → vállalási díj (fedezetszámítás alapja) */
export function teljesitesSorokFromMunkalap(
  diakok: Array<{ idoadatok?: Record<string, { kod?: string; tol?: string; ig?: string }> }>,
  meta: ProjektMetaPayload,
): ProjektTeljesitesSor[] {
  const szfBerek = meta.szamfejtesi_berek ?? [];
  const oraPerKod = oraOsszesitesSzamfejtesiBerenkent(diakok);
  const oraPerDij = new Map<string, { menny: number; elsz_menny: number }>();

  for (const [kod, orak] of oraPerKod) {
    const szf = szfBerek.find((b) => b.id === kod || b.nev === kod);
    if (!szf?.vallalasi_dij_id) continue;
    const cur = oraPerDij.get(szf.vallalasi_dij_id) ?? { menny: 0, elsz_menny: 0 };
    cur.menny += orak;
    cur.elsz_menny += orak;
    oraPerDij.set(szf.vallalasi_dij_id, cur);
  }

  return [...oraPerDij.entries()].map(([dij_id, v]) => ({
    dij_id,
    menny: Math.round(v.menny * 100) / 100,
    elsz_menny: Math.round(v.elsz_menny * 100) / 100,
  }));
}

export function teljesitesMetaFromMunkalap(
  munkalap: {
    azonosito: string;
    telj_idoszak: string;
    szf_idoszak: string;
    temavezeto?: string | null;
    diakok: Array<{ idoadatok?: Record<string, { kod?: string; tol?: string; ig?: string }> }>;
    ossz_brutto?: number;
  },
  projektAzonosito: string,
  meta: ProjektMetaPayload,
  meglevoTeljesitesek?: ProjektTeljesitesMeta[],
  korrekcios = false,
): { teljesites: ProjektTeljesitesMeta; kifizetes: ProjektKifizetesMeta } {
  const lista = meglevoTeljesitesek ?? [];
  const regi = lista.find((t) => t.munkalap_azonosito === munkalap.azonosito);
  const kifLista = meta.kifizetesek ?? [];
  const regiKif = kifLista.find((k) => k.munkalap_azonosito === munkalap.azonosito);
  const sorok = teljesitesSorokFromMunkalap(munkalap.diakok, meta);
  const idoszak = munkalap.telj_idoszak;
  const azonosito =
    regi?.azonosito ??
    `${projektAzonosito}-${idoszak.replace('-', '')}-${munkalap.azonosito.split('-').pop() ?? 'ML'}`;

  const teljesites: ProjektTeljesitesMeta = {
    id: regi?.id ?? nextMetaId(lista),
    azonosito,
    idoszak,
    munkalap_azonosito: munkalap.azonosito,
    statusz: 'Jóváhagyott',
    teljig_datuma: new Date().toISOString().slice(0, 10),
    sorok,
    koltseg_sorok: regi?.koltseg_sorok ?? [],
    megjegyzes: meta.szamlazas?.automatikus_szamlazas
      ? 'Automatikus számlázás sorba helyezve (piszkozat teljig)'
      : regi?.megjegyzes,
  };

  const kifizetes: ProjektKifizetesMeta = {
    id: regiKif?.id ?? nextMetaId(kifLista),
    temavezeto: munkalap.temavezeto ?? undefined,
    szf_idoszak: munkalap.szf_idoszak,
    teljesitesi_idoszak: munkalap.telj_idoszak,
    diakok_szama: munkalap.diakok.length,
    osszesen: munkalap.ossz_brutto ?? 0,
    statusz: korrekcios ? 'Korrekció Számfejtett' : 'Számfejtett',
    munkalap_azonosito: munkalap.azonosito,
  };

  return { teljesites, kifizetes };
}

export const EGYSEG_TIPUSOK = [
  'Ft/óra',
  'Ft/nap',
  'Ft/hónap',
  'Ft/db',
  'Ft/fő',
  'Ft/alkalom',
  'Egyösszegű',
] as const;

export const MUNKAKOROK = [
  'Adminisztratív, irodai',
  'Fizikai, gyári, raktári',
  'Üzlet, bolt, értékesítés',
  'Pénztáros',
  'Árufeltöltő',
  'Komissiózó',
  'Vevőszolgálat',
  'Betanított fizikai munkás',
] as const;

export const KOLTSEG_TIPUSOK = ['Eszköz', 'Utazás', 'Egyéb', 'Szolgáltatás'] as const;

export const SZEREPKOROK = [
  'Igazgatósági tag',
  'Megye vezető',
  'Irodavezető',
  'Ágazatvezető',
  'Managing Partner',
  'Piackutató',
  'Témavezető/Mentor',
  'Témavezető / Mentor',
] as const;

export const PRIORITASOK = ['Elsődleges', 'Másodlagos', 'Harmadlagos'] as const;

export const PROJEKT_STATUSZOK = ['aktív', 'inaktív'] as const;

export const SZEREPLO_TIPUSOK = ['Fedezet arányos', 'Egyösszegű'] as const;

export const KIFIZETES_STATUSZOK = [
  'Beküldött',
  'Jóváhagyott',
  'Számfejtett',
  'Korrekció Beküldött',
  'Korrekció Jóváhagyott',
  'Korrekció Számfejtett',
] as const;

export interface ProjektKifizetesMeta {
  id?: string;
  temavezeto?: string;
  szf_idoszak?: string;
  teljesitesi_idoszak?: string;
  diakok_szama?: number;
  osszesen?: number;
  statusz?: string;
  munkalap_azonosito?: string;
}

export interface ProjektDokumentumMeta {
  id?: string;
  nev: string;
  tipus?: string;
  statusz?: string;
  idoszak?: string;
  feltolto?: string;
  meret?: string;
  feltoltve?: string;
  megjegyzes?: string;
  /** Netlify Blobs kulcs */
  blob_key?: string;
}

export interface ProjektSzamlazasMeta {
  afa_kulcs?: string;
  tartozik?: string;
  kovetel?: string;
  munkaszam?: string;
  szamlazasi_cim?: string;
  postafiok?: string;
  eszamla?: boolean;
  /** Számlázási integráció (mock: szint) */
  szamlazasi_integracio?: boolean;
  automatikus_szamlazas?: boolean;
  piszkozat_teljig?: boolean;
  szamla_mellek?: boolean;
  fizetesi_hatarido?: string;
}

export const MUNKANAP_FORMATUMOK = ['H,K,Sz,Cs,P,Szo,V', 'H–P', 'Egyedi'] as const;

export const PROJEKT_DOKUMENTUM_TIPUSOK = [
  'Szerződés',
  'Teljesítés igazolás',
  'Egyéb projekt dokumentum',
  'Számla',
  'Jelenléti ív',
  'Összesítő',
  'Átvételi',
] as const;

export const PROJEKT_DOKUMENTUM_STATUSZOK = ['Feltöltve', 'Jóváhagyva', 'Elutasítva'] as const;

export interface ProjektMetaPayload {
  agazat?: string;
  kategoria?: string;
  varmegye?: string;
  cimkek?: string;
  kezdete?: string;
  vege?: string;
  nemzgazd?: string;
  leiras?: string;
  feladatok?: string;
  megjegyzes?: string;
  uzemorvos_eu?: boolean;
  munkanap_formatum?: string;
  szamlazas?: ProjektSzamlazasMeta;
  munkavegzesi_helyek?: Array<{ irszam?: string; varos?: string; utca?: string }>;
  kapcsolattartok?: ProjektKapcsolattarto[];
  dijak?: ProjektVallalasiDij[];
  szamfejtesi_berek?: ProjektSzamfejtesiBerMeta[];
  koltsegek?: ProjektKoltsegMeta[];
  teljesitesek?: ProjektTeljesitesMeta[];
  kifizetesek?: ProjektKifizetesMeta[];
  dokumentumok?: ProjektDokumentumMeta[];
  /** Projekt-specifikus eseti szerződés Word sablon (digitális aláíráshoz) */
  eseti_szerzodes_sablon?: import('./szerzodes-sablon.js').SzerzodesSablonMeta;
}

export interface FedezetOsszesito {
  bevetel: number;
  tagi_ber: number;
  kozvetlen_koltsegek: number;
  fedezet: number;
}

export function parseSzam(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export function nextMetaId(items: Array<{ id?: string }>): string {
  const nums = items
    .map((i) => parseInt(String(i.id ?? '0'), 10))
    .filter((n) => !Number.isNaN(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

export function validateProjektMeta(meta: ProjektMetaPayload): string | null {
  const dijIds = new Set((meta.dijak ?? []).map((d) => d.id));
  for (const szf of meta.szamfejtesi_berek ?? []) {
    if (!szf.vallalasi_dij_id || !dijIds.has(szf.vallalasi_dij_id)) {
      return `A „${szf.nev}” számfejtési bérhez kötelező érvényes vállalási díj (vallalasi_dij_id).`;
    }
  }
  return null;
}

export function computeTeljigTotals(
  meta: ProjektMetaPayload,
  t: Pick<ProjektTeljesitesMeta, 'sorok' | 'koltseg_sorok'>,
): FedezetOsszesito {
  const dijak = meta.dijak ?? [];
  const szfBerek = meta.szamfejtesi_berek ?? [];
  const koltsegek = meta.koltsegek ?? [];

  let bevetel = 0;
  let tagi_ber = 0;
  for (const s of t.sorok ?? []) {
    const dij = dijak.find((d) => d.id === s.dij_id);
    const szf = szfBerek.find((x) => x.vallalasi_dij_id === s.dij_id);
    if (dij) bevetel += dij.ar * parseSzam(s.elsz_menny);
    if (szf) tagi_ber += szf.ar * parseSzam(s.menny);
  }

  let kozvetlen_koltsegek = 0;
  for (const k of t.koltseg_sorok ?? []) {
    const src = koltsegek.find((c) => c.id === k.koltseg_id);
    if (src) kozvetlen_koltsegek += src.osszeg * (parseSzam(k.szorzo) || 1);
  }

  return {
    bevetel: kerek(bevetel),
    tagi_ber: kerek(tagi_ber),
    kozvetlen_koltsegek: kerek(kozvetlen_koltsegek),
    fedezet: kerek(bevetel - tagi_ber - kozvetlen_koltsegek),
  };
}

function kerek(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Menny. ≠ elsz. menny. — kifizetett és kiszámlázott óraszám eltérés (spec 3.3) */
export function teljesitesSorElteres(sor: Pick<ProjektTeljesitesSor, 'menny' | 'elsz_menny'>): boolean {
  return parseSzam(sor.menny) !== parseSzam(sor.elsz_menny);
}

export function teljesitesElteresSorok(
  sorok: ProjektTeljesitesSor[] | undefined,
): ProjektTeljesitesSor[] {
  return (sorok ?? []).filter(teljesitesSorElteres);
}

/** Legutóbbi teljesítés igazolás fedezete (lista első eleme = legfrissebb) */
export function legutobbiTeljigFedezet(meta: ProjektMetaPayload | null | undefined): number | null {
  const lista = meta?.teljesitesek ?? [];
  if (!lista.length || !meta) return null;
  return computeTeljigTotals(meta, lista[0]).fedezet;
}

/** Szereplő kompenzáció: max(fedezet × részesedés%, min. összeg) — spec 3.3 */
export function szamitSzereploKompenzacio(
  fedezet: number,
  reszesedes: number,
  minOsszeg: number = 0,
): number {
  return Math.max(Math.round((fedezet * reszesedes) / 100), minOsszeg);
}

export function szamitFedezet(meta: ProjektMetaPayload | null | undefined): FedezetOsszesito {
  if (!meta) {
    return { bevetel: 0, tagi_ber: 0, kozvetlen_koltsegek: 0, fedezet: 0 };
  }

  const teljesitesek = meta.teljesitesek ?? [];
  let bevetel = 0;
  let kozvetlen_koltsegek = 0;
  let tagiBerTeljig = 0;

  for (const t of teljesitesek) {
    const tot = computeTeljigTotals(meta, t);
    bevetel += tot.bevetel;
    kozvetlen_koltsegek += tot.kozvetlen_koltsegek;
    tagiBerTeljig += tot.tagi_ber;
  }

  const kifizOsszeg = (meta.kifizetesek ?? []).reduce((s, k) => s + (k.osszesen ?? 0), 0);
  const tagi_ber = kifizOsszeg > 0 ? kifizOsszeg : tagiBerTeljig;

  return {
    bevetel: kerek(bevetel),
    tagi_ber: kerek(tagi_ber),
    kozvetlen_koltsegek: kerek(kozvetlen_koltsegek),
    fedezet: kerek(bevetel - tagi_ber - kozvetlen_koltsegek),
  };
}

/** Demo meta — azonosító alapján (összhangban a 0003 seed projektekkel) */
export const PROJEKT_DEMO_META: Record<string, ProjektMetaPayload> = {
  B0510001: {
    agazat: 'Fizikai ágazat',
    kategoria: 'Könnyű fizikai, gyári, raktári',
    varmegye: 'Pest',
    cimkek: 'kertész, gyakornok, nyári',
    kezdete: '2026-04-01',
    leiras: 'Kertészeti gyakornoki program — Expo tér, korai reggeli műszakok.',
    munkavegzesi_helyek: [{ irszam: '1101', varos: 'Budapest', utca: 'Expo tér' }],
    kapcsolattartok: [
      { nev: 'Kornya József', email: 'kornya.jozsef@melodiak.hu', mobil: '+36 30 555 1234', szamlazasi: false },
    ],
    dijak: [
      {
        id: '1',
        nev: '2350 Ft/óra - Kertész gyakornok',
        ar: 2350,
        egysegtipus: 'Ft/óra',
        tipus: 'Szervezős',
        ervenyesseg: '2026.01–2026.12',
      },
    ],
    szamfejtesi_berek: [
      {
        id: '1',
        nev: 'Kertész gyakornok',
        ar: 2350,
        egysegtipus: 'Ft/óra',
        munkakor: 'Adminisztratív, irodai',
        vallalasi_dij_id: '1',
        ervenyesseg: '2026.01–2026.12',
      },
    ],
    koltsegek: [{ nev: 'Munkaruha — kesztyű, védőruha', osszeg: 45000, datum: '2026-05-10', tipus: 'Eszköz' }],
    teljesitesek: [
      {
        azonosito: 'B0510001-200699',
        idoszak: '2026-06',
        statusz: 'Jóváhagyott',
        sorok: [{ dij_id: '1', menny: 80, elsz_menny: 80 }],
      },
    ],
    kifizetesek: [
      { temavezeto: 'Kornya József', szf_idoszak: '2026-06', osszesen: 188000, statusz: 'Beküldött' },
    ],
    dokumentumok: [{ nev: 'GreenPark Kft szerződés 2026.pdf', tipus: 'Szerződés', statusz: 'Feltöltve' }],
  },
  B0359192: {
    agazat: 'Fizikai ágazat',
    kategoria: 'Üzlet, bolt, értékesítés',
    varmegye: 'Pest',
    kezdete: '2026-03-01',
    leiras: 'Ruházati üzlet raktár leltár — szezonális diákmunka.',
    munkavegzesi_helyek: [{ irszam: '1051', varos: 'Budapest', utca: 'Váci utca 12.' }],
    kapcsolattartok: [
      { nev: 'Konfár Kitti', email: 'konfar.kitti@melodiak.hu', mobil: '+36 20 111 2233', szamlazasi: true },
    ],
    dijak: [
      { id: '1', nev: '2000 Ft/óra - Ruhabolti kisegítői feladatok', ar: 2000, egysegtipus: 'Ft/óra', tipus: 'Szervezős' },
    ],
    szamfejtesi_berek: [
      { id: '1', nev: 'Ruhabolti kisegítő', ar: 2000, munkakor: 'Üzlet, bolt, értékesítés', vallalasi_dij_id: '1' },
    ],
    koltsegek: [],
    teljesitesek: [],
    kifizetesek: [],
  },
  B0472200: {
    agazat: 'Fizikai ágazat',
    kategoria: 'Könnyű fizikai, gyári, raktári',
    varmegye: 'Pest',
    leiras: 'Nyomdai kisegítő — asztalváz összeszerelés, csomagolás.',
    munkavegzesi_helyek: [{ irszam: '1117', varos: 'Budapest', utca: 'Irinyi József u. 4-20.' }],
    kapcsolattartok: [
      { nev: 'Konfár Kitti', email: 'konfar.kitti@melodiak.hu', mobil: '+36 20 111 2233' },
    ],
    dijak: [{ id: '1', nev: '2100 Ft/óra - Nyomdai kisegítő', ar: 2100, egysegtipus: 'Ft/óra', tipus: 'Átfuttatás' }],
    szamfejtesi_berek: [
      { id: '1', nev: 'Nyomdai kisegítő', ar: 2100, munkakor: 'Fizikai, gyári, raktári', vallalasi_dij_id: '1' },
    ],
  },
  B0043100: {
    agazat: 'Fizikai ágazat',
    kategoria: 'Adminisztratív, irodai',
    varmegye: 'Pest',
    leiras: 'Takarítás IV. kerület — irodaház common területek.',
    munkavegzesi_helyek: [{ irszam: '1042', varos: 'Budapest', utca: 'Rózsa u. 45.' }],
    kapcsolattartok: [
      { nev: 'Dilingai Pál', email: 'dilingai.pal@melodiak.hu', mobil: '+36 30 444 5566' },
    ],
    dijak: [{ id: '1', nev: '2500 Ft/óra - Takarítás', ar: 2500, egysegtipus: 'Ft/óra', tipus: 'Szervezős' }],
    szamfejtesi_berek: [
      { id: '1', nev: 'Takarítás', ar: 2500, munkakor: 'Adminisztratív, irodai', vallalasi_dij_id: '1' },
    ],
  },
  B0472100: {
    agazat: 'Fizikai ágazat',
    kategoria: 'Könnyű fizikai, gyári, raktári',
    varmegye: 'Pest',
    leiras: 'Címkézés Biatorbágy — logisztikai központ.',
    munkavegzesi_helyek: [{ irszam: '2051', varos: 'Biatorbágy', utca: 'Iparos u. 8.' }],
    kapcsolattartok: [
      { nev: 'Edőcs Ádám', email: 'edocs.adam@melodiak.hu', mobil: '+36 70 333 4455' },
    ],
    dijak: [{ id: '1', nev: '2000 Ft/óra - Címkézés', ar: 2000, egysegtipus: 'Ft/óra', tipus: 'Szervezős' }],
    szamfejtesi_berek: [
      { id: '1', nev: 'Címkézés', ar: 2000, munkakor: 'Fizikai, gyári, raktári', vallalasi_dij_id: '1' },
    ],
    teljesitesek: [
      {
        azonosito: 'B0472100-200601',
        idoszak: '2026-05',
        statusz: 'Jóváhagyott',
        sorok: [{ dij_id: '1', menny: 120, elsz_menny: 118 }],
      },
    ],
    kifizetesek: [
      { temavezeto: 'Edőcs Ádám', szf_idoszak: '2026-05', osszesen: 236000, statusz: 'Számfejtett' },
    ],
  },
};
