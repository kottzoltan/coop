/** ICE folyamat-térkép: implementált use case-ek, döntési pontok, teendő-típusok. */

export type FolyamatSav = 'diak' | 'partner' | 'pv' | 'toborzas';

export type FolyamatCsomopontId =
  | 'megrendeles_piszkozat'
  | 'megrendeles_publikus'
  | 'beosztas_aktiv'
  | 'diak_checkin'
  | 'jelenlet_rogzitett'
  | 'jelenlet_partner_jovahagyva'
  | 'jelenlet_pv_veglegesitett'
  | 'jelenlet_elutasitva'
  | 'jelenlet_szabad'
  | 'hirdetes_aktiv'
  | 'jelentkezes_kezeletlen'
  | 'jelentkezes_felveve';

export type FolyamatCsomopont = {
  id: FolyamatCsomopontId;
  label: string;
  leiras: string;
  sav: FolyamatSav;
  /** Élő számláló kulcs az API válaszban */
  countKulcs: string;
  href: string;
  teendoSzerep?: 'partner' | 'pv';
};

export type FolyamatEl = {
  from: FolyamatCsomopontId;
  to: FolyamatCsomopontId;
  label: string;
  dontes?: boolean;
};

export const FOLYAMAT_SAV_LABEL: Record<FolyamatSav, string> = {
  diak: 'Diák',
  partner: 'Partner',
  pv: 'Projektvezető',
  toborzas: 'Toborzás',
};

export const FOLYAMAT_CSOMOK: FolyamatCsomopont[] = [
  {
    id: 'megrendeles_piszkozat',
    label: 'Megrendelés piszkozat',
    leiras: 'Partner igény — PV visszaigazolásra vár',
    sav: 'partner',
    countKulcs: 'megrendeles_piszkozat',
    href: '/belso/pv-munkaterulet',
    teendoSzerep: 'pv',
  },
  {
    id: 'megrendeles_publikus',
    label: 'Műszak publikus',
    leiras: 'Visszaigazolt / partner által publikált műszak',
    sav: 'partner',
    countKulcs: 'muszak_publikus',
    href: '/belso/beosztas',
  },
  {
    id: 'beosztas_aktiv',
    label: 'Beosztás aktív',
    leiras: 'Diák beosztva (nem lemondott), közelgő műszak',
    sav: 'pv',
    countKulcs: 'beosztas_aktiv',
    href: '/belso/beosztas',
  },
  {
    id: 'diak_checkin',
    label: 'Check-in ablak',
    leiras: 'Időablak + GPS — érkezés/távozás rögzítés',
    sav: 'diak',
    countKulcs: 'checkin_nyitva',
    href: '/diak/beosztas',
  },
  {
    id: 'jelenlet_rogzitett',
    label: 'Jelenlét rögzített',
    leiras: 'Partner jóváhagyásra vagy PV közvetlen bírálatra vár',
    sav: 'partner',
    countKulcs: 'jelenlet_rogzitett',
    href: '/belso/pv-munkaterulet',
    teendoSzerep: 'partner',
  },
  {
    id: 'jelenlet_szabad',
    label: 'Szabad jelenlét',
    leiras: 'Beosztás nélküli rögzítés (partner/PV)',
    sav: 'partner',
    countKulcs: 'jelenlet_szabad',
    href: '/partner/jelenletek',
  },
  {
    id: 'jelenlet_partner_jovahagyva',
    label: 'Partner jóváhagyta',
    leiras: 'PV véglegesítésre vár',
    sav: 'pv',
    countKulcs: 'jelenlet_partner_jovahagyva',
    href: '/belso/pv-munkaterulet',
    teendoSzerep: 'pv',
  },
  {
    id: 'jelenlet_pv_veglegesitett',
    label: 'PV véglegesített',
    leiras: 'Számfejthető jelenlét',
    sav: 'pv',
    countKulcs: 'jelenlet_pv_veglegesitett',
    href: '/belso/berszamfejtes/jelenletek',
  },
  {
    id: 'jelenlet_elutasitva',
    label: 'Elutasítva',
    leiras: 'Partner vagy PV elutasította — PV visszaállíthatja',
    sav: 'pv',
    countKulcs: 'jelenlet_elutasitva',
    href: '/belso/beosztas/jelenletek',
  },
  {
    id: 'hirdetes_aktiv',
    label: 'Aktív hirdetés',
    leiras: 'Diákportálon megjelenő munka',
    sav: 'toborzas',
    countKulcs: 'hirdetes_aktiv',
    href: '/belso/toborzas/hirdetesek',
  },
  {
    id: 'jelentkezes_kezeletlen',
    label: 'Kezeletlen jelentkezés',
    leiras: 'Toborzó döntésre vár (CV-ág is)',
    sav: 'toborzas',
    countKulcs: 'jelentkezes_kezeletlen',
    href: '/belso/toborzas/jelentkezesek',
  },
  {
    id: 'jelentkezes_felveve',
    label: 'Felvéve',
    leiras: 'Szerződés-aláírás indulhat',
    sav: 'toborzas',
    countKulcs: 'jelentkezes_felveve',
    href: '/belso/toborzas/jelentkezesek',
  },
];

