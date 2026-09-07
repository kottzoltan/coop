export interface DiakRegisztracio {
  id: number;
  nev: string;
  email: string;
  telefon: string;
  szuldat: string;
  lakcim: string | null;
  iroda: string;
  iskola: string | null;
  megjegyzes: string | null;
  statusz: string;
  letrehozva: string;
  profil?: import('@coop/shared').DiakProfilPayload;
}

export interface Projekt {
  id: number;
  azonosito: string;
  nev: string;
  partner_nev: string | null;
  partner_id?: number | null;
  iroda: string | null;
  statusz: string;
  prioritas?: string | null;
  belso_munka?: boolean | null;
  hirdetes_szam?: number;
  aktiv_hirdetes?: number;
  jelentkezok?: number;
  meta?: import('@coop/shared').ProjektMetaPayload | null;
  fedezet?: import('@coop/shared').FedezetOsszesito;
}

export interface ProjektBerKod {
  id: number;
  projekt_id: number;
  kod: string;
  ar: number;
  munkakor: string | null;
}

export interface ProjektSzereplo {
  id: number;
  projekt_id: number;
  nev: string;
  szerepkor: string | null;
  email?: string | null;
  erv_kezdete?: string | null;
  erv_vege?: string | null;
  tipus?: string | null;
  osszeg?: number | null;
  min_osszeg?: number | null;
  reszesedes?: number | null;
}

export interface MunkaHirdetes {
  id: number;
  projekt_id: number | null;
  cim: string;
  munkakor: string;
  partner: string | null;
  varos: string;
  varmegye: string | null;
  ber: number;
  munkanapok: string;
  munkaido: string | null;
  cimkek: string | null;
  leiras: string | null;
  aktiv: boolean;
  letrehozva: string;
  nyelv?: string | null;
  toborzo?: string | null;
  felelos?: string | null;
  kifizetesi_kod?: string | null;
  berezes?: string | null;
  egyeni_ber?: string | null;
  extra_varos?: string | null;
  extra_varmegye?: string | null;
  szoveges_munkaido?: boolean | null;
  munkaido_leiras?: string | null;
  min_korhatar?: number | null;
  erv_datum?: string | null;
  oneletrajz?: boolean | null;
  telefonszam?: boolean | null;
  megjegyzes?: string | null;
  nem_ertem_el?: string | null;
  munkavegzes_helye?: string | null;
  munkavegzes_idopontja?: string | null;
  berezes_szoveg?: string | null;
  befejezo_szoveg?: string | null;
  eloszo_fejlec?: string | null;
  eloszo_torzs?: string | null;
  eloszo_lablec?: string | null;
  amit_kinalunk?: string | null;
  fobb_feladatok?: string | null;
  elvarasok?: string | null;
  elonyt_jelent?: string | null;
  kep_nev?: string | null;
  kep_focim?: string | null;
  kep_alcim?: string | null;
  kep_alcim_szin?: string | null;
  megtekintesek?: number | null;
  jelentkezok?: number;
  projekt_azonosito?: string | null;
}

export interface MunkaJelentkezes {
  id: number;
  hirdetes_id: number;
  nev: string;
  email: string;
  telefon: string | null;
  regisztracio_id: number | null;
  statusz: string;
  megjegyzes?: string | null;
  mas_hirdetes_id?: number | null;
  letrehozva: string;
  hirdetes_cim?: string;
  hirdetes_varos?: string;
  hirdetes_munkakor?: string;
  projekt_id?: number | null;
  diak_iroda?: string | null;
  diak_iskola?: string | null;
  nem_ertem_el_at?: string | null;
  hirdetes_nem_ertem_el?: string | null;
}

export const JELENTKEZES_STATUSZOK = [
  'Kezeletlen',
  'Önéletrajzot várunk',
  'Interjú',
  'Felvéve',
  'Más munkára ajánlottuk',
  'Nem elérhető',
  'Visszamondta',
  'Elutasítva',
] as const;

export async function getRegisztraciok() {
  const res = await fetch('/api/regisztracio');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Regisztrációk betöltése sikertelen');
  }
  return json as { sorok: DiakRegisztracio[]; count: number };
}

export async function getMunkak(params: Record<string, string> = {}) {
  const q = new URLSearchParams(params);
  const res = await fetch(`/api/munkak?${q}`);
  if (!res.ok) throw new Error('Munkák betöltése sikertelen');
  return res.json() as Promise<{ sorok: MunkaHirdetes[]; count: number }>;
}

export async function getMunka(id: number, belso = false) {
  const q = belso ? `?id=${id}&belso=1` : `?id=${id}`;
  const res = await fetch(`/api/munkak${q}`);
  if (!res.ok) throw new Error('Munka betöltése sikertelen');
  return res.json() as Promise<{ sor: MunkaHirdetes; projekt?: Projekt | null }>;
}

export async function ujMunka(data: Partial<MunkaHirdetes>) {
  const res = await fetch('/api/munkak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  }
  return res.json();
}

export async function mentHirdetes(id: number, data: Partial<MunkaHirdetes>) {
  const res = await fetch('/api/munkak', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  }
  return res.json();
}

export async function hirdetesTomeges(ids: number[], akcio: 'aktiv' | 'inaktiv' | 'erv_plus_14' | 'torol') {
  const res = await fetch('/api/munkak', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'tomeges', ids, akcio }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Tömeges művelet sikertelen');
  return json as { ok: boolean; frissitve: number };
}

export async function getProjektek() {
  const res = await fetch('/api/projektek');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const body = json as { hiba?: string; reszlet?: string };
    const msg = body.hiba ?? 'Projektek betöltése sikertelen';
    throw new Error(body.reszlet ? `${msg} (${body.reszlet})` : msg);
  }
  return json as { sorok: Projekt[]; count: number };
}

export async function getProjekt(id: number) {
  const res = await fetch(`/api/projektek?id=${id}`);
  if (!res.ok) throw new Error('Projekt betöltése sikertelen');
  return res.json() as Promise<ProjektReszletValasz>;
}

export type ProjektReszletValasz = {
  sor: Projekt;
  meta: import('@coop/shared').ProjektMetaPayload;
  fedezet: import('@coop/shared').FedezetOsszesito;
  berKodok: ProjektBerKod[];
  szereplok: ProjektSzereplo[];
  hirdetesek: Array<{
    id: number;
    cim: string;
    aktiv: boolean;
    varos: string;
    letrehozva: string;
    jelentkezok: number;
  }>;
};

export type ProjektSorPatch = {
  nev?: string;
  partner_id?: number | null;
  partner_nev?: string | null;
  iroda?: string | null;
  statusz?: string;
  prioritas?: string | null;
  belso_munka?: boolean | null;
};

