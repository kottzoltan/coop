/** Tagság státusz (Tag) */
export type TagsagStatusz = 'érvényes' | 'érvénytelen' | 'piszkozat';

export const TAGSAG_STATUSZOK: TagsagStatusz[] = ['érvényes', 'érvénytelen', 'piszkozat'];

/** Partner státusz */
export type PartnerStatusz = 'aktív' | 'inaktív';

/** Partner kapcsolat típus */
export type KapcsolatTipus = 'lead' | 'partner';

/** CRM státusz (Partner kanban) */
export type CrmStatusz =
  | 'Új lead'
  | 'Kapcsolatfelvétel'
  | 'Ajánlat kiküldve'
  | 'Tárgyalás'
  | 'Megbízóvá alakítva'
  | 'Elutasítva';

/** Kapcsolattartó hozzáférés szint */
export type KapcsolattartoHozzaferes = 'nincs' | 'olvasas' | 'iras';

/** Kommunikáció típus (CRM napló) */
export type KommunikacioTipus =
  | 'ajánlat'
  | 'megbeszélés'
  | 'ügyfélértékelés'
  | 'reklamáció'
  | 'ticket';

/** Kommunikáció státusz (reklamáció/ticket) */
export type KommunikacioStatusz = 'nyitva' | 'lezárva';

/** Projekt szereplő szerepkör */
export type ProjektSzereploSzerepkor =
  | 'Managing Partner'
  | 'Piackutató'
  | 'Témavezető/Mentor'
  | string;

/** Projekt szereplő kompenzáció típus */
export type SzereploTipus = 'Fedezet arányos' | 'Egyösszegű';

/** Vállalási díj típus */
export type VallalasiDijTipus = 'Szervezős' | 'Átfuttatás';

/** Hirdetés bérezés mód */
export type BerezesMod = 'Alapbér' | 'Pótlékos' | 'Megegyezés szerint' | 'Egyéni';

/** Jelentkezés státusz */
export type JelentkezesStatusz =
  | 'Kezeletlen'
  | 'Önéletrajzot várunk'
  | 'Interjú'
  | 'Felvéve'
  | 'Más munkára ajánlottuk'
  | 'Nem elérhető'
  | 'Visszamondta'
  | 'Elutasítva';

/** Munkalap státusz */
export type MunkalapStatusz =
  | 'Piszkozat'
  | 'Lezárt'
  | 'Jóváhagyott'
  | 'Elutasított'
  | 'Számfejtett'
  | 'Korrekció Piszkozat'
  | 'Korrekció Lezárt'
  | 'Korrekció Jóváhagyott'
  | 'Korrekció Elutasított';

/** Teljesítés igazolás státusz */
export type TeljesitesStatusz = string;

/** Projekt dokumentum státusz */
export type ProjektDokumentumStatusz = string;
