import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  date,
  integer,
  boolean,
  uuid,
  jsonb,
  primaryKey,
  numeric,
} from 'drizzle-orm/pg-core';

/** Diák érdeklődő / regisztráció (diákportál) */
export const diakRegisztracio = pgTable('diak_regisztracio', {
  id: serial('id').primaryKey(),
  nev: varchar('nev', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  telefon: varchar('telefon', { length: 50 }).notNull(),
  szuldat: date('szuldat').notNull(),
  lakcim: text('lakcim'),
  iroda: varchar('iroda', { length: 255 }).notNull(),
  iskola: varchar('iskola', { length: 255 }),
  megjegyzes: text('megjegyzes'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('érdeklődő'),
  profil: jsonb('profil').$type<Record<string, unknown>>().default({}),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Projekt (egyszerűsített — toborzás + bérszámfejtés alap) */
/** Tenant / szövetkezet vagy kölcsönző cég */
export const ceg = pgTable('ceg', {
  id: serial('id').primaryKey(),
  kod: varchar('kod', { length: 50 }).notNull().unique(),
  nev: varchar('nev', { length: 255 }).notNull(),
  aktiv: boolean('aktiv').default(true).notNull(),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export const projekt = pgTable('projekt', {
  id: serial('id').primaryKey(),
  cegId: integer('ceg_id'),
  azonosito: varchar('azonosito', { length: 50 }).notNull().unique(),
  nev: varchar('nev', { length: 500 }).notNull(),
  partner_nev: varchar('partner_nev', { length: 255 }),
  partnerId: integer('partner_id'),
  iroda: varchar('iroda', { length: 255 }),
  statusz: varchar('statusz', { length: 50 }).notNull().default('aktív'),
  prioritas: varchar('prioritas', { length: 50 }).default('Elsődleges'),
  belsoMunka: boolean('belso_munka').default(false),
  meta: jsonb('meta').$type<Record<string, unknown>>().default({}),
});

/** Projekt számfejtési bér / kifizetési kód */
export const projektBerKod = pgTable('projekt_ber_kod', {
  id: serial('id').primaryKey(),
  projekt_id: integer('projekt_id').notNull(),
  kod: varchar('kod', { length: 255 }).notNull(),
  ar: integer('ar').notNull(),
  munkakor: varchar('munkakor', { length: 255 }),
});

/** Projekt szereplő (toborzásért felelős + kompenzáció) */
export const projektSzereplo = pgTable('projekt_szereplo', {
  id: serial('id').primaryKey(),
  projekt_id: integer('projekt_id').notNull(),
  nev: varchar('nev', { length: 255 }).notNull(),
  szerepkor: varchar('szerepkor', { length: 100 }),
  email: varchar('email', { length: 255 }),
  erv_kezdete: varchar('erv_kezdete', { length: 20 }),
  erv_vege: varchar('erv_vege', { length: 20 }),
  tipus: varchar('tipus', { length: 50 }),
  osszeg: integer('osszeg').default(0),
  min_osszeg: integer('min_osszeg').default(0),
  reszesedes: integer('reszesedes').default(0),
});

/**
 * Munkahirdetés — egységes toborzási hirdetés + diákportál lista.
 * A `munkakor` és `ber` a kifizetési kódból / űrlapból jön.
 */
export const munkaHirdetes = pgTable('munka_hirdetes', {
  id: serial('id').primaryKey(),
  projekt_id: integer('projekt_id'),
  cim: varchar('cim', { length: 500 }).notNull(),
  munkakor: varchar('munkakor', { length: 255 }).notNull(),
  partner: varchar('partner', { length: 255 }),
  varos: varchar('varos', { length: 100 }).notNull(),
  varmegye: varchar('varmegye', { length: 100 }),
  ber: integer('ber').notNull(),
  munkanapok: varchar('munkanapok', { length: 30 }).notNull().default('H,K,Sz,Cs,P'),
  munkaido: varchar('munkaido', { length: 100 }),
  cimkek: text('cimkek'),
  leiras: text('leiras'),
  aktiv: boolean('aktiv').notNull().default(true),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
  // Toborzási mezők (spec 3.4)
  nyelv: varchar('nyelv', { length: 10 }).default('HU'),
  toborzo: varchar('toborzo', { length: 255 }),
  felelos: varchar('felelos', { length: 255 }),
  kifizetesi_kod: varchar('kifizetesi_kod', { length: 255 }),
  berezes: varchar('berezes', { length: 50 }).default('Alapbér'),
  egyeni_ber: varchar('egyeni_ber', { length: 100 }),
  extra_varos: varchar('extra_varos', { length: 100 }),
  extra_varmegye: varchar('extra_varmegye', { length: 100 }),
  szoveges_munkaido: boolean('szoveges_munkaido').default(false),
  munkaido_leiras: text('munkaido_leiras'),
  min_korhatar: integer('min_korhatar').default(16),
  erv_datum: date('erv_datum'),
  oneletrajz: boolean('oneletrajz').default(false),
  telefonszam: boolean('telefonszam').default(true),
  megjegyzes: text('megjegyzes'),
  nem_ertem_el: varchar('nem_ertem_el', { length: 20 }).default('24 óra'),
  munkavegzes_helye: text('munkavegzes_helye'),
  munkavegzes_idopontja: text('munkavegzes_idopontja'),
  berezes_szoveg: text('berezes_szoveg'),
  befejezo_szoveg: text('befejezo_szoveg'),
  eloszo_fejlec: text('eloszo_fejlec'),
  eloszo_torzs: text('eloszo_torzs'),
  eloszo_lablec: text('eloszo_lablec'),
  amit_kinalunk: text('amit_kinalunk'),
  fobb_feladatok: text('fobb_feladatok'),
  elvarasok: text('elvarasok'),
  elonyt_jelent: text('elonyt_jelent'),
  kep_nev: varchar('kep_nev', { length: 255 }),
  kep_focim: varchar('kep_focim', { length: 500 }),
  kep_alcim: varchar('kep_alcim', { length: 255 }),
  kep_alcim_szin: varchar('kep_alcim_szin', { length: 20 }),
  megtekintesek: integer('megtekintesek').default(0),
  jelentkezesSzabaly: varchar('jelentkezes_szabaly', { length: 30 }).notNull().default('nyilt'),
});

/** Diák jelentkezés egy munkahirdetésre */
export const munkaJelentkezes = pgTable('munka_jelentkezes', {
  id: serial('id').primaryKey(),
  hirdetes_id: integer('hirdetes_id').notNull(),
  nev: varchar('nev', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  telefon: varchar('telefon', { length: 50 }),
  regisztracio_id: integer('regisztracio_id'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('Kezeletlen'),
  megjegyzes: text('megjegyzes'),
  masHirdetesId: integer('mas_hirdetes_id'),
  nemErtemElAt: timestamp('nem_ertem_el_at'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/**
 * Identity user ↔ ICE entitás (diák / partner / belső)
 * - Felhasználó hitelesítését a Netlify Identity adja.
 * - A finom jogosultságok belső táblákban élnek.
 */
export const iceFelhasznalo = pgTable('ice_felhasznalo', {
  identityId: uuid('identity_id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  szerep: varchar('szerep', { length: 20 }).notNull(),
  diakId: integer('diak_id'),
  partnerKapcsolatId: integer('partner_kapcsolat_id'),
  aktiv: boolean('aktiv').default(true).notNull(),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Belső ügycsoport jogosultságok (olvasás/írás) */
export const belsoJogosultsag = pgTable(
  'belso_jogosultsag',
  {
    felhasznaloIdentityId: uuid('felhasznalo_identity_id').notNull(),
    ugycsoport: varchar('ugycsoport', { length: 50 }).notNull(),
    olvasas: boolean('olvasas').default(false).notNull(),
    iras: boolean('iras').default(false).notNull(),
  },
  (t) => ({
    pk: primaryKey(t.felhasznaloIdentityId, t.ugycsoport),
  }),
);

/** Partner önkiszolgáló regisztráció (admin jóváhagyás) */
export const partnerRegisztracio = pgTable('partner_regisztracio', {
  id: serial('id').primaryKey(),
  cegnev: varchar('cegnev', { length: 255 }).notNull(),
  adoszam: varchar('adoszam', { length: 50 }).notNull(),
  kapcsolatNev: varchar('kapcsolat_nev', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  telefon: varchar('telefon', { length: 50 }),
  statusz: varchar('statusz', { length: 50 }).notNull().default('függőben'),
  hozzaferes: varchar('hozzaferes', { length: 20 }).notNull().default('iras'),
  jovahagytaId: uuid('jovahagyta_id'),
  megjegyzes: text('megjegyzes'),
  partnerCrmId: integer('partner_crm_id'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export type DiakRegisztracio = typeof diakRegisztracio.$inferSelect;
export type Projekt = typeof projekt.$inferSelect;
export type ProjektBerKod = typeof projektBerKod.$inferSelect;
export type ProjektSzereplo = typeof projektSzereplo.$inferSelect;
export type MunkaHirdetes = typeof munkaHirdetes.$inferSelect;
export type MunkaJelentkezes = typeof munkaJelentkezes.$inferSelect;
export type IceFelhasznalo = typeof iceFelhasznalo.$inferSelect;
export type BelsoJogosultsag = typeof belsoJogosultsag.$inferSelect;
export type PartnerRegisztracio = typeof partnerRegisztracio.$inferSelect;

/** Szövetkezeti tag (belső tagnyilvántartás) */
export const szovetkezetiTag = pgTable('szovetkezeti_tag', {
  id: serial('id').primaryKey(),
  diakRegisztracioId: integer('diak_regisztracio_id'),
  nev: varchar('nev', { length: 255 }).notNull(),
  adoszam: varchar('adoszam', { length: 50 }).notNull(),
  taj: varchar('taj', { length: 30 }),
  email: varchar('email', { length: 255 }).notNull(),
  telefon: varchar('telefon', { length: 50 }),
  szuldat: date('szuldat'),
  lakcim: text('lakcim'),
  iroda: varchar('iroda', { length: 255 }).notNull(),
  iskola: varchar('iskola', { length: 255 }),
  bankszamlaszam: varchar('bankszamlaszam', { length: 50 }),
  diakig: varchar('diakig', { length: 50 }),
  diakigTipus: varchar('diakig_tipus', { length: 50 }),
  diakigMunkarend: varchar('diakig_munkarend', { length: 50 }),
  diakigErvenyes: date('diakig_ervenyes'),
  diakigOnlineHosszabbitas: boolean('diakig_online_hosszabbitas').default(false).notNull(),
  tagsagStatusz: varchar('tagsag_statusz', { length: 50 }).notNull().default('piszkozat'),
  belepes: date('belepes'),
  navBejelentes: date('nav_bejelentes'),
  kilepes: date('kilepes'),
  reszjegy: integer('reszjegy').default(0),
  bank: varchar('bank', { length: 20 }).notNull().default('nincs'),
  eszerz: varchar('eszerz', { length: 20 }).notNull().default('nincs'),
  eszerzLejar: date('eszerz_lejar'),
  uzemorv: varchar('uzemorv', { length: 20 }).notNull().default('nincs'),
  uzemorvLejar: date('uzemorv_lejar'),
  tudo: varchar('tudo', { length: 20 }).notNull().default('nincs'),
  tudoLejar: date('tudo_lejar'),
  szjaKedvezmenyek: jsonb('szja_kedvezmenyek').$type<Record<string, unknown>[]>().default([]),
  dokumentumok: jsonb('dokumentumok').$type<Record<string, unknown>[]>().default([]),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export type SzovetkezetiTagRow = typeof szovetkezetiTag.$inferSelect;

/** Partner / lead (belső CRM) */
export const partner = pgTable('partner', {
  id: serial('id').primaryKey(),
  cegId: integer('ceg_id'),
  nev: varchar('nev', { length: 255 }).notNull(),
  adoszam: varchar('adoszam', { length: 50 }),
  cim: text('cim'),
  iroda: varchar('iroda', { length: 255 }).notNull(),
  statusz: varchar('statusz', { length: 50 }).notNull().default('aktív'),
  kapcsolatTipus: varchar('kapcsolat_tipus', { length: 20 }).notNull().default('lead'),
  crmStatusz: varchar('crm_statusz', { length: 50 }).notNull().default('Új lead'),
  felelos: varchar('felelos', { length: 255 }),
  meta: jsonb('meta').$type<Record<string, unknown>>().default({}),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/**
 * Belső munkatárs (tenant-szintű) — Identity link opcionális.
 * Jogosultság-mátrix a `jogosultsag` JSON-ban, amíg nincs Identity UUID.
 */
export const munkatars = pgTable('munkatars', {
  id: serial('id').primaryKey(),
  cegId: integer('ceg_id').notNull(),
  kulsoId: integer('kulso_id'),
  nev: varchar('nev', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  szerepkorok: text('szerepkorok'),
  jogosultsag: jsonb('jogosultsag').$type<Record<string, unknown>>().default({}),
  identityId: uuid('identity_id'),
  aktiv: boolean('aktiv').default(true).notNull(),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Partner kapcsolattartó */
export const partnerKapcsolattarto = pgTable('partner_kapcsolattarto', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull(),
  nev: varchar('nev', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  mobil: varchar('mobil', { length: 50 }),
  vezetekes: varchar('vezetekes', { length: 50 }),
  beosztas: varchar('beosztas', { length: 255 }),
  szamlazasi: boolean('szamlazasi').default(false).notNull(),
  hozzaferes: varchar('hozzaferes', { length: 20 }).notNull().default('nincs'),
  megjegyzes: text('megjegyzes'),
  aktiv: boolean('aktiv').default(true).notNull(),
});

/** Partner CRM kommunikációs napló */
export const partnerKommunikacio = pgTable('partner_kommunikacio', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull(),
  tipus: varchar('tipus', { length: 50 }).notNull(),
  datum: date('datum').notNull(),
  szerzo: varchar('szerzo', { length: 255 }),
  targy: varchar('targy', { length: 500 }).notNull(),
  leiras: text('leiras'),
  statusz: varchar('statusz', { length: 20 }),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Partner szerződés */
export const partnerSzerzodes = pgTable('partner_szerzodes', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull(),
  tipus: varchar('tipus', { length: 100 }).notNull(),
  statusz: varchar('statusz', { length: 50 }).notNull().default('piszkozat'),
  ervKezdete: date('erv_kezdete'),
  ervVege: date('erv_vege'),
  dokumentumNev: varchar('dokumentum_nev', { length: 500 }),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export type PartnerRow = typeof partner.$inferSelect;
export type PartnerKapcsolattartoRow = typeof partnerKapcsolattarto.$inferSelect;
export type PartnerKommunikacioRow = typeof partnerKommunikacio.$inferSelect;
export type PartnerSzerzodesRow = typeof partnerSzerzodes.$inferSelect;
export type CegRow = typeof ceg.$inferSelect;
export type MunkatarsRow = typeof munkatars.$inferSelect;

/** Beosztás csoport (SAM beosztáskezelő — projekthez kötött) */
export const beosztasCsoport = pgTable('beosztas_csoport', {
  id: serial('id').primaryKey(),
  nev: varchar('nev', { length: 500 }).notNull(),
  projektId: integer('projekt_id'),
  partnerId: integer('partner_id'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('aktív'),
  leiras: text('leiras'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Műszak (beosztáskezelő) */
export const muszak = pgTable('muszak', {
  id: serial('id').primaryKey(),
  projektId: integer('projekt_id'),
  beosztasCsoportId: integer('beosztas_csoport_id'),
  partnerId: integer('partner_id'),
  cim: varchar('cim', { length: 500 }).notNull(),
  hely: varchar('hely', { length: 255 }),
  helyLat: varchar('hely_lat', { length: 30 }),
  helyLng: varchar('hely_lng', { length: 30 }),
  gpsSugarM: integer('gps_sugar_m').default(300),
  datum: date('datum').notNull(),
  kezdet: varchar('kezdet', { length: 10 }).notNull(),
  vege: varchar('vege', { length: 10 }).notNull(),
  letszamMegrendelt: integer('letszam_megrendelt').default(1),
  munkakor: varchar('munkakor', { length: 255 }),
  statusz: varchar('statusz', { length: 50 }).notNull().default('publikus'),
  leiras: text('leiras'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Diák beosztás egy műszakhoz */
export const beosztas = pgTable('beosztas', {
  id: serial('id').primaryKey(),
  muszakId: integer('muszak_id').notNull(),
  diakId: integer('diak_id').notNull(),
  statusz: varchar('statusz', { length: 50 }).notNull().default('tervezett'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Jelenlét rögzítés (diák check-in / partner jóváhagyás / PV véglegesítés) */
export const jelenlet = pgTable('jelenlet', {
  id: serial('id').primaryKey(),
  beosztasId: integer('beosztas_id'),
  diakId: integer('diak_id').notNull(),
  projektId: integer('projekt_id'),
  muszakDatum: date('muszak_datum'),
  partnerId: integer('partner_id'),
  erkezes: timestamp('erkezes'),
  tavozas: timestamp('tavozas'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('rögzített'),
  gpsLat: varchar('gps_lat', { length: 30 }),
  gpsLng: varchar('gps_lng', { length: 30 }),
  qrErkezes: timestamp('qr_erkezes'),
  qrTavozas: timestamp('qr_tavozas'),
  megjegyzes: text('megjegyzes'),
  forras: varchar('forras', { length: 30 }).notNull().default('diak'),
  rogzitetteIdentityId: uuid('rogzitette_identity_id'),
  rogzitesMod: varchar('rogzites_mod', { length: 30 }).notNull().default('beosztas'),
  munkalapId: integer('munkalap_id'),
  munkalapHozzarendelve: boolean('munkalap_hozzarendelve').notNull().default(false),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Jelenléti ív módosítás audit napló */
export const jelenletModositasNaplo = pgTable('jelenlet_modositas_naplo', {
  id: serial('id').primaryKey(),
  jelenletId: integer('jelenlet_id').notNull(),
  mezo: varchar('mezo', { length: 50 }).notNull(),
  regiErtek: text('regi_ertek'),
  ujErtek: text('uj_ertek'),
  indok: text('indok'),
  modositoIdentityId: varchar('modosito_identity_id', { length: 255 }),
  modositoSzerep: varchar('modosito_szerep', { length: 30 }),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Papír jelenléti ív OCR feltöltés */
export const jelenletOcrFeltoltes = pgTable('jelenlet_ocr_feltoltes', {
  id: serial('id').primaryKey(),
  jelenletId: integer('jelenlet_id'),
  diakId: integer('diak_id').notNull(),
  projektId: integer('projekt_id'),
  blobKey: varchar('blob_key', { length: 500 }).notNull(),
  statusz: varchar('statusz', { length: 30 }).notNull().default('feltoltve'),
  kinyertJson: jsonb('kinyert_json'),
  biztonsag: numeric('biztonsag', { precision: 5, scale: 2 }),
  pvMegerositette: boolean('pv_megerositette').notNull().default(false),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export type BeosztasCsoport = typeof beosztasCsoport.$inferSelect;
export type Muszak = typeof muszak.$inferSelect;
export type Beosztas = typeof beosztas.$inferSelect;
export type Jelenlet = typeof jelenlet.$inferSelect;
export type JelenletModositasNaplo = typeof jelenletModositasNaplo.$inferSelect;
export type JelenletOcrFeltoltes = typeof jelenletOcrFeltoltes.$inferSelect;

/** Munkalap (bérszámfejtés) */
export const munkalap = pgTable('munkalap', {
  id: serial('id').primaryKey(),
  azonosito: varchar('azonosito', { length: 50 }).notNull().unique(),
  nev: varchar('nev', { length: 500 }),
  projektId: integer('projekt_id').notNull(),
  temavezeto: varchar('temavezeto', { length: 255 }),
  teljIdoszak: varchar('telj_idoszak', { length: 7 }).notNull(),
  szfIdoszak: varchar('szf_idoszak', { length: 7 }).notNull(),
  tipusEgyosszegu: boolean('tipus_egyosszegu').default(false).notNull(),
  megjegyzes: text('megjegyzes'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('Piszkozat'),
  korrekcioSzuloId: integer('korrekcio_szulo_id'),
  letrehozo: varchar('letrehozo', { length: 255 }),
  diakok: jsonb('diakok').$type<Record<string, unknown>[]>().default([]),
  controlling: jsonb('controlling').$type<Record<string, boolean>>().default({}),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export type MunkalapRow = typeof munkalap.$inferSelect;

/** Toborzási kampány */
export const kampany = pgTable('kampany', {
  id: serial('id').primaryKey(),
  nev: varchar('nev', { length: 255 }).notNull(),
  leiras: text('leiras'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('aktív'),
  kezdet: date('kezdet'),
  vege: date('vege'),
  hirdetesId: integer('hirdetes_id'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export const kampanyResztvevo = pgTable('kampany_resztvevo', {
  id: serial('id').primaryKey(),
  kampanyId: integer('kampany_id').notNull(),
  nev: varchar('nev', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  telefon: varchar('telefon', { length: 50 }),
  regisztracioId: integer('regisztracio_id'),
  tagId: integer('tag_id'),
  jelentkezesId: integer('jelentkezes_id'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('aktív'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export type KampanyRow = typeof kampany.$inferSelect;
export type KampanyResztvevoRow = typeof kampanyResztvevo.$inferSelect;

export const penzugySzamla = pgTable('penzugy_szamla', {
  id: serial('id').primaryKey(),
  munkalapId: integer('munkalap_id').notNull(),
  projektId: integer('projekt_id').notNull(),
  munkalapAzonosito: varchar('munkalap_azonosito', { length: 100 }).notNull(),
  osszeg: integer('osszeg').notNull().default(0),
  statusz: varchar('statusz', { length: 50 }).notNull().default('piszkozat'),
  megjegyzes: text('megjegyzes'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export const blogBejegyzes = pgTable('blog_bejegyzes', {
  id: serial('id').primaryKey(),
  cim: varchar('cim', { length: 500 }).notNull(),
  tartalom: text('tartalom'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('piszkozat'),
  publikalva: timestamp('publikalva'),
  szerzo: varchar('szerzo', { length: 255 }),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export const ugyTicket = pgTable('ugy_ticket', {
  id: serial('id').primaryKey(),
  tipus: varchar('tipus', { length: 50 }).notNull().default('ticket'),
  targy: varchar('targy', { length: 500 }).notNull(),
  leiras: text('leiras'),
  statusz: varchar('statusz', { length: 50 }).notNull().default('nyitott'),
  prioritas: varchar('prioritas', { length: 20 }).notNull().default('normál'),
  kapcsolatNev: varchar('kapcsolat_nev', { length: 255 }),
  kapcsolatEmail: varchar('kapcsolat_email', { length: 255 }),
  hozzarendelt: varchar('hozzarendelt', { length: 255 }),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

export const eAlairasKerelem = pgTable('e_alairas_kerelem', {
  id: serial('id').primaryKey(),
  tagId: integer('tag_id'),
  diakRegisztracioId: integer('diak_regisztracio_id'),
  jelentkezesId: integer('jelentkezes_id'),
  projektId: integer('projekt_id'),
  szerzodesTipus: varchar('szerzodes_tipus', { length: 30 }),
  dokumentumNev: varchar('dokumentum_nev', { length: 500 }).notNull(),
  statusz: varchar('statusz', { length: 50 }).notNull().default('függőben'),
  blobKey: varchar('blob_key', { length: 500 }),
  megjegyzes: text('megjegyzes'),
  microsecIdobelyeg: varchar('microsec_idobelyeg', { length: 120 }),
  alairvaAt: timestamp('alairva_at'),
  emailKuldveAt: timestamp('email_kuldve_at'),
  letrehozva: timestamp('letrehozva').defaultNow().notNull(),
});

/** Partnerfelület meghívó (belső kapcsolattartó → Identity fiók) */
export const partnerMeghivo = pgTable('partner_meghivo', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  nev: varchar('nev', { length: 255 }).notNull(),
  uzenet: text('uzenet'),
  forras: varchar('forras', { length: 30 }).notNull(),
  partnerId: integer('partner_id'),
  projektId: integer('projekt_id'),
  partnerKapcsolattartoId: integer('partner_kapcsolattarto_id'),
  projektKapcsolatIndex: integer('projekt_kapcsolat_index'),
  hozzaferes: varchar('hozzaferes', { length: 20 }).notNull().default('iras'),
  statusz: varchar('statusz', { length: 30 }).notNull().default('küldve'),
  kuldteIdentityId: uuid('kuldte_identity_id'),
  identityId: uuid('identity_id'),
  lejarat: timestamp('lejarat'),
  kuldve: timestamp('kuldve').defaultNow().notNull(),
  elfogadva: timestamp('elfogadva'),
  emailTargy: varchar('email_targy', { length: 500 }),
});

/** Coop platform beállítások (kulcs–érték) */
export const iceBeallitas = pgTable('ice_beallitas', {
  kulcs: varchar('kulcs', { length: 100 }).primaryKey(),
  ertek: jsonb('ertek').$type<Record<string, unknown>>().notNull().default({}),
  modositva: timestamp('modositva').defaultNow().notNull(),
});

export type PenzugySzamlaRow = typeof penzugySzamla.$inferSelect;
export type BlogBejegyzesRow = typeof blogBejegyzes.$inferSelect;
export type UgyTicketRow = typeof ugyTicket.$inferSelect;
export type EAlairasKerelemRow = typeof eAlairasKerelem.$inferSelect;
export type PartnerMeghivoRow = typeof partnerMeghivo.$inferSelect;
export type IceBeallitasRow = typeof iceBeallitas.$inferSelect;

/** Adóévi konfiguráció — minden adókulcs és kedvezmény-limit (nem hard-code) */
export const adoevKonfig = pgTable('adoev_konfig', {
  id: serial('id').primaryKey(),
  taxYear: integer('tax_year').notNull().unique(),
  szjaRate: numeric('szja_rate', { precision: 8, scale: 6 }).notNull(),
  tbRate: numeric('tb_rate', { precision: 8, scale: 6 }).notNull(),
  szochoRate: numeric('szocho_rate', { precision: 8, scale: 6 }).notNull(),
  under25MonthlyAllowanceLimit: integer('under25_monthly_allowance_limit').notNull(),
  personalAllowanceMonthlyLimit: integer('personal_allowance_monthly_limit').notNull(),
  firstMarriageMonthlyAllowance: integer('first_marriage_monthly_allowance').notNull(),
  familyAllowanceRules: jsonb('family_allowance_rules')
    .$type<
      { childrenCount: number; monthlyAmount: number; sharedEligible?: boolean }[]
    >()
    .notNull()
    .default([]),
  roundingRules: jsonb('rounding_rules')
    .$type<{ szja: string; tb: string; szocho: string }>()
    .notNull()
    .default({ szja: 'floor', tb: 'floor', szocho: 'floor' }),
  validFrom: date('valid_from').notNull(),
  validTo: date('valid_to'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AdoevKonfigRow = typeof adoevKonfig.$inferSelect;

/** Havi bérszámfejtési futás (batch) */
export const berSzamfejtesFutas = pgTable('ber_szamfejtes_futas', {
  id: serial('id').primaryKey(),
  cooperativeId: integer('cooperative_id').notNull().default(1),
  payrollPeriod: varchar('payroll_period', { length: 7 }).notNull(),
  performancePeriod: varchar('performance_period', { length: 7 }),
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  createdBy: varchar('created_by', { length: 255 }),
  closedAt: timestamp('closed_at'),
  korrekcioSzuloId: integer('korrekcio_szulo_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Munkalapok hozzárendelése egy futáshoz */
export const berSzamfejtesFutasMunkalap = pgTable(
  'ber_szamfejtes_futas_munkalap',
  {
    futasId: integer('futas_id').notNull(),
    munkalapId: integer('munkalap_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.futasId, t.munkalapId] })],
);

/** Normalizált bérszámfejtési sor */
export const berSzamfejtettSor = pgTable('ber_szamfejtett_sor', {
  id: serial('id').primaryKey(),
  payrollRunId: integer('payroll_run_id').notNull(),
  tagId: integer('tag_id').notNull(),
  projektId: integer('projekt_id').notNull(),
  wageCodeId: varchar('wage_code_id', { length: 50 }).notNull(),
  grossAmount: integer('gross_amount').notNull(),
  workHours: numeric('work_hours', { precision: 10, scale: 2 }),
  workDateFrom: date('work_date_from'),
  workDateTo: date('work_date_to'),
  paymentDate: date('payment_date'),
  jogviszonyTipus: varchar('jogviszony_tipus', { length: 40 }).notNull().default('SCHOOL_COOP_MEMBER_WORK'),
  sourceMunkalapId: integer('source_munkalap_id'),
  sourceAttendanceLineId: integer('source_attendance_line_id'),
});

/** Adószámítás snapshot — lezárás után immutable */
export const adoSzamitasSnapshot = pgTable('ado_szamitas_snapshot', {
  id: serial('id').primaryKey(),
  payrollRunId: integer('payroll_run_id').notNull(),
  payrollLineId: integer('payroll_line_id').notNull(),
  tagId: integer('tag_id').notNull(),
  taxYear: integer('tax_year').notNull(),
  grossAmount: integer('gross_amount').notNull(),
  incomeCategory: varchar('income_category', { length: 50 }).notNull(),
  initialSzjaBase: integer('initial_szja_base').notNull(),
  appliedAllowancesJson: jsonb('applied_allowances_json')
    .$type<{ type: string; amount: number; source: string; monthlyCapUsed: number }[]>()
    .notNull()
    .default([]),
  finalSzjaBase: integer('final_szja_base').notNull(),
  calculatedSzja: integer('calculated_szja').notNull(),
  tbBase: integer('tb_base').notNull(),
  tbAmount: integer('tb_amount').notNull(),
  szochoBase: integer('szocho_base').notNull(),
  szochoAmount: integer('szocho_amount').notNull(),
  netAmount: integer('net_amount').notNull(),
  tbExemptReason: varchar('tb_exempt_reason', { length: 100 }),
  szochoExemptReason: varchar('szocho_exempt_reason', { length: 100 }),
  calculationVersion: varchar('calculation_version', { length: 20 }).notNull(),
  korrekcioSzuloSnapshotId: integer('korrekcio_szulo_snapshot_id'),
  isImmutable: boolean('is_immutable').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Bérszámfejtési futás validációs hibák */
export const berSzamfejtesValidaciosHiba = pgTable('ber_szamfejtes_validacios_hiba', {
  id: serial('id').primaryKey(),
  payrollRunId: integer('payroll_run_id').notNull(),
  severity: varchar('severity', { length: 10 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  message: text('message').notNull(),
  tagId: integer('tag_id'),
  munkalapId: integer('munkalap_id'),
  payrollLineId: integer('payroll_line_id'),
});

export type BerSzamfejtesFutasRow = typeof berSzamfejtesFutas.$inferSelect;
export type BerSzamfejtettSorRow = typeof berSzamfejtettSor.$inferSelect;
export type AdoSzamitasSnapshotRow = typeof adoSzamitasSnapshot.$inferSelect;
export type BerSzamfejtesValidaciosHibaRow = typeof berSzamfejtesValidaciosHiba.$inferSelect;

/** NAV űrlap verzió + mező mapping (config-driven export) */
export const navUrlapVerzio = pgTable('nav_urlap_verzio', {
  id: serial('id').primaryKey(),
  formCode: varchar('form_code', { length: 20 }).notNull(),
  taxYear: integer('tax_year').notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  validFrom: date('valid_from').notNull(),
  validTo: date('valid_to'),
  schemaFilePath: varchar('schema_file_path', { length: 500 }),
  fieldMappingJson: jsonb('field_mapping_json')
    .$type<
      {
        iceField: string;
        navFieldCode: string;
        transform?: string;
        xmlPath?: string;
        required?: boolean;
      }[]
    >()
    .notNull()
    .default([]),
  isActive: boolean('is_active').default(true).notNull(),
});

/** NAV / éves bevallás futás */
export const bevallasFutas = pgTable('bevallas_futas', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 20 }).notNull(),
  taxYear: integer('tax_year').notNull(),
  period: varchar('period', { length: 7 }),
  cooperativeId: integer('cooperative_id').notNull().default(1),
  payrollRunIds: jsonb('payroll_run_ids').$type<number[]>().notNull().default([]),
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  generatedAt: timestamp('generated_at'),
  generatedBy: varchar('generated_by', { length: 255 }),
  formVersionId: integer('form_version_id'),
  korrekcioSzuloId: integer('korrekcio_szulo_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bevallasSzemelyiSor = pgTable('bevallas_szemelyi_sor', {
  id: serial('id').primaryKey(),
  declarationRunId: integer('declaration_run_id').notNull(),
  tagId: integer('tag_id').notNull(),
  taxIdentificationNumber: varchar('tax_identification_number', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  birthDate: date('birth_date').notNull(),
  relationType: varchar('relation_type', { length: 40 }),
  grossAmount: integer('gross_amount').notNull(),
  finalSzjaBase: integer('final_szja_base').notNull(),
  calculatedSzja: integer('calculated_szja').notNull(),
  tbAmount: integer('tb_amount').notNull(),
  szochoAmount: integer('szocho_amount').notNull(),
  exemptionsJson: jsonb('exemptions_json').$type<Record<string, string>>(),
});

export const bevallasOsszesito = pgTable('bevallas_osszesito', {
  id: serial('id').primaryKey(),
  declarationRunId: integer('declaration_run_id').notNull().unique(),
  personCount: integer('person_count').notNull(),
  totalGross: integer('total_gross').notNull(),
  totalSzjaBase: integer('total_szja_base').notNull(),
  totalSzja: integer('total_szja').notNull(),
  totalTb: integer('total_tb').notNull(),
  totalSzocho: integer('total_szocho').notNull(),
});

export const bevallasValidaciosHiba = pgTable('bevallas_validacios_hiba', {
  id: serial('id').primaryKey(),
  declarationRunId: integer('declaration_run_id').notNull(),
  severity: varchar('severity', { length: 10 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  message: text('message').notNull(),
  tagId: integer('tag_id'),
});

export const bevallasExportFajl = pgTable('bevallas_export_fajl', {
  id: serial('id').primaryKey(),
  declarationRunId: integer('declaration_run_id').notNull(),
  fileType: varchar('file_type', { length: 20 }).notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileHash: varchar('file_hash', { length: 64 }).notNull(),
  storagePath: varchar('storage_path', { length: 500 }).notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});

export const berAuditLog = pgTable('ber_audit_log', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  actorId: varchar('actor_id', { length: 255 }),
  payloadJson: jsonb('payload_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type NavUrlapVerzioRow = typeof navUrlapVerzio.$inferSelect;
export type BevallasFutasRow = typeof bevallasFutas.$inferSelect;
export type BevallasSzemelyiSorRow = typeof bevallasSzemelyiSor.$inferSelect;
export type BevallasOsszesitoRow = typeof bevallasOsszesito.$inferSelect;
export type BevallasExportFajlRow = typeof bevallasExportFajl.$inferSelect;

/** Tagság (szövetkezeti) — szerződés aláírás stb. */
export const tagsag = pgTable('tagsag', {
  id: serial('id').primaryKey(),
  tagId: integer('tag_id').notNull().unique(),
  status: varchar('status', { length: 30 }).notNull().default('AKTIV'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  membershipAgreementSignedAt: timestamp('membership_agreement_signed_at'),
  officeId: varchar('office_id', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Jogviszony (munkaviszony, megbízás, iskolaszövetkezeti tagi munka) */
export const jogviszony = pgTable('jogviszony', {
  id: serial('id').primaryKey(),
  tagId: integer('tag_id').notNull(),
  relationType: varchar('relation_type', { length: 40 }).notNull().default('SCHOOL_COOP_MEMBER_WORK'),
  isInsured: boolean('is_insured').notNull().default(false),
  tbExemptReason: varchar('tb_exempt_reason', { length: 100 }),
  szochoExemptReason: varchar('szocho_exempt_reason', { length: 100 }),
  navDeclarationRequired: boolean('nav_declaration_required').notNull().default(false),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  projectId: integer('project_id'),
  status: varchar('status', { length: 30 }).notNull().default('AKTIV'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** SZJA kedvezmény nyilatkozat — normalizált (JSONB helyett) */
export const szjaKedvezmenyNyilatkozat = pgTable('szja_kedvezmeny_nyilatkozat', {
  id: serial('id').primaryKey(),
  tagId: integer('tag_id').notNull(),
  legacyId: varchar('legacy_id', { length: 100 }),
  tipus: varchar('tipus', { length: 50 }).notNull(),
  allowanceType: varchar('allowance_type', { length: 50 }).notNull(),
  adoeloleghonap: varchar('adoeloleghonap', { length: 7 }),
  validFrom: date('valid_from').notNull(),
  validTo: date('valid_to'),
  requestedMonthlyAmount: integer('requested_monthly_amount'),
  sharedWithSpouse: boolean('shared_with_spouse').default(false).notNull(),
  documentId: varchar('document_id', { length: 100 }),
  megjegyzes: text('megjegyzes'),
  status: varchar('status', { length: 30 }).notNull().default('AKTIV'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type TagsagRow = typeof tagsag.$inferSelect;
export type JogviszonyRow = typeof jogviszony.$inferSelect;
export type SzjaKedvezmenyNyilatkozatRow = typeof szjaKedvezmenyNyilatkozat.$inferSelect;