export async function patchProjektMeta(
  id: number,
  meta: import('@coop/shared').ProjektMetaPayload,
  sor?: ProjektSorPatch,
) {
  const res = await fetch('/api/projektek', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, meta, sor }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  }
  return json as ProjektReszletValasz;
}

export async function ujProjekt(data: {
  nev: string;
  partner_id?: number | null;
  partner_nev?: string | null;
  iroda?: string | null;
  statusz?: string;
  prioritas?: string | null;
  belso_munka?: boolean;
  meta?: import('@coop/shared').ProjektMetaPayload;
}) {
  const res = await fetch('/api/projektek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'uj_projekt', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Projekt létrehozása sikertelen');
  }
  return json as ProjektReszletValasz;
}

export type UjSzereploInput = {
  nev: string;
  szerepkor?: string;
  email?: string;
  erv_kezdete?: string;
  erv_vege?: string;
  tipus?: string;
  osszeg?: number;
  min_osszeg?: number;
  reszesedes?: number;
};

export async function addProjektSzereplok(projektId: number, szereplok: UjSzereploInput[]) {
  const res = await fetch('/api/projektek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projekt_id: projektId, szereplok }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Szereplő mentés sikertelen');
  }
  return json as ProjektReszletValasz;
}

export async function deleteProjektSzereplo(szereploId: number) {
  const res = await fetch(`/api/projektek?szereplo_id=${szereploId}`, { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Törlés sikertelen');
  }
  return json as ProjektReszletValasz;
}

export async function diakBelepes(email: string, szuldat: string) {
  const res = await fetch('/api/diak-belepes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, szuldat }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Belépés sikertelen');
  return json as { ok: boolean; diak: DiakRegisztracio };
}

export async function getDiakProfil(id: number, belso = false) {
  const q = new URLSearchParams({ id: String(id) });
  if (belso) q.set('belso', '1');
  const res = await fetch(`/api/diak-belepes?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Profil betöltése sikertelen');
  }
  return json as {
    diak: DiakRegisztracio;
    profil: import('@coop/shared').DiakProfilPayload;
    jelentkezesek: MunkaJelentkezes[];
  };
}

export async function mentDiakProfil(profil: import('@coop/shared').DiakProfilPayload) {
  const res = await fetch('/api/diak-belepes', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profil }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Profil mentés sikertelen');
  }
  return json as {
    diak: DiakRegisztracio;
    profil: import('@coop/shared').DiakProfilPayload;
    jelentkezesek: MunkaJelentkezes[];
  };
}

export async function jelentkezes(data: {
  hirdetes_id: number;
  nev: string;
  email: string;
  telefon?: string;
  regisztracio_id?: number;
}) {
  const res = await fetch('/api/jelentkezes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Jelentkezés sikertelen');
  return res.json();
}

export async function getJelentkezesek(
  params: {
    hirdetes_id?: number;
    regisztracio_id?: number;
    statusz?: string;
    keres?: string;
  } = {},
) {
  const q = new URLSearchParams();
  if (params.hirdetes_id) q.set('hirdetes_id', String(params.hirdetes_id));
  if (params.regisztracio_id) q.set('regisztracio_id', String(params.regisztracio_id));
  if (params.statusz) q.set('statusz', params.statusz);
  if (params.keres) q.set('keres', params.keres);
  const res = await fetch(`/api/jelentkezes?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { hiba?: string; reszlet?: string }).hiba ??
        (json as { reszlet?: string }).reszlet ??
        'Jelentkezések betöltése sikertelen',
    );
  }
  return json as Promise<{
    sorok: MunkaJelentkezes[];
    count: number;
    statuszok: string[];
  }>;
}