export const FOLYAMAT_ELEK: FolyamatEl[] = [
  {
    from: 'megrendeles_piszkozat',
    to: 'megrendeles_publikus',
    label: 'PV visszaigazol / partner publikál',
    dontes: true,
  },
  {
    from: 'megrendeles_publikus',
    to: 'beosztas_aktiv',
    label: 'Diák beosztás (létszám check)',
    dontes: true,
  },
  {
    from: 'beosztas_aktiv',
    to: 'diak_checkin',
    label: 'Időablak nyílik (−45…+90 / −60…+120)',
  },
  {
    from: 'diak_checkin',
    to: 'jelenlet_rogzitett',
    label: 'GPS OK → érkezés/távozás',
    dontes: true,
  },
  {
    from: 'jelenlet_szabad',
    to: 'jelenlet_rogzitett',
    label: 'Szabad / papír / QR rögzítés',
  },
  {
    from: 'jelenlet_rogzitett',
    to: 'jelenlet_partner_jovahagyva',
    label: 'Partner ✓',
    dontes: true,
  },
  {
    from: 'jelenlet_rogzitett',
    to: 'jelenlet_elutasitva',
    label: 'Partner / PV ✕',
    dontes: true,
  },
  {
    from: 'jelenlet_rogzitett',
    to: 'jelenlet_pv_veglegesitett',
    label: 'PV közvetlen véglegesítés',
    dontes: true,
  },
  {
    from: 'jelenlet_partner_jovahagyva',
    to: 'jelenlet_pv_veglegesitett',
    label: 'PV véglegesít',
    dontes: true,
  },
  {
    from: 'jelenlet_partner_jovahagyva',
    to: 'jelenlet_elutasitva',
    label: 'PV elutasít',
    dontes: true,
  },
  {
    from: 'jelenlet_elutasitva',
    to: 'jelenlet_rogzitett',
    label: 'PV visszaállít',
    dontes: true,
  },
  {
    from: 'hirdetes_aktiv',
    to: 'jelentkezes_kezeletlen',
    label: 'Jelentkezés (CV-ág → Önéletrajzot várunk)',
    dontes: true,
  },
  {
    from: 'jelentkezes_kezeletlen',
    to: 'jelentkezes_felveve',
    label: 'Toborzó: Felvéve',
    dontes: true,
  },
];

export type TeendoTipusId =
  | 'partner_jelenlet_jovahagyas'
  | 'partner_megrendeles_piszkozat'
  | 'pv_megrendeles_visszaigazolas'
  | 'pv_jelenlet_veglegesites'
  | 'pv_jelenlet_rogzitett';

export type TeendoTipus = {
  id: TeendoTipusId;
  cim: string;
  szerep: 'partner' | 'pv';
  countKulcs: string;
  href: string;
  /** Partner dashboard / PV tab hint */
  tabHint?: string;
};

export const TEENDO_TIPUSOK: TeendoTipus[] = [
  {
    id: 'partner_jelenlet_jovahagyas',
    cim: 'Jelenléti ív jóváhagyása',
    szerep: 'partner',
    countKulcs: 'jelenlet_rogzitett',
    href: '/partner/jelenletek',
  },
  {
    id: 'partner_megrendeles_piszkozat',
    cim: 'Piszkozat megrendelés publikálása',
    szerep: 'partner',
    countKulcs: 'megrendeles_piszkozat',
    href: '/partner/igeny',
  },
  {
    id: 'pv_megrendeles_visszaigazolas',
    cim: 'Megrendelés visszaigazolása',
    szerep: 'pv',
    countKulcs: 'megrendeles_piszkozat',
    href: '/belso/pv-munkaterulet',
    tabHint: 'megrendelesek',
  },
  {
    id: 'pv_jelenlet_veglegesites',
    cim: 'Jelenlét véglegesítése',
    szerep: 'pv',
    countKulcs: 'jelenlet_partner_jovahagyva',
    href: '/belso/pv-munkaterulet',
    tabHint: 'jelenletek',
  },
  {
    id: 'pv_jelenlet_rogzitett',
    cim: 'Rögzített jelenlét bírálata',
    szerep: 'pv',
    countKulcs: 'jelenlet_rogzitett',
    href: '/belso/pv-munkaterulet',
    tabHint: 'folyamat',
  },
];

export function folyamatCsomopontById(id: string): FolyamatCsomopont | undefined {
  return FOLYAMAT_CSOMOK.find((c) => c.id === id);
}
