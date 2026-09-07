import type { Munkalap, MunkalapDiak, MunkalapControlling } from '../../../shared/src/munkalap.js';
import type { MunkalapStatusz } from '../../../shared/src/enums.js';
import {
  diakBruttoOra,
  munkalapControlling,
} from '../../../shared/src/munkalap.js';
import type { munkalap, projekt } from '../../../db/schema.js';
import { mergeProjektMeta } from './projekt-meta.js';
import { szamfejtesiBerekBerKodLista } from '../../../shared/src/projekt-demo-meta.js';

type MunkalapRow = typeof munkalap.$inferSelect;
type ProjektRow = typeof projekt.$inferSelect;

function parseDiakok(raw: unknown): MunkalapDiak[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
    .map((d) => ({
      id: d.id != null ? Number(d.id) : undefined,
      student_id: Number(d.student_id) || 0,
      student_nev: typeof d.student_nev === 'string' ? d.student_nev : undefined,
      idoadatok:
        d.idoadatok && typeof d.idoadatok === 'object'
          ? (d.idoadatok as MunkalapDiak['idoadatok'])
          : {},
      cimkek: Array.isArray(d.cimkek) ? d.cimkek.filter((c): c is string => typeof c === 'string') : [],
      hozzaadva: typeof d.hozzaadva === 'string' ? d.hozzaadva : undefined,
    }));
}

function berKodokFromProjektRow(projektSor?: ProjektRow | null) {
  if (!projektSor) return [];
  return szamfejtesiBerekBerKodLista(mergeProjektMeta(projektSor));
}

export function munkalapValasz(
  row: MunkalapRow,
  projektSor?: ProjektRow | null,
  tagNevek?: Map<number, string>,
): Munkalap {
  const diakok = parseDiakok(row.diakok).map((d) => ({
    ...d,
    student_nev: d.student_nev ?? tagNevek?.get(d.student_id),
  }));

  const berKodok = berKodokFromProjektRow(projektSor);
  const resolvedCtrl =
    row.statusz !== 'Piszkozat' && row.statusz !== 'Korrekció Piszkozat'
      ? (row.controlling as MunkalapControlling) ||
        munkalapControlling(diakok, berKodok)
      : {};

  let osszBrutto = 0;
  let osszOra = 0;
  for (const d of diakok) {
    const { brutto, orak } = diakBruttoOra(d, berKodok);
    osszBrutto += brutto;
    osszOra += orak;
  }

  return {
    id: row.id,
    azonosito: row.azonosito,
    nev: row.nev,
    projekt_id: row.projektId,
    projekt_azonosito: projektSor?.azonosito,
    projekt_nev: projektSor?.nev,
    projekt_iroda: projektSor?.iroda,
    temavezeto: row.temavezeto,
    telj_idoszak: row.teljIdoszak,
    szf_idoszak: row.szfIdoszak,
    tipus_egyosszegu: row.tipusEgyosszegu,
    megjegyzes: row.megjegyzes,
    statusz: row.statusz as MunkalapStatusz,
    korrekcio_szulo_id: row.korrekcioSzuloId,
    letrehozo: row.letrehozo,
    letrehozva: row.letrehozva.toISOString(),
    diakok,
    controlling: resolvedCtrl,
    ossz_brutto: Math.round(osszBrutto),
    ossz_ora: Math.round(osszOra * 10) / 10,
  };
}

export function kovetkezoMunkalapAzonosito(projektAzonosito: string, seq: number): string {
  return `${projektAzonosito}-ML${String(seq).padStart(2, '0')}`;
}

export function kovetkezoKorrekcioAzonosito(szuloAzonosito: string, seq: number): string {
  return `${szuloAzonosito}-K${seq}`;
}
