CREATE TABLE IF NOT EXISTS "munka_hirdetes" (
  "id" serial PRIMARY KEY NOT NULL,
  "cim" varchar(500) NOT NULL,
  "munkakor" varchar(255) NOT NULL,
  "varos" varchar(100) NOT NULL,
  "varmegye" varchar(100),
  "ber" integer NOT NULL,
  "munkanapok" varchar(30) DEFAULT 'H,K,Sz,Cs,P' NOT NULL,
  "munkaido" varchar(100),
  "cimkek" text,
  "leiras" text,
  "aktiv" boolean DEFAULT true NOT NULL,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "munka_jelentkezes" (
  "id" serial PRIMARY KEY NOT NULL,
  "hirdetes_id" integer NOT NULL,
  "nev" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "telefon" varchar(50),
  "regisztracio_id" integer,
  "statusz" varchar(50) DEFAULT 'Kezeletlen' NOT NULL,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "munka_hirdetes" ("cim", "munkakor", "varos", "varmegye", "ber", "munkanapok", "munkaido", "cimkek")
SELECT * FROM (VALUES
  ('asztalvázak/székvázak ellenőrzése javítása', 'Fizikai, gyári, raktári', 'Székesfehérvár', 'Fejér', 2100, 'H,K,Sz,Cs,P', '6-14 óráig', NULL),
  ('Senior könyvelő – pénzügyi folyamatfejlesztési projektekkel', 'Gazdasági, pénzügyi, marketing', 'Budapest', 'Pest', 2500, 'H,K,Sz,Cs,P', NULL, 'gyakornoki, szakmai munkák,hosszútávú munkák'),
  ('Kertész gyakornok', 'Adminisztratív, irodai', 'Budapest', 'Pest', 2350, 'H,K,Sz,Cs,P', NULL, 'gyakornoki, szakmai munkák'),
  ('Raktáros', 'Fizikai, gyári, raktári', 'Pécs', 'Baranya', 2200, 'H,K,Sz,Cs,P,Sz', '8-16 óráig', 'hétvégi munkák'),
  ('Támogató toborzó', 'Adminisztratív, irodai', 'Sopron', 'Győr-Moson-Sopron', 2300, 'H,K,Sz,Cs,P', '9-17 óráig', 'hosszútávú munkák')
) AS v("cim", "munkakor", "varos", "varmegye", "ber", "munkanapok", "munkaido", "cimkek")
WHERE NOT EXISTS (SELECT 1 FROM "munka_hirdetes" LIMIT 1);
