/** Diák jelenlét bejelentkezés: időablak + GPS távolság szabályok */

export const JELENLET_ERKEZES_ELOTT_PERC = 45;
export const JELENLET_ERKEZES_UTAN_PERC = 90;
export const JELENLET_TAVOZAS_ELOTT_PERC = 60;
export const JELENLET_TAVOZAS_UTAN_PERC = 120;
export const JELENLET_GPS_DEFAULT_SUGAR_M = 300;

export type CheckinTipus = 'erkezes' | 'tavozas';

export type MuszakIdoAblak = {
  datum: string;
  kezdet: string;
  vege: string;
};

function percetMs(p: number) {
  return p * 60_000;
}

function muszakIdopont(datum: string, oraPerc: string): Date {
  const d = String(datum).slice(0, 10);
  const t = oraPerc.length === 5 ? `${oraPerc}:00` : oraPerc;
  return new Date(`${d}T${t}`);
}

/** Haversine távolság méterben */
export function gpsTavolsagMeter(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function jelenletIdoAblak(
  muszak: MuszakIdoAblak,
  tipus: CheckinTipus,
): { nyitas: Date; zaras: Date; referencia: Date } {
  if (tipus === 'erkezes') {
    const referencia = muszakIdopont(muszak.datum, muszak.kezdet);
    return {
      referencia,
      nyitas: new Date(referencia.getTime() - percetMs(JELENLET_ERKEZES_ELOTT_PERC)),
      zaras: new Date(referencia.getTime() + percetMs(JELENLET_ERKEZES_UTAN_PERC)),
    };
  }
  const referencia = muszakIdopont(muszak.datum, muszak.vege);
  return {
    referencia,
    nyitas: new Date(referencia.getTime() - percetMs(JELENLET_TAVOZAS_ELOTT_PERC)),
    zaras: new Date(referencia.getTime() + percetMs(JELENLET_TAVOZAS_UTAN_PERC)),
  };
}

export function jelenletIdoEngedelyezett(
  muszak: MuszakIdoAblak,
  tipus: CheckinTipus,
  most = new Date(),
): { ok: boolean; uzenet?: string; nyitas: Date; zaras: Date } {
  const { nyitas, zaras, referencia } = jelenletIdoAblak(muszak, tipus);
  if (most.getTime() < nyitas.getTime()) {
    const perc = Math.ceil((nyitas.getTime() - most.getTime()) / 60_000);
    return {
      ok: false,
      nyitas,
      zaras,
      uzenet:
        tipus === 'erkezes'
          ? `Érkezés még nem rögzíthető — a műszak kezdete (${referencia.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}) előtt ${JELENLET_ERKEZES_ELOTT_PERC} perccel nyílik. Még kb. ${perc} perc.`
          : `Távozás még nem rögzíthető — a műszak vége előtt ${JELENLET_TAVOZAS_ELOTT_PERC} perccel nyílik. Még kb. ${perc} perc.`,
    };
  }
  if (most.getTime() > zaras.getTime()) {
    return {
      ok: false,
      nyitas,
      zaras,
      uzenet:
        tipus === 'erkezes'
          ? `Érkezés már nem rögzíthető — a műszak kezdete után legfeljebb ${JELENLET_ERKEZES_UTAN_PERC} perc áll rendelkezésre. Fordulj a partnerhez vagy a projektvezetőhöz.`
          : `Távozás már nem rögzíthető — a műszak vége után legfeljebb ${JELENLET_TAVOZAS_UTAN_PERC} perc áll rendelkezésre. Fordulj a partnerhez vagy a projektvezetőhöz.`,
    };
  }
  return { ok: true, nyitas, zaras };
}

export function jelenletGpsEngedelyezett(
  muszak: { helyLat?: string | null; helyLng?: string | null; gpsSugarM?: number | null },
  gpsLat?: string | null,
  gpsLng?: string | null,
): { ok: boolean; tavolsagM?: number; uzenet?: string; kotelezo: boolean } {
  const helyLat = muszak.helyLat != null && muszak.helyLat !== '' ? Number(muszak.helyLat) : NaN;
  const helyLng = muszak.helyLng != null && muszak.helyLng !== '' ? Number(muszak.helyLng) : NaN;
  const kotelezo = Number.isFinite(helyLat) && Number.isFinite(helyLng);

  if (!kotelezo) {
    return { ok: true, kotelezo: false };
  }

  if (gpsLat == null || gpsLat === '' || gpsLng == null || gpsLng === '') {
    return {
      ok: false,
      kotelezo: true,
      uzenet: 'GPS kötelező ehhez a műszakhoz — engedd a helyzetmeghatározást, és próbáld újra a helyszínen.',
    };
  }

  const lat = Number(gpsLat);
  const lng = Number(gpsLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, kotelezo: true, uzenet: 'Érvénytelen GPS koordináta.' };
  }

  const sugar = muszak.gpsSugarM && muszak.gpsSugarM > 0 ? muszak.gpsSugarM : JELENLET_GPS_DEFAULT_SUGAR_M;
  const tavolsagM = Math.round(gpsTavolsagMeter(helyLat, helyLng, lat, lng));
  if (tavolsagM > sugar) {
    return {
      ok: false,
      kotelezo: true,
      tavolsagM,
      uzenet: `Túl messze vagy a munkavégzés helyszínétől (${tavolsagM} m, megengedett: ${sugar} m). Jelenlét csak a helyszínen rögzíthető.`,
    };
  }

  return { ok: true, kotelezo: true, tavolsagM };
}

export function jelenletCheckinEllenorzes(
  muszak: MuszakIdoAblak & {
    helyLat?: string | null;
    helyLng?: string | null;
    gpsSugarM?: number | null;
  },
  tipus: CheckinTipus,
  gps?: { lat?: string | null; lng?: string | null },
  most = new Date(),
): { ok: boolean; hibak: string[]; ido: ReturnType<typeof jelenletIdoEngedelyezett>; gps: ReturnType<typeof jelenletGpsEngedelyezett> } {
  const ido = jelenletIdoEngedelyezett(muszak, tipus, most);
  const gpsE = jelenletGpsEngedelyezett(muszak, gps?.lat, gps?.lng);
  const hibak: string[] = [];
  if (!ido.ok && ido.uzenet) hibak.push(ido.uzenet);
  if (!gpsE.ok && gpsE.uzenet) hibak.push(gpsE.uzenet);
  return { ok: hibak.length === 0, hibak, ido, gps: gpsE };
}
