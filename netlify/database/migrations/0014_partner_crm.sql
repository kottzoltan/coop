-- Partnerek + CRM + szerződések (SAM partnerfelület belső) — mock adatokkal

CREATE TABLE IF NOT EXISTS "partner" (
  "id" serial PRIMARY KEY NOT NULL,
  "nev" varchar(255) NOT NULL,
  "adoszam" varchar(50),
  "cim" text,
  "iroda" varchar(255) NOT NULL,
  "statusz" varchar(50) NOT NULL DEFAULT 'aktív',
  "kapcsolat_tipus" varchar(20) NOT NULL DEFAULT 'lead',
  "crm_statusz" varchar(50) NOT NULL DEFAULT 'Új lead',
  "felelos" varchar(255),
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "partner_kapcsolattarto" (
  "id" serial PRIMARY KEY NOT NULL,
  "partner_id" integer NOT NULL,
  "nev" varchar(255) NOT NULL,
  "email" varchar(255),
  "mobil" varchar(50),
  "vezetekes" varchar(50),
  "beosztas" varchar(255),
  "szamlazasi" boolean NOT NULL DEFAULT false,
  "hozzaferes" varchar(20) NOT NULL DEFAULT 'nincs',
  "megjegyzes" text
);

CREATE TABLE IF NOT EXISTS "partner_kommunikacio" (
  "id" serial PRIMARY KEY NOT NULL,
  "partner_id" integer NOT NULL,
  "tipus" varchar(50) NOT NULL,
  "datum" date NOT NULL,
  "szerzo" varchar(255),
  "targy" varchar(500) NOT NULL,
  "leiras" text,
  "statusz" varchar(20),
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "partner_szerzodes" (
  "id" serial PRIMARY KEY NOT NULL,
  "partner_id" integer NOT NULL,
  "tipus" varchar(100) NOT NULL,
  "statusz" varchar(50) NOT NULL DEFAULT 'piszkozat',
  "erv_kezdete" date,
  "erv_vege" date,
  "dokumentum_nev" varchar(500),
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "partner_kapcsolat_tipus_idx" ON "partner" ("kapcsolat_tipus");
CREATE INDEX IF NOT EXISTS "partner_crm_statusz_idx" ON "partner" ("crm_statusz");
CREATE INDEX IF NOT EXISTS "partner_kapcsolattarto_partner_idx" ON "partner_kapcsolattarto" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_kommunikacio_partner_idx" ON "partner_kommunikacio" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_szerzodes_partner_idx" ON "partner_szerzodes" ("partner_id");

INSERT INTO "partner" ("id", "nev", "adoszam", "cim", "iroda", "statusz", "kapcsolat_tipus", "crm_statusz", "felelos", "letrehozva")
SELECT * FROM (VALUES
  (1, 'Tesco-Global Zrt.', '10309709-2-44', '2040 Budaörs, Kinizsi út 1-3.', 'Budapest', 'aktív', 'partner', 'Megbízóvá alakítva', 'Kiss Andrea', '2019-03-12'::timestamp),
  (2, 'Auchan Retail Magyarország Kft.', '12167969-2-44', '2040 Budaörs, Sport u. 2/A', 'Budapest', 'aktív', 'partner', 'Megbízóvá alakítva', 'Tóth Bálint', '2020-06-01'::timestamp),
  (3, 'DM Kereskedelmi Kft.', '10832561-2-44', '2045 Törökbálint, Torbágy u. 22.', 'Budapest', 'aktív', 'partner', 'Megbízóvá alakítva', 'Farkas Dóra', '2021-02-18'::timestamp),
  (4, 'Penny Market Kft.', '10894188-2-44', '2351 Alsónémedi, Északi Ipari Park', 'Debrecen', 'inaktív', 'partner', 'Megbízóvá alakítva', 'Kiss Andrea', '2018-11-09'::timestamp),
  (5, 'IKEA Lakberendezési Kft.', '11908527-2-44', '1148 Budapest, Örs vezér tere', 'Budapest', 'aktív', 'partner', 'Megbízóvá alakítva', 'Tóth Bálint', '2022-09-05'::timestamp),
  (6, 'Praktiker Kft.', '12885000-2-13', '6724 Szeged, Cserzy Mihály u.', 'Szeged', 'aktív', 'partner', 'Megbízóvá alakítva', 'Farkas Dóra', '2023-01-20'::timestamp),
  (7, 'Rossmann Magyarország Kft.', '—', '', 'Budapest', 'aktív', 'lead', 'Tárgyalás', 'Kiss Andrea', '2026-05-14'::timestamp),
  (8, 'Decathlon Sport Kft.', '—', '', 'Győr', 'aktív', 'lead', 'Ajánlat kiküldve', 'Tóth Bálint', '2026-06-02'::timestamp),
  (9, 'Lidl Magyarország Kft.', '—', '', 'Debrecen', 'aktív', 'lead', 'Új lead', 'Farkas Dóra', '2026-06-24'::timestamp),
  (10, 'Spar Magyarország Kft.', '—', '', 'Budapest', 'aktív', 'lead', 'Kapcsolatfelvétel', 'Kiss Andrea', '2026-06-19'::timestamp)
) AS v(id, nev, adoszam, cim, iroda, statusz, kapcsolat_tipus, crm_statusz, felelos, letrehozva)
WHERE NOT EXISTS (SELECT 1 FROM "partner" LIMIT 1);

SELECT setval(pg_get_serial_sequence('partner', 'id'), COALESCE((SELECT MAX(id) FROM "partner"), 1));

INSERT INTO "partner_kapcsolattarto" ("partner_id", "nev", "email", "mobil", "vezetekes", "beosztas", "szamlazasi", "hozzaferes", "megjegyzes")
SELECT * FROM (VALUES
  (1, 'Balogh Réka', 'balogh.reka@tesco.hu', '+36 30 900 1122', '', 'HR üzletág', true, 'iras', ''),
  (1, 'Simon Gábor', 'simon.gabor@tesco.hu', '+36 20 111 4455', '', 'Áruházvezető', false, 'olvasas', ''),
  (2, 'Kelemen Zsolt', 'kelemen.zsolt@auchan.hu', '+36 20 456 7788', '+36 1 555 0102', 'HR referens', true, 'iras', ''),
  (3, 'Farkas Nóra', 'farkas.nora@dm.hu', '+36 70 234 5566', '', 'HR üzletág', false, 'olvasas', ''),
  (7, 'Németh Orsolya', 'nemeth.orsolya@rossmann.hu', '+36 30 221 9988', '', 'HR üzletág', false, 'nincs', ''),
  (8, 'Vincze Ábel', 'vincze.abel@decathlon.hu', '+36 20 774 1122', '', 'Áruházvezető', false, 'nincs', ''),
  (9, 'Erdős Kata', 'erdos.kata@lidl.hu', '+36 70 332 1188', '', 'HR üzletág', false, 'nincs', ''),
  (10, 'Halász Bence', 'halasz.bence@spar.hu', '+36 30 665 4321', '', 'Beszerzési vezető', false, 'nincs', '')
) AS v(partner_id, nev, email, mobil, vezetekes, beosztas, szamlazasi, hozzaferes, megjegyzes)
WHERE NOT EXISTS (SELECT 1 FROM "partner_kapcsolattarto" LIMIT 1);

INSERT INTO "partner_kommunikacio" ("partner_id", "tipus", "datum", "szerzo", "targy", "leiras", "statusz")
SELECT * FROM (VALUES
  (1, 'ajánlat', '2018-12-03'::date, 'Kiss Andrea', 'Kezdeti együttműködési ajánlat', 'Első árajánlat diákmunkaerő biztosítására a budaörsi áruházba.', NULL),
  (1, 'megbeszélés', '2019-02-20'::date, 'Kiss Andrea', 'Szerződéskötés előkészítése', 'Személyes egyeztetés a bérezési struktúráról.', NULL),
  (1, 'reklamáció', '2026-04-18'::date, 'Nagy Petra', 'Késve érkezett munkalapok', 'A partner jelezte, hogy a márciusi munkalapok lezárása csúszott.', 'lezárva'),
  (3, 'ticket', '2026-06-20'::date, 'Farkas Dóra', 'Számla-korrekció kérése', 'A partner a májusi számlán díjazási eltérést jelzett.', 'nyitva'),
  (7, 'ajánlat', '2026-05-14'::date, 'Kiss Andrea', 'Bemutatkozó ajánlat — nyári diákmunka program', 'Kezdeti megkeresés a Rossmann HR csapata felé.', NULL),
  (8, 'ajánlat', '2026-06-02'::date, 'Tóth Bálint', 'Árajánlat — győri áruház szezonális igény', 'Írásos ajánlat küldve, válaszra várunk.', NULL),
  (9, 'megbeszélés', '2026-06-24'::date, 'Farkas Dóra', 'Beérkező érdeklődés', 'A Lidl HR üzletág képviselője konferencián kért tájékoztatót.', NULL),
  (10, 'megbeszélés', '2026-06-19'::date, 'Kiss Andrea', 'Első telefonos egyeztetés', 'Bemutatkozó hívás, igényfelmérés folyamatban.', NULL)
) AS v(partner_id, tipus, datum, szerzo, targy, leiras, statusz)
WHERE NOT EXISTS (SELECT 1 FROM "partner_kommunikacio" LIMIT 1);

INSERT INTO "partner_szerzodes" ("partner_id", "tipus", "statusz", "erv_kezdete", "erv_vege", "dokumentum_nev")
SELECT * FROM (VALUES
  (1, 'Keretszerződés', 'aláírt', '2023-01-01'::date, '2027-12-31'::date, 'Tesco_keretszerzodes_2023.pdf'),
  (1, 'Eseti szerződés', 'lejárt', '2025-05-01'::date, '2025-08-31'::date, 'Tesco_eseti_2025_05.pdf'),
  (2, 'Keretszerződés', 'aláírt', '2020-06-01'::date, '2026-06-01'::date, 'Auchan_kszerz_2020.pdf'),
  (3, 'Eseti szerződés', 'piszkozat', '2026-07-01'::date, NULL::date, NULL),
  (4, 'Keretszerződés', 'lejárt', '2018-11-09'::date, '2025-11-09'::date, 'Penny_kszerz_2018.pdf'),
  (5, 'Keretszerződés', 'aláírt', '2022-09-05'::date, '2027-09-05'::date, 'IKEA_kszerz_2022.pdf'),
  (6, 'Eseti szerződés', 'aláírt', '2026-02-01'::date, '2026-12-31'::date, NULL)
) AS v(partner_id, tipus, statusz, erv_kezdete, erv_vege, dokumentum_nev)
WHERE NOT EXISTS (SELECT 1 FROM "partner_szerzodes" LIMIT 1);