export async function getJelentkezes(id: number) {
  const res = await fetch(`/api/jelentkezes?id=${id}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Jelentkezés betöltése sikertelen');
  return json as { sor: MunkaJelentkezes; statuszok: string[] };
}

export async function jelentkezesMent(
  id: number,
  data: { statusz?: string; megjegyzes?: string | null; mas_hirdetes_id?: number | null },
) {
  const res = await fetch('/api/jelentkezes', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json as { ok: boolean; sor: MunkaJelentkezes };
}

export async function jelentkezesStatusz(id: number, statusz: string) {
  return jelentkezesMent(id, { statusz });
}

// —— Partner portál ——

export type PartnerMuszak = {
  id: number;
  cim: string;
  hely: string | null;
  datum: string;
  kezdet: string;
  vege: string;
  letszamMegrendelt: number | null;
  munkakor: string | null;
  statusz: string;
  leiras: string | null;
  beosztott: number;
  projekt_azonosito: string | null;
  modosithato?: boolean;
  torolheto?: boolean;
  muveletIndok?: string | null;
};

export type PartnerBeosztasCsoport = {
  id: number;
  nev: string;
  projekt_id: number | null;
  statusz: string;
  leiras: string | null;
  projekt_azonosito: string | null;
  projekt_nev: string | null;
};

export type PartnerJelenletSor = {
  jelenlet: {
    id: number;
    statusz: string;
    erkezes: string | null;
    tavozas: string | null;
    megjegyzes: string | null;
  };
  muszak: { cim: string; datum: string; kezdet: string; vege: string };
  diak_nev: string;
};

export async function getPartnerBeosztas() {
  const res = await fetch('/api/beosztas?partner=1');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Beosztások betöltése sikertelen');
  return json as {
    demo?: boolean;
    lezarasOra?: number;
    beosztasok: PartnerBeosztasCsoport[];
    muszakok: PartnerMuszak[];
    statistikak: {
      osszesMuszak: number;
      kovetkezo2Het: number;
      beosztottOsszesen: number;
      fuggőJelenlet: number;
    };
  };
}

export async function partnerMegrendeles(data: {
  napok: string[];
  kezdet: string;
  vege: string;
  letszam: number;
  munkakor?: string;
  cim?: string;
  hely?: string;
  leiras?: string;
  beosztas_csoport_id?: number;
}) {
  const res = await fetch('/api/beosztas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Megrendelés sikertelen');
  return json as { ok: boolean; count: number };
}

export async function partnerMuszakModosit(data: {
  muszak_id: number;
  kezdet?: string;
  vege?: string;
  letszam?: number;
  munkakor?: string;
  cim?: string;
  hely?: string;
  leiras?: string;
  statusz?: 'piszkozat' | 'publikus' | 'zárt';
}) {
  const res = await fetch('/api/beosztas', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Műszak mentés sikertelen');
  return json as { ok: boolean; muszak: PartnerMuszak };
}

export async function partnerMuszakTorol(muszakId: number) {
  const res = await fetch('/api/beosztas', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muszak_id: muszakId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Műszak törlés sikertelen');
  return json as { ok: boolean };
}

export type DiakBeosztasSor = {
  beosztas: { id: number; statusz: string };
  muszak: {
    id: number;
    cim: string;
    hely: string | null;
    datum: string;
    kezdet: string;
    vege: string;
    statusz?: string;
  };
  checkin?: {
    gps_kotelezo: boolean;
    gps_sugar_m: number;
    hely_lat: string | null;
    hely_lng: string | null;
    erkezes_nyitva: boolean;
    erkezes_uzenet: string | null;
    erkezes_ablak: { nyitas: string; zaras: string };
    tavozas_nyitva: boolean;
    tavozas_uzenet: string | null;
    tavozas_ablak: { nyitas: string; zaras: string };
  };
  lemondhato?: boolean;
  lemondasKerelem?: boolean;
  lemondasIndok?: string | null;
};

export async function getDiakBeosztasok() {
  const res = await fetch('/api/beosztas');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Beosztások betöltése sikertelen');
  return json as { sorok: DiakBeosztasSor[]; lezarasOra?: number };
}

export async function diakMuszakLemondas(beosztasId: number) {
  const res = await fetch('/api/beosztas', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beosztas_id: beosztasId, lemondas: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Lemondás sikertelen');
  return json as { ok: boolean; uzenet: string };
}

export async function getPartnerJelenletek(statusz?: string) {
  const q = new URLSearchParams({ partner: '1' });
  if (statusz) q.set('statusz', statusz);
  const res = await fetch(`/api/jelenlet?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Jelenlétek betöltése sikertelen');
  return json as { sorok: PartnerJelenletSor[]; count: number };
}

export async function partnerJelenletModosit(data: {
  id: number;
  statusz?: 'partner_jóváhagyva' | 'elutasítva' | 'jóváhagyva';
  erkezes?: string | null;
  tavozas?: string | null;
  megjegyzes?: string | null;
  indok?: string | null;
}) {
  const res = await fetch('/api/jelenlet', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json;
}

export async function partnerJelenletRogzites(data: {
  diak_id: number;
  projekt_id?: number;
  muszak_datum?: string;
  erkezes?: string;
  tavozas?: string;
  megjegyzes?: string;
}) {
  const res = await fetch('/api/jelenlet?partner=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Rögzítés sikertelen');
  return json;
}

export type PvMegrendelesSor = {
  muszak: {
    id: number;
    cim: string;
    datum: string;
    kezdet: string;
    vege: string;
    letszam_megrendelt?: number | null;
  };
  projekt_azonosito: string | null;
  projekt_nev: string | null;
  partner_cegnev: string | null;
};

export type PvJelenletSor = {
  jelenlet: {
    id: number;
    statusz: string;
    erkezes: string | null;
    tavozas: string | null;
    megjegyzes?: string | null;
    forras?: string | null;
    rogzitesMod?: string | null;
    muszakDatum?: string | null;
  };
  diak_nev: string;
  projekt_azonosito: string | null;
  projekt_nev: string | null;
  partner_cegnev: string | null;
  muszak_datum?: string | null;
  naplo?: Array<{
    id: number;
    mezo: string;
    regiErtek: string | null;
    ujErtek: string | null;
    indok: string | null;
  }>;
};

export type PvFolyamatProjekt = {
  projekt_id: number;
  projekt_azonosito: string;
  projekt_nev: string;
  fazis: string;
  muszak_piszkozat?: number;
  muszak_jovobeli?: number;
  beosztott_7nap?: number;
  jelenlet_rogzitett?: number;
  jelenlet_partner?: number;
  jelenlet_pv?: number;
  jelenlet_elutasitva?: number;
  szabad_jelenlet_14nap?: number;
};

export type PvFolyamatPartner = {
  partner_id: number;
  partner_cegnev: string;
  partner_email: string;
  projektek: PvFolyamatProjekt[];
};

export async function getPvMunkaterulet(
  nezet: 'osszesito' | 'megrendelesek' | 'jelenletek' | 'folyamat',
  params?: { statusz?: string; projekt_id?: number },
) {
  const q = new URLSearchParams({ nezet });
  if (params?.statusz) q.set('statusz', params.statusz);
  if (params?.projekt_id) q.set('projekt_id', String(params.projekt_id));
  const res = await fetch(`/api/pv-munkaterulet?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'PV munkaterület betöltése sikertelen');
  return json as {
    szamok?: Record<string, number>;
    sorok?: Array<PvMegrendelesSor | PvJelenletSor>;
    count?: number;
    partnerek?: PvFolyamatPartner[];
  };
}

export type FolyamatTerkepCsomo = {
  id: string;
  label: string;
  leiras: string;
  sav: 'diak' | 'partner' | 'pv' | 'toborzas';
  countKulcs: string;
  href: string;
  teendoSzerep?: 'partner' | 'pv';
  count: number;
};

export type FolyamatTerkepEl = {
  from: string;
  to: string;
  label: string;
  dontes?: boolean;
};

export type FolyamatTerkepTeendo = {
  id: string;
  cim: string;
  db: number;
  href: string;
  szerep: 'partner' | 'pv';
  tabHint?: string;
};

export async function getFolyamatTerkep() {
  const res = await fetch('/api/folyamat-terkep');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Folyamat-térkép betöltése sikertelen');
  }
  return json as {
    csomok: FolyamatTerkepCsomo[];
    elek: FolyamatTerkepEl[];
    szamok: Record<string, number>;
    teendok: FolyamatTerkepTeendo[];
  };
}

export async function getFolyamatTerkepReszlet(csomopont: string) {
  const res = await fetch(`/api/folyamat-terkep?csomopont=${encodeURIComponent(csomopont)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { hiba?: string }).hiba ?? 'Csomópont részlet betöltése sikertelen');
  }
  return json as {
    csomopont: FolyamatTerkepCsomo;
    tipusa: string;
    sorok: Array<Record<string, unknown>>;
    count: number;
  };
}

export async function pvMegrendelesVisszaigazolas(muszakId: number) {
  const res = await fetch('/api/pv-munkaterulet', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'megrendeles_visszaigazolas', muszak_id: muszakId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Visszaigazolás sikertelen');
  return json;
}

export async function pvJelenletVeglegesites(jelenletId: number, indok?: string) {
  const res = await fetch('/api/pv-munkaterulet', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'jelenlet_veglegesites', jelenlet_id: jelenletId, indok }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Véglegesítés sikertelen');
  return json;
}

export async function pvJelenletElutasitas(jelenletId: number, indok?: string) {
  const res = await fetch('/api/pv-munkaterulet', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'jelenlet_elutasitas', jelenlet_id: jelenletId, indok }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Elutasítás sikertelen');
  return json;
}

// —— Belső beosztáskezelő ——

export type BelsoMuszak = PartnerMuszak & {
  projekt_nev?: string | null;
  partner_cegnev?: string | null;
};

export type BelsoBeosztasCsoport = PartnerBeosztasCsoport & {
  partner_cegnev?: string | null;
};

export type BelsoJelenletSor = {
  jelenlet: {
    id: number;
    statusz: string;
    erkezes: string | null;
    tavozas: string | null;
    qrErkezes?: string | null;
    qrTavozas?: string | null;
    gpsLat?: string | null;
    gpsLng?: string | null;
    megjegyzes: string | null;
  };
  beosztas?: { id: number; statusz: string };
  muszak: { cim: string; datum: string; kezdet: string; vege: string };
  diak_nev: string;
  projekt_azonosito: string | null;
  projekt_nev: string | null;
};

export async function getBelsoBeosztas(params?: { projekt_id?: number }) {
  const q = new URLSearchParams({ belso: '1' });
  if (params?.projekt_id) q.set('projekt_id', String(params.projekt_id));
  const res = await fetch(`/api/beosztas?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Beosztások betöltése sikertelen');
  return json as {
    lezarasOra?: number;
    beosztasok: BelsoBeosztasCsoport[];
    muszakok: BelsoMuszak[];
    statistikak: {
      osszesMuszak: number;
      kovetkezo2Het: number;
      beosztottOsszesen: number;
      fuggőJelenlet: number;
    };
  };
}

export async function getBelsoMuszakReszlet(muszakId: number) {
  const res = await fetch(`/api/beosztas?belso=1&muszak_id=${muszakId}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Műszak betöltése sikertelen');
  return json as {
    muszak: BelsoMuszak;
    beosztottak: Array<{
      beosztas: { id: number; statusz: string };
      diak_nev: string;
      diak_id: number;
    }>;
  };
}

export async function getBelsoJelenletek(params?: {
  statusz?: string;
  projekt_id?: number;
}) {
  const q = new URLSearchParams({ belso: '1' });
  if (params?.statusz) q.set('statusz', params.statusz);
  if (params?.projekt_id) q.set('projekt_id', String(params.projekt_id));
  const res = await fetch(`/api/jelenlet?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Jelenlétek betöltése sikertelen');
  return json as { sorok: BelsoJelenletSor[]; count: number };
}

export async function belsoJelenletModosit(data: {
  id: number;
  statusz?: 'pv_véglegesített' | 'partner_jóváhagyva' | 'elutasítva' | 'rögzített' | 'jóváhagyva';
  erkezes?: string | null;
  tavozas?: string | null;
  megjegyzes?: string | null;
  indok?: string | null;
}) {
  const res = await fetch('/api/jelenlet?belso=1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json;
}

// —— Szövetkezeti tagok ——

export type { SzovetkezetiTag } from '@coop/shared';

export async function getTagok(params?: {
  keres?: string;
  tagsag?: string;
  iroda?: string;
  iskola?: string;
  hianyossag?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.keres) q.set('keres', params.keres);
  if (params?.tagsag) q.set('tagsag', params.tagsag);
  if (params?.iroda) q.set('iroda', params.iroda);
  if (params?.iskola) q.set('iskola', params.iskola);
  if (params?.hianyossag) q.set('hianyossag', '1');
  const res = await fetch(`/api/tagok?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Tagok betöltése sikertelen');
  return json as {
    sorok: import('@coop/shared').SzovetkezetiTag[];
    count: number;
    osszes: number;
  };
}

export async function getTag(id: number) {
  const res = await fetch(`/api/tagok?id=${id}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Tag betöltése sikertelen');
  return json as { tag: import('@coop/shared').SzovetkezetiTag };
}

export async function ujTag(data: Partial<import('@coop/shared').SzovetkezetiTag>) {
  const res = await fetch('/api/tagok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Tag létrehozása sikertelen');
  return json as { ok: boolean; tag: import('@coop/shared').SzovetkezetiTag };
}

export async function mentTag(id: number, data: Partial<import('@coop/shared').SzovetkezetiTag>) {
  const res = await fetch('/api/tagok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Tag mentése sikertelen');
  return json as { ok: boolean; tag: import('@coop/shared').SzovetkezetiTag };
}

export async function tagErdeklodobol(diakRegisztracioId: number, adoszam: string) {
  const res = await fetch('/api/tagok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'erdeklodobol', diak_regisztracio_id: diakRegisztracioId, adoszam }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Felvétel tagként sikertelen');
  return json as { ok: boolean; tag: import('@coop/shared').SzovetkezetiTag };
}

export async function tagTomegesMuvelet(ids: number[], akcio: 'lezaras' | 'kileptetes' | 'ervenyes') {
  const res = await fetch('/api/tagok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'tomeges', ids, akcio }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Tömeges művelet sikertelen');
  return json as { ok: boolean; sorok: import('@coop/shared').SzovetkezetiTag[]; count: number };
}

export async function tagAtembeles(celTagId: number, forras: string) {
  const res = await fetch('/api/tagok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: celTagId, muvelet: 'atembeles', forras }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Tag átemelés sikertelen');
  return json as { ok: boolean; tag: import('@coop/shared').SzovetkezetiTag };
}

export async function feltoltDokumentum(data: {
  scope_id: number;
  fajlnev: string;
  tartalom_base64: string;
  content_type?: string;
  scope?: string;
}) {
  const res = await fetch('/api/dokumentumok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Feltöltés sikertelen');
  return json as { ok: boolean; blob_key: string; meret: string };
}

export function dokumentumLetoltesUrl(blobKey: string) {
  return `/api/dokumentumok?key=${encodeURIComponent(blobKey)}`;
}

export async function belsoQrJelenlet(beosztasId: number, tipus: 'qr_erkezes' | 'qr_tavozas') {
  const res = await fetch('/api/jelenlet?belso=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beosztas_id: beosztasId, tipus }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'QR jelenlét sikertelen');
  return json as { ok: boolean };
}

export async function getApiHealth(schema = false) {
  const q = schema ? '?schema=1' : '';
  const res = await fetch(`/api/health${q}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function belsoMuszakLetrehoz(data: {
  napok: string[];
  kezdet: string;
  vege: string;
  letszam?: number;
  munkakor?: string;
  cim?: string;
  hely?: string;
  leiras?: string;
  partner_id?: number;
  projekt_id?: number;
  statusz?: string;
}) {
  const res = await fetch('/api/beosztas?belso=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Műszak létrehozása sikertelen');
  return json as { ok: boolean; count: number };
}

export async function belsoMuszakModosit(data: {
  muszak_id: number;
  kezdet?: string;
  vege?: string;
  letszam?: number;
  munkakor?: string;
  cim?: string;
  hely?: string | null;
  leiras?: string | null;
  statusz?: string;
  projekt_id?: number | null;
}) {
  const res = await fetch('/api/beosztas?belso=1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Műszak mentése sikertelen');
  return json;
}

export async function belsoMuszakTorol(muszakId: number) {
  const res = await fetch('/api/beosztas?belso=1', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muszak_id: muszakId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Törlés sikertelen');
  return json;
}

export async function belsoDiakBeoszt(muszakId: number, diakIds: number[]) {
  const res = await fetch('/api/beosztas?belso=1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'diak_hozzaad', muszak_id: muszakId, diak_ids: diakIds }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Beosztás sikertelen');
  return json as { ok: boolean; count: number };
}

export async function belsoDiakBeosztTorol(beosztasId: number) {
  const res = await fetch('/api/beosztas?belso=1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'diak_torol', beosztas_id: beosztasId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Eltávolítás sikertelen');
  return json;
}

export async function belsoLemondasDontes(beosztasId: number, elfogadva: boolean) {
  const res = await fetch('/api/beosztas?belso=1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'lemondas_dontes', beosztas_id: beosztasId, elfogadva }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Lemondás döntés sikertelen');
  return json;
}

export async function belsoCsoportLetrehoz(data: {
  nev: string;
  projekt_id?: number;
  partner_id?: number;
  leiras?: string;
}) {
  const res = await fetch('/api/beosztas?belso=1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'csoport_letrehoz', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Csoport létrehozása sikertelen');
  return json as { ok: boolean; csoport: BelsoBeosztasCsoport };
}

export async function feltoltDiakDokumentum(
  diakId: number,
  fajl: File,
): Promise<{ blob_key: string; meret: string }> {
  const buf = await fajl.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const tartalom_base64 = btoa(binary);
  const r = await fetch('/api/dokumentumok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'diak',
      scope_id: diakId,
      fajlnev: fajl.name,
      tartalom_base64,
      content_type: fajl.type || 'application/octet-stream',
    }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Feltöltés sikertelen');
  return json as { blob_key: string; meret: string };
}

export async function getReszletesKereso(q: string, modul = 'mind') {
  const params = new URLSearchParams({ q, modul });
  const res = await fetch(`/api/kereso?${params}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Keresés sikertelen');
  return json as {
    q: string;
    modul: string;
    osszes: number;
    eredmeny: Record<string, Array<Record<string, unknown>>>;
  };
}

export type Kampany = {
  id: number;
  nev: string;
  leiras: string | null;
  statusz: string;
  kezdet: string | null;
  vege: string | null;
  hirdetes_id: number | null;
  hirdetes_cim?: string | null;
  letrehozva: string;
};

export type KampanyResztvevo = {
  id: number;
  kampany_id: number;
  nev: string;
  email: string | null;
  telefon: string | null;
  regisztracio_id: number | null;
  tag_id: number | null;
  jelentkezes_id: number | null;
  statusz: string;
  letrehozva: string;
};

export async function getKampanyok() {
  const res = await fetch('/api/kampanyok');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Kampányok betöltése sikertelen');
  return json as { sorok: Kampany[]; count: number; statuszok: string[] };
}

export async function getKampany(id: number) {
  const res = await fetch(`/api/kampanyok?id=${id}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Kampány betöltése sikertelen');
  return json as { kampany: Kampany; resztvevok: KampanyResztvevo[] };
}

export async function ujKampany(data: Partial<Kampany>) {
  const res = await fetch('/api/kampanyok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Kampány létrehozása sikertelen');
  return json as { ok: boolean; kampany: Kampany };
}

export async function mentKampany(id: number, data: Partial<Kampany>) {
  const res = await fetch('/api/kampanyok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Kampány mentése sikertelen');
  return json as { ok: boolean; kampany: Kampany };
}

export async function kampanyResztvevoHozzaad(data: {
  kampany_id: number;
  nev: string;
  email?: string;
  telefon?: string;
  regisztracio_id?: number;
  jelentkezes_id?: number;
}) {
  const res = await fetch('/api/kampanyok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'resztvevo', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Résztvevő hozzáadása sikertelen');
  return json as { ok: boolean; resztvevo: KampanyResztvevo };
}

export async function kampanyResztvevoMent(id: number, data: Partial<KampanyResztvevo>) {
  const res = await fetch('/api/kampanyok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'resztvevo', id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Résztvevő mentése sikertelen');
  return json as { ok: boolean; resztvevo: KampanyResztvevo };
}

// —— Partnerek + CRM ——

export type {
  Partner,
  PartnerKapcsolattarto,
  PartnerKommunikacio,
  PartnerSzerzodes,
} from '@coop/shared';

export async function getPartnerek(params?: {
  keres?: string;
  statusz?: string;
  iroda?: string;
}) {
  const q = new URLSearchParams({ nezet: 'partnerek' });
  if (params?.keres) q.set('keres', params.keres);
  if (params?.statusz) q.set('statusz', params.statusz);
  if (params?.iroda) q.set('iroda', params.iroda);
  const res = await fetch(`/api/partnerek?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Partnerek betöltése sikertelen');
  return json as {
    sorok: import('@coop/shared').Partner[];
    count: number;
    osszes: number;
  };
}

export async function getCrmLeadek(params?: { keres?: string; felelos?: string }) {
  const q = new URLSearchParams({ nezet: 'crm' });
  if (params?.keres) q.set('keres', params.keres);
  if (params?.felelos) q.set('felelos', params.felelos);
  const res = await fetch(`/api/partnerek?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'CRM betöltése sikertelen');
  return json as { sorok: import('@coop/shared').Partner[]; count: number };
}

export async function getPartnerSzerzodesek(params?: { statusz?: string; partner_id?: number }) {
  const q = new URLSearchParams({ nezet: 'szerzodesek' });
  if (params?.statusz) q.set('statusz', params.statusz);
  if (params?.partner_id) q.set('partner_id', String(params.partner_id));
  const res = await fetch(`/api/partnerek?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Szerződések betöltése sikertelen');
  return json as { sorok: import('@coop/shared').PartnerSzerzodes[]; count: number };
}

export async function getPartner(id: number) {
  const res = await fetch(`/api/partnerek?id=${id}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Partner betöltése sikertelen');
  return json as { partner: import('@coop/shared').Partner };
}

export async function ujPartner(data: Record<string, unknown>) {
  const res = await fetch('/api/partnerek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Partner létrehozása sikertelen');
  return json as { ok: boolean; partner: import('@coop/shared').Partner };
}

export async function mentPartner(id: number, data: Record<string, unknown>) {
  const res = await fetch('/api/partnerek', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Partner mentése sikertelen');
  return json as { ok: boolean; partner: import('@coop/shared').Partner };
}

export async function mentPartnerKapcsolattarto(data: Record<string, unknown>) {
  const res = await fetch('/api/partnerek', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'kapcsolattarto_frissites', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Kapcsolattartó mentése sikertelen');
  return json as { ok: boolean; kapcsolattarto: import('@coop/shared').PartnerKapcsolattarto };
}

export async function ujPartnerKapcsolattarto(data: Record<string, unknown>) {
  const res = await fetch('/api/partnerek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'kapcsolattarto', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Kapcsolattartó hozzáadása sikertelen');
  return json as { ok: boolean; kapcsolattarto: import('@coop/shared').PartnerKapcsolattarto };
}

export async function torolPartnerKapcsolattarto(id: number) {
  const res = await fetch(`/api/partnerek?kapcsolattarto_id=${id}`, { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Törlés sikertelen');
  return json as { ok: boolean };
}

export async function ujPartnerKommunikacio(data: Record<string, unknown>) {
  const res = await fetch('/api/partnerek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'kommunikacio', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Bejegyzés mentése sikertelen');
  return json as { ok: boolean; kommunikacio: import('@coop/shared').PartnerKommunikacio };
}

export async function ujPartnerSzerzodes(data: Record<string, unknown>) {
  const res = await fetch('/api/partnerek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muvelet: 'szerzodes', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Szerződés létrehozása sikertelen');
  return json as { ok: boolean; szerzodes: import('@coop/shared').PartnerSzerzodes };
}

export async function partnerSzerzodesDokumentum(szerzodesId: number, dokumentumNev: string) {
  const res = await fetch('/api/partnerek', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muvelet: 'szerzodes_dokumentum',
      szerzodes_id: szerzodesId,
      dokumentum_nev: dokumentumNev,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Dokumentum mentése sikertelen');
  return json as { ok: boolean; szerzodes: import('@coop/shared').PartnerSzerzodes };
}

// —— Bérszámfejtés (munkalapok) ——

export type { Munkalap } from '@coop/shared';

export async function getMunkalapok(params?: {
  szf_idoszak?: string;
  statusz?: string;
  nezet?: 'folyoszamla';
  projekt_id?: number;
}) {
  const q = new URLSearchParams();
  if (params?.szf_idoszak) q.set('szf_idoszak', params.szf_idoszak);
  if (params?.statusz) q.set('statusz', params.statusz);
  if (params?.nezet) q.set('nezet', params.nezet);
  if (params?.projekt_id) q.set('projekt_id', String(params.projekt_id));
  const res = await fetch(`/api/munkalapok?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Munkalapok betöltése sikertelen');
  return json as { sorok: import('@coop/shared').Munkalap[]; count: number };
}

export async function getMunkalap(id: number) {
  const res = await fetch(`/api/munkalapok?id=${id}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Munkalap betöltése sikertelen');
  return json as {
    munkalap: import('@coop/shared').Munkalap;
    ber_kodok: Array<{ id?: string; ar?: number; nev?: string }>;
    tag_meta?: Record<string, import('@coop/shared').MunkalapTagMeta>;
  };
}

export async function getMunkalapJelenletek(params?: { projekt_id?: number }) {
  const q = new URLSearchParams({ nezet: 'jelenletek' });
  if (params?.projekt_id) q.set('projekt_id', String(params.projekt_id));
  const res = await fetch(`/api/munkalapok?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Jelenlétek betöltése sikertelen');
  return json as {
    sorok: Array<{
      id: number;
      diak_id: number;
      diak_nev: string;
      tag_id: number | null;
      statusz: string;
      erkezes: string | null;
      tavozas: string | null;
      erkezes_ora: string | null;
      tavozas_ora: string | null;
      qr_erkezes: string | null;
      qr_tavozas: string | null;
      qr_erkezes_ora: string | null;
      qr_tavozas_ora: string | null;
      muszak_datum: string | null;
      muszak_kezdet: string;
      muszak_vege: string;
      muszak_cim: string;
      projekt_id: number | null;
      projekt_azonosito: string | null;
    }>;
    count: number;
  };
}

export async function munkalapDiakHozzaad(munkalapId: number, studentIds: number[]) {
  const res = await fetch('/api/munkalapok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: munkalapId, muvelet: 'diak_hozzaad', student_ids: studentIds }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Hozzáadás sikertelen');
  return json as {
    ok: boolean;
    munkalap: import('@coop/shared').Munkalap;
    ber_kodok: Array<{ id?: string; ar?: number; nev?: string }>;
  };
}

export async function munkalapDiakTorol(munkalapId: number, studentId: number) {
  const res = await fetch('/api/munkalapok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: munkalapId, muvelet: 'diak_torol', student_id: studentId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Törlés sikertelen');
  return json as {
    ok: boolean;
    munkalap: import('@coop/shared').Munkalap;
    ber_kodok: Array<{ id?: string; ar?: number; nev?: string }>;
  };
}

export async function munkalapJelenletHozzarendel(
  munkalapId: number,
  jelenletIds: number[],
  defaultKod = '1',
) {
  const res = await fetch('/api/munkalapok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: munkalapId,
      muvelet: 'jelenlet_hozzarendel',
      jelenlet_ids: jelenletIds,
      default_kod: defaultKod,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Hozzárendelés sikertelen');
  return json as {
    ok: boolean;
    munkalap: import('@coop/shared').Munkalap;
    ber_kodok: Array<{ id?: string; ar?: number; nev?: string }>;
  };
}

export async function ujMunkalap(data: Record<string, unknown>) {
  const res = await fetch('/api/munkalapok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Munkalap létrehozása sikertelen');
  return json as { ok: boolean; munkalap: import('@coop/shared').Munkalap };
}

export async function munkalapKorrekcioInditas(munkalapId: number) {
  const res = await fetch('/api/munkalapok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: munkalapId, muvelet: 'korrekcio_inditas' }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Korrekció indítása sikertelen');
  return json as {
    ok: boolean;
    munkalap: import('@coop/shared').Munkalap;
    ber_kodok?: Array<{ id?: string; ar?: number; nev?: string }>;
  };
}

export async function mentMunkalap(id: number, data: Record<string, unknown>) {
  const res = await fetch('/api/munkalapok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json as {
    ok: boolean;
    munkalap: import('@coop/shared').Munkalap;
    ber_kodok?: Array<{ id?: string; ar?: number; nev?: string }>;
  };
}

export async function torolMunkalap(id: number) {
  const res = await fetch(`/api/munkalapok?id=${id}`, { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Törlés sikertelen');
  return json as { ok: boolean };
}

// —— Bérszámfejtési futások ——

export type BerFutasListaSor = {
  id: number;
  cooperative_id: number;
  payroll_period: string;
  performance_period: string | null;
  status: string;
  created_by: string | null;
  closed_at: string | null;
  korrekcio_szulo_id: number | null;
  created_at: string;
  munkalap_count: number;
  sor_count: number;
  error_count: number;
  warn_count: number;
};

export type BerFutasDetail = {
  futas: Omit<BerFutasListaSor, 'munkalap_count' | 'sor_count' | 'error_count' | 'warn_count'>;
  munkalapok: Array<{
    id: number;
    azonosito: string;
    nev: string | null;
    statusz: string;
    szf_idoszak: string;
    projekt_id: number;
  }>;
  sorok: Array<{
    id: number;
    tag_id: number;
    tag_nev: string;
    projekt_id: number;
    wage_code_id: string;
    gross_amount: number;
    work_hours: number | null;
    jogviszony_tipus: string;
    source_munkalap_id: number | null;
    snapshot: {
      calculated_szja: number;
      final_szja_base: number;
      tb_amount: number;
      szocho_amount: number;
      net_amount: number;
      applied_allowances: unknown[];
    } | null;
  }>;
  validacios_hibak: Array<{
    id: number;
    severity: string;
    code: string;
    message: string;
    tag_id: number | null;
    munkalap_id: number | null;
    payroll_line_id: number | null;
  }>;
  osszesito: {
    bruttó: number;
    szja: number;
    tb: number;
    szocho: number;
    nettó: number;
    tag_szám: number;
  } | null;
};

export async function getBerFutasok(payrollPeriod?: string) {
  const q = payrollPeriod ? `?payroll_period=${encodeURIComponent(payrollPeriod)}` : '';
  const res = await fetch(`/api/ber-futasok${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Futások betöltése sikertelen');
  return json as { sorok: BerFutasListaSor[]; count: number };
}

export async function getBerFutas(id: number) {
  const res = await fetch(`/api/ber-futasok?id=${id}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Futás betöltése sikertelen');
  return json as BerFutasDetail;
}

export async function ujBerFutas(data: {
  payroll_period: string;
  performance_period?: string;
  munkalap_ids?: number[];
}) {
  const res = await fetch('/api/ber-futasok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Futás létrehozása sikertelen');
  return json as BerFutasDetail & { ok: boolean };
}

async function berFutasMuvelet(id: number, muvelet: 'validate' | 'close' | 'sync' | 'korrekcio') {
  const res = await fetch('/api/ber-futasok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, muvelet }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Művelet sikertelen');
  return json as BerFutasDetail & { ok: boolean };
}

export const berFutasValidalas = (id: number) => berFutasMuvelet(id, 'validate');
export const berFutasLezaras = (id: number) => berFutasMuvelet(id, 'close');
export const berFutasKorrekcio = (id: number) => berFutasMuvelet(id, 'korrekcio');

// —— NAV bevallások ——

export type NavBevallasListaSor = {
  id: number;
  type: string;
  tax_year: number;
  period: string | null;
  status: string;
  payroll_run_ids: number[];
  generated_at: string | null;
  generated_by: string | null;
  created_at: string;
};

export type NavBevallasDetail = {
  bevallas: NavBevallasListaSor & { form_version_id: number | null };
  osszesito: {
    person_count: number;
    total_gross: number;
    total_szja_base: number;
    total_szja: number;
    total_tb: number;
    total_szocho: number;
  } | null;
  szemelyi_sorok: Array<{
    id: number;
    tag_id: number;
    tax_identification_number: string;
    name: string;
    birth_date: string;
    relation_type: string | null;
    gross_amount: number;
    final_szja_base: number;
    calculated_szja: number;
    tb_amount: number;
    szocho_amount: number;
    exemptions_json: Record<string, string> | null;
  }>;
  validacios_hibak: Array<{
    id: number;
    severity: string;
    code: string;
    message: string;
    tag_id: number | null;
  }>;
  export_fajlok: Array<{
    id: number;
    file_type: string;
    file_name: string;
    file_hash: string;
    generated_at: string;
  }>;
  audit: Array<{
    id: number;
    action: string;
    actor_id: string | null;
    created_at: string;
    payload: unknown;
  }>;
};

export async function getNavBevallasok(opts?: {
  period?: string;
  type?: 'NAV_08' | 'M30' | 'NAV_08E';
  tax_year?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.period) params.set('period', opts.period);
  if (opts?.type) params.set('type', opts.type);
  if (opts?.tax_year) params.set('tax_year', String(opts.tax_year));
  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/nav-bevallasok${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Betöltés sikertelen');
  return json as { sorok: NavBevallasListaSor[]; count: number };
}

/** @deprecated use getNavBevallasok({ period }) */
export async function getNavBevallasokByPeriod(period?: string) {
  return getNavBevallasok({ period, type: 'NAV_08' });
}

export async function getNavBevallas(id: number) {
  const res = await fetch(`/api/nav-bevallasok?id=${id}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Betöltés sikertelen');
  return json as NavBevallasDetail;
}

export async function generateNav08(data: { period: string; payroll_run_ids: number[] }) {
  const res = await fetch('/api/nav-bevallasok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'NAV_08', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Generálás sikertelen');
  return json as NavBevallasDetail & { ok: boolean };
}

export async function exportNavBevallas(id: number) {
  const res = await fetch('/api/nav-bevallasok', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, muvelet: 'export' }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Export sikertelen');
  return json as NavBevallasDetail & { ok: boolean };
}

export async function generateM30(data: { tax_year: number; tag_id?: number }) {
  const res = await fetch('/api/nav-bevallasok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'M30', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'M30 generálás sikertelen');
  return json as NavBevallasDetail & { ok: boolean };
}

export async function generateNav08e(data: { tag_id: number; jogviszony_id: number }) {
  const res = await fetch('/api/nav-bevallasok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'NAV_08E', ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? '08E generálás sikertelen');
  return json as NavBevallasDetail & { ok: boolean };
}

export type JogviszonySor = {
  id: number;
  tag_id: number;
  relation_type: string;
  nav_declaration_required: boolean;
  start_date: string;
  end_date: string | null;
  status: string;
};

export async function getJogviszonyok(tagId: number) {
  const res = await fetch(`/api/jogviszony?tag_id=${tagId}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Betöltés sikertelen');
  return json as { sorok: JogviszonySor[]; count: number };
}

export async function ujJogviszony(data: {
  tag_id: number;
  relation_type: string;
  nav_declaration_required?: boolean;
  start_date: string;
  end_date?: string | null;
}) {
  const res = await fetch('/api/jogviszony', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json as { ok: boolean; jogviszony: JogviszonySor };
}

export type SzjaKedvezmenyListaSor = import('@coop/shared').SzjaKedvezmeny & {
  tag_id: number;
  tag_nev: string;
};

export async function getSzjaKedvezmenyLista() {
  const res = await fetch('/api/tag-szja-kedvezmenyek?nezet=lista');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Betöltés sikertelen');
  return json as { sorok: SzjaKedvezmenyListaSor[]; count: number };
}

export async function getTagSzjaKedvezmenyek(tagId: number, payrollPeriod?: string) {
  const params = new URLSearchParams({ tag_id: String(tagId) });
  if (payrollPeriod) params.set('payroll_period', payrollPeriod);
  const res = await fetch(`/api/tag-szja-kedvezmenyek?${params}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Betöltés sikertelen');
  return json as {
    kedvezmenyek: import('@coop/shared').SzjaKedvezmeny[];
    preview: Array<{ tipus: string; havi_limit: number }>;
    count: number;
  };
}

export async function putTagSzjaKedvezmenyek(
  tagId: number,
  kedvezmenyek: import('@coop/shared').SzjaKedvezmeny[],
) {
  const res = await fetch('/api/tag-szja-kedvezmenyek', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_id: tagId, kedvezmenyek }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json as { ok: boolean; tag: import('@coop/shared').SzovetkezetiTag };
}

export type DiakM30Info = {
  tax_year: number;
  elerheto: boolean;
  m30: {
    bevallas_id: number;
    export_id: number | null;
    gross: number;
    szja: number;
    name: string;
  } | null;
};

export async function getDiakM30(taxYear: number) {
  const res = await fetch(`/api/diak-m30?tax_year=${taxYear}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Betöltés sikertelen');
  return json as DiakM30Info;
}

// —— Pénzügy / blog / ügyfélszolgálat / e-aláírás ——

export type { PenzugySzamla, BlogBejegyzes, UgyTicket, EAlairasKerelem } from '@coop/shared';

export async function getPenzugySzamlak(statusz?: string) {
  const q = statusz ? `?statusz=${encodeURIComponent(statusz)}` : '';
  const res = await fetch(`/api/penzugy${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Pénzügy betöltése sikertelen');
  return json as {
    sorok: import('@coop/shared').PenzugySzamla[];
    count: number;
    folyoszamla_db: number;
  };
}

export async function mentPenzugySzamla(id: number, data: { statusz?: string; megjegyzes?: string | null }) {
  const res = await fetch('/api/penzugy', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json;
}

export async function getBlogBejegyzesek() {
  const res = await fetch('/api/blog');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Blog betöltése sikertelen');
  return json as { sorok: import('@coop/shared').BlogBejegyzes[]; count: number };
}

export async function ujBlogBejegyzes(data: { cim: string; tartalom?: string }) {
  const res = await fetch('/api/blog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Létrehozás sikertelen');
  return json;
}

export async function mentBlogBejegyzes(id: number, data: Partial<import('@coop/shared').BlogBejegyzes>) {
  const res = await fetch('/api/blog', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json;
}

export async function getUgyTicketek(statusz?: string) {
  const q = statusz ? `?statusz=${encodeURIComponent(statusz)}` : '';
  const res = await fetch(`/api/ugyfel${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Ticketek betöltése sikertelen');
  return json as { sorok: import('@coop/shared').UgyTicket[]; count: number; nyitott: number };
}

export async function ujUgyTicket(data: {
  targy: string;
  leiras?: string;
  prioritas?: string;
  kapcsolat_nev?: string;
  kapcsolat_email?: string;
}) {
  const res = await fetch('/api/ugyfel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Ticket létrehozása sikertelen');
  return json;
}

export async function mentUgyTicket(id: number, data: Partial<import('@coop/shared').UgyTicket>) {
  const res = await fetch('/api/ugyfel', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json;
}

export async function getEAlairasKerelmek() {
  const res = await fetch('/api/ealairas');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Kérelmek betöltése sikertelen');
  return json as { sorok: import('@coop/shared').EAlairasKerelem[]; count: number };
}

export async function ujEAlairasKerelem(data: { tag_id?: number; dokumentum_nev: string }) {
  const res = await fetch('/api/ealairas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Kérelem létrehozása sikertelen');
  return json;
}

export async function mentEAlairasKerelem(id: number, data: { statusz?: string; megjegyzes?: string }) {
  const res = await fetch('/api/ealairas', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
  return json;
}

export async function getDiakFuggobenAlairasok() {
  const res = await fetch('/api/diak-ealairas');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Aláírások betöltése sikertelen');
  return json as {
    sorok: import('@coop/shared').EAlairasKerelem[];
    fuggoben: number;
    count: number;
  };
}

export async function diakSzerzodesAlairas(kerelemId: number) {
  const res = await fetch('/api/diak-ealairas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: kerelemId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Aláírás sikertelen');
  return json as { ok: boolean; sor: import('@coop/shared').EAlairasKerelem };
}

export async function getSzerzodesSablonok(projektId?: number) {
  const q = projektId ? `?projekt_id=${projektId}` : '';
  const res = await fetch(`/api/szerzodes-sablonok${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Sablonok betöltése sikertelen');
  return json as {
    sablonok: {
      keretszerzodes: import('@coop/shared').SzerzodesSablonMeta | null;
      eseti_alap: import('@coop/shared').SzerzodesSablonMeta | null;
      eseti_projekt?: import('@coop/shared').SzerzodesSablonMeta | null;
    };
  };
}

export async function feltoltSzerzodesSablon(data: {
  tipus: 'keretszerzodes' | 'eseti_alap' | 'eseti_projekt';
  fajlnev: string;
  tartalom_base64: string;
  content_type?: string;
  projekt_id?: number;
}) {
  const res = await fetch('/api/szerzodes-sablonok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { hiba?: string }).hiba ?? 'Sablon feltöltés sikertelen');
  return json as { ok: boolean; sablon: import('@coop/shared').SzerzodesSablonMeta };
}
