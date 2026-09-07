-- S: NAV bejelentés dátum külön mező
ALTER TABLE szovetkezeti_tag
  ADD COLUMN IF NOT EXISTS nav_bejelentes date;

-- V: partner regisztráció → CRM partner link
ALTER TABLE partner_regisztracio
  ADD COLUMN IF NOT EXISTS partner_crm_id integer;

-- V: automatikus számlázás sor
CREATE TABLE IF NOT EXISTS penzugy_szamla (
  id serial PRIMARY KEY,
  munkalap_id integer NOT NULL,
  projekt_id integer NOT NULL,
  munkalap_azonosito varchar(100) NOT NULL,
  osszeg integer NOT NULL DEFAULT 0,
  statusz varchar(50) NOT NULL DEFAULT 'piszkozat',
  megjegyzes text,
  letrehozva timestamp NOT NULL DEFAULT now()
);

-- W: blog
CREATE TABLE IF NOT EXISTS blog_bejegyzes (
  id serial PRIMARY KEY,
  cim varchar(500) NOT NULL,
  tartalom text,
  statusz varchar(50) NOT NULL DEFAULT 'piszkozat',
  publikalva timestamp,
  szerzo varchar(255),
  letrehozva timestamp NOT NULL DEFAULT now()
);

-- W: ügyfélszolgálat ticket
CREATE TABLE IF NOT EXISTS ugy_ticket (
  id serial PRIMARY KEY,
  tipus varchar(50) NOT NULL DEFAULT 'ticket',
  targy varchar(500) NOT NULL,
  leiras text,
  statusz varchar(50) NOT NULL DEFAULT 'nyitott',
  prioritas varchar(20) NOT NULL DEFAULT 'normál',
  kapcsolat_nev varchar(255),
  kapcsolat_email varchar(255),
  hozzarendelt varchar(255),
  letrehozva timestamp NOT NULL DEFAULT now()
);

-- W: e-aláírás kérelem
CREATE TABLE IF NOT EXISTS e_alairas_kerelem (
  id serial PRIMARY KEY,
  tag_id integer,
  dokumentum_nev varchar(500) NOT NULL,
  statusz varchar(50) NOT NULL DEFAULT 'függőben',
  blob_key varchar(500),
  megjegyzes text,
  letrehozva timestamp NOT NULL DEFAULT now()
);
