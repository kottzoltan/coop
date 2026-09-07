-- Projekt + egységes hirdetés mezők (toborzás spec)

CREATE TABLE IF NOT EXISTS "projekt" (
  "id" serial PRIMARY KEY NOT NULL,
  "azonosito" varchar(50) NOT NULL UNIQUE,
  "nev" varchar(500) NOT NULL,
  "partner_nev" varchar(255),
  "iroda" varchar(255),
  "statusz" varchar(50) DEFAULT 'aktív' NOT NULL
);

CREATE TABLE IF NOT EXISTS "projekt_ber_kod" (
  "id" serial PRIMARY KEY NOT NULL,
  "projekt_id" integer NOT NULL,
  "kod" varchar(255) NOT NULL,
  "ar" integer NOT NULL,
  "munkakor" varchar(255)
);

CREATE TABLE IF NOT EXISTS "projekt_szereplo" (
  "id" serial PRIMARY KEY NOT NULL,
  "projekt_id" integer NOT NULL,
  "nev" varchar(255) NOT NULL,
  "szerepkor" varchar(100)
);

ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "projekt_id" integer;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "partner" varchar(255);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "nyelv" varchar(10) DEFAULT 'HU';
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "toborzo" varchar(255);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "felelos" varchar(255);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "kifizetesi_kod" varchar(255);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "berezes" varchar(50) DEFAULT 'Alapbér';
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "egyeni_ber" varchar(100);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "extra_varos" varchar(100);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "extra_varmegye" varchar(100);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "szoveges_munkaido" boolean DEFAULT false;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "munkaido_leiras" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "min_korhatar" integer DEFAULT 16;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "erv_datum" date;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "oneletrajz" boolean DEFAULT false;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "telefonszam" boolean DEFAULT true;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "megjegyzes" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "nem_ertem_el" varchar(20) DEFAULT '24 óra';
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "munkavegzes_helye" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "munkavegzes_idopontja" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "berezes_szoveg" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "befejezo_szoveg" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "eloszo_fejlec" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "eloszo_torzs" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "eloszo_lablec" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "amit_kinalunk" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "fobb_feladatok" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "elvarasok" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "elonyt_jelent" text;
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "kep_nev" varchar(255);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "kep_focim" varchar(500);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "kep_alcim" varchar(255);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "kep_alcim_szin" varchar(20);
ALTER TABLE "munka_hirdetes" ADD COLUMN IF NOT EXISTS "megtekintesek" integer DEFAULT 0;

-- Seed projektek (ha üres)
INSERT INTO "projekt" ("azonosito", "nev", "partner_nev", "iroda")
SELECT * FROM (VALUES
  ('B0359192', 'Ruházati üzlet raktár leltár', 'Meló-Diák Országos Diákvállalkozásszervező Kft.', 'Meló-Diák Universitas Budapest'),
  ('B0472200', 'Nyomdai kisegítő', 'K.M.H. Print Kft', 'Meló-Diák Universitas Budapest'),
  ('B0043100', 'Takarítás IV. kerület', 'Bernstein Kft.', 'Meló-Diák Universitas Budapest'),
  ('B0472100', 'Címkézés Biatorbágy', 'Front Line Magyarország Kft.', 'Meló-Diák Universitas Budapest'),
  ('B0510001', 'Kertész gyakornoki program', 'GreenPark Kft.', 'Meló-Diák Universitas Budapest')
) AS v("azonosito", "nev", "partner_nev", "iroda")
WHERE NOT EXISTS (SELECT 1 FROM "projekt" LIMIT 1);

-- Bérkódok
INSERT INTO "projekt_ber_kod" ("projekt_id", "kod", "ar", "munkakor")
SELECT p.id, v.kod, v.ar, v.munkakor FROM "projekt" p
JOIN (VALUES
  ('B0359192', '2000 Ft/óra - Ruhabolti kisegítői feladatok', 2000, 'Üzlet, bolt, értékesítés'),
  ('B0472200', '2100 Ft/óra - Nyomdai kisegítő', 2100, 'Fizikai, gyári, raktári'),
  ('B0043100', '2500 Ft/óra - Takarítás', 2500, 'Adminisztratív, irodai'),
  ('B0472100', '2000 Ft/óra - Címkézés', 2000, 'Fizikai, gyári, raktári'),
  ('B0510001', '2350 Ft/óra - Kertész gyakornok', 2350, 'Adminisztratív, irodai')
) AS v(azonosito, kod, ar, munkakor) ON p.azonosito = v.azonosito
WHERE NOT EXISTS (SELECT 1 FROM "projekt_ber_kod" LIMIT 1);

-- Szereplők
INSERT INTO "projekt_szereplo" ("projekt_id", "nev", "szerepkor")
SELECT p.id, v.nev, v.szerepkor FROM "projekt" p
JOIN (VALUES
  ('B0359192', 'Konfár Kitti', 'Piackutató'),
  ('B0472200', 'Konfár Kitti', 'Piackutató'),
  ('B0043100', 'Dilingai Pál', 'Témavezető/Mentor'),
  ('B0472100', 'Edőcs Ádám', 'Piackutató'),
  ('B0510001', 'Kornya József', 'Témavezető/Mentor')
) AS v(azonosito, nev, szerepkor) ON p.azonosito = v.azonosito
WHERE NOT EXISTS (SELECT 1 FROM "projekt_szereplo" LIMIT 1);

-- Meglévő hirdetések projekthez kötése + tartalom
UPDATE "munka_hirdetes" h SET
  "projekt_id" = p.id,
  "partner" = p.partner_nev,
  "felelos" = 'Kornya József',
  "toborzo" = 'Kornya József',
  "eloszo_torzs" = COALESCE(h."leiras", h."cim"),
  "fobb_feladatok" = COALESCE(h."leiras", h."cim")
FROM "projekt" p
WHERE h."cim" = 'Kertész gyakornok' AND p.azonosito = 'B0510001';

UPDATE "munka_hirdetes" h SET
  "projekt_id" = p.id,
  "partner" = p.partner_nev,
  "felelos" = 'Konfár Kitti',
  "toborzo" = 'Konfár Kitti',
  "eloszo_torzs" = h."cim"
FROM "projekt" p
WHERE h."cim" LIKE 'asztalvázak%' AND p.azonosito = 'B0472200';

UPDATE "munka_hirdetes" h SET
  "projekt_id" = p.id,
  "partner" = p.partner_nev,
  "eloszo_torzs" = h."cim"
FROM "projekt" p
WHERE h."projekt_id" IS NULL AND p.azonosito = 'B0359192';
