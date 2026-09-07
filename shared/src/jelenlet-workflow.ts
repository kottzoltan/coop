/** Jelenléti ív életciklus — többszintű jóváhagyás (diák/partner → PV). */

export const JELENLET_STATUSZOK = [
  'rögzített',
  'partner_jóváhagyva',
  'pv_véglegesített',
  'elutasítva',
] as const;

export type JelenletStatusz = (typeof JELENLET_STATUSZOK)[number];

/** @deprecated régi seed/API — olvasáskor partner_jóváhagyva-nak kezeljük */
export const JELENLET_STATUSZ_LEGACY_JOVAHAGYVA = 'jóváhagyva';

export const JELENLET_FORRASOK = ['diak', 'partner', 'pv', 'qr', 'ocr'] as const;
export type JelenletForras = (typeof JELENLET_FORRASOK)[number];

export const JELENLET_ROGZITES_MODOK = ['beosztas', 'szabad', 'papir'] as const;
export type JelenletRogzitesMod = (typeof JELENLET_ROGZITES_MODOK)[number];

export const JELENLET_STATUSZ_LABEL: Record<JelenletStatusz, string> = {
  rögzített: 'Rögzített',
  partner_jóváhagyva: 'Partner jóváhagyta',
  pv_véglegesített: 'PV véglegesítette',
  elutasítva: 'Elutasítva',
};

export const JELENLET_STATUSZ_SZIN: Record<JelenletStatusz, string> = {
  rögzített: 'bg-warning-bg text-warning',
  partner_jóváhagyva: 'bg-[#EAF1F7] text-[#2C7BD6]',
  pv_véglegesített: 'bg-success-bg text-success',
  elutasítva: 'bg-danger-bg text-danger',
};

export function jelenletStatuszNormalizalas(statusz: string): JelenletStatusz | 'elutasítva' {
  if (statusz === JELENLET_STATUSZ_LEGACY_JOVAHAGYVA) return 'partner_jóváhagyva';
  if ((JELENLET_STATUSZOK as readonly string[]).includes(statusz)) {
    return statusz as JelenletStatusz;
  }
  return 'rögzített';
}

/** Munkalaphoz rendelhető (számfejtés előtt). */
export function jelenletSzamfejtheto(statusz: string): boolean {
  const s = jelenletStatuszNormalizalas(statusz);
  return s === 'pv_véglegesített';
}

/** Partner jóváhagyhat / szerkeszthet. */
export function jelenletPartnerSzerkesztheto(statusz: string): boolean {
  const s = jelenletStatuszNormalizalas(statusz);
  return s === 'rögzített';
}

/** PV véglegesíthet / elutasíthat. */
export function jelenletPvVeglegesitheto(statusz: string): boolean {
  const s = jelenletStatuszNormalizalas(statusz);
  return s === 'partner_jóváhagyva' || s === 'rögzített';
}

export type JelenletSzerep = 'diak' | 'partner' | 'pv';

const ATMENETEK: Record<JelenletStatusz, Partial<Record<JelenletStatusz, JelenletSzerep[]>>> = {
  rögzített: {
    partner_jóváhagyva: ['partner', 'pv'],
    pv_véglegesített: ['pv'],
    elutasítva: ['partner', 'pv'],
  },
  partner_jóváhagyva: {
    pv_véglegesített: ['pv'],
    rögzített: ['partner', 'pv'],
    elutasítva: ['pv'],
  },
  pv_véglegesített: {},
  elutasítva: {
    rögzített: ['pv'],
  },
};

export function jelenletAtmenetEngedelyezett(
  jelenlegi: string,
  uj: JelenletStatusz,
  szerep: JelenletSzerep,
): boolean {
  const from = jelenletStatuszNormalizalas(jelenlegi);
  const allowed = ATMENETEK[from]?.[uj];
  return !!allowed?.includes(szerep);
}
