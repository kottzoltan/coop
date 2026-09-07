/** FK SAM #13: műszak lezárása a kezdete előtt 12/24/48 órával — alapértelmezés 24h */
export const MUSZAK_LEZARAS_ORA = 24;

export function muszakKezdete(datum: string, kezdet: string): Date {
  const d = String(datum).slice(0, 10);
  const t = kezdet.length === 5 ? `${kezdet}:00` : kezdet;
  return new Date(`${d}T${t}`);
}

export function orakMuszakKezdetig(datum: string, kezdet: string, most = new Date()): number {
  return (muszakKezdete(datum, kezdet).getTime() - most.getTime()) / 3_600_000;
}

export type MuszakMuveletInfo = {
  modosithato: boolean;
  torolheto: boolean;
  indok?: string;
};

export function partnerMuszakMuveletek(
  muszak: { datum: string; kezdet: string; statusz: string },
  beosztott = 0,
  lezarasOra = MUSZAK_LEZARAS_ORA,
): MuszakMuveletInfo {
  if (muszak.statusz === 'törölve') {
    return { modosithato: false, torolheto: false, indok: 'Törölt műszak' };
  }
  if (muszak.statusz === 'lezárt') {
    return { modosithato: false, torolheto: false, indok: 'Lezárt műszak' };
  }

  const orak = orakMuszakKezdetig(muszak.datum, muszak.kezdet);
  if (orak <= 0) {
    return { modosithato: false, torolheto: false, indok: 'A műszak már elkezdődött' };
  }

  const piszkozat = muszak.statusz === 'piszkozat';
  const idoben = orak > lezarasOra;
  const modosithato = piszkozat || idoben;
  const torolheto = piszkozat ? modosithato : beosztott === 0 && idoben;

  return {
    modosithato,
    torolheto,
    indok: !modosithato
      ? `A műszak kezdete előtt ${lezarasOra} órán belül nem módosítható`
      : !torolheto && beosztott > 0
        ? 'Beosztott diákkal a műszak nem törölhető — csak szerkeszthető'
        : undefined,
  };
}

export type LemondasInfo = {
  lemondhato: boolean;
  kerelem?: boolean;
  indok?: string;
};

export function diakLemondasInfo(
  beosztas: { statusz: string },
  muszak: { datum: string; kezdet: string; statusz: string },
  lezarasOra = MUSZAK_LEZARAS_ORA,
): LemondasInfo {
  if (beosztas.statusz === 'lemondva') {
    return { lemondhato: false, indok: 'Már lemondva' };
  }
  if (beosztas.statusz === 'lemondás_kérvényezve') {
    return { lemondhato: false, indok: 'Lemondási kérelem folyamatban' };
  }
  if (muszak.statusz === 'törölve') {
    return { lemondhato: false, indok: 'A műszak törölve lett' };
  }
  if (muszak.statusz === 'lezárt') {
    return { lemondhato: false, indok: 'Lezárt műszak — lemondás nem lehetséges' };
  }

  const orak = orakMuszakKezdetig(muszak.datum, muszak.kezdet);
  if (orak <= 0) {
    return { lemondhato: false, indok: 'A műszak már elkezdődött' };
  }

  if (muszak.statusz === 'zárt') {
    return {
      lemondhato: true,
      kerelem: true,
      indok: 'Lemondási kérelem — a mentort értesítjük',
    };
  }

  if (orak <= lezarasOra) {
    return {
      lemondhato: false,
      indok: `Lemondás csak ${lezarasOra} órával a kezdés előtt lehetséges`,
    };
  }

  return { lemondhato: true };
}
