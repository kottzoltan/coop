-- Partner beosztáskezelő bővítés + GreenPark (B0510001) demo adatok

CREATE TABLE IF NOT EXISTS "beosztas_csoport" (
  "id" serial PRIMARY KEY NOT NULL,
  "nev" varchar(500) NOT NULL,
  "projekt_id" integer,
  "partner_id" integer,
  "statusz" varchar(50) NOT NULL DEFAULT 'aktív',
  "leiras" text,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "muszak" ADD COLUMN IF NOT EXISTS "beosztas_csoport_id" integer;
ALTER TABLE "muszak" ADD COLUMN IF NOT EXISTS "partner_id" integer;
ALTER TABLE "muszak" ADD COLUMN IF NOT EXISTS "letszam_megrendelt" integer DEFAULT 1;
ALTER TABLE "muszak" ADD COLUMN IF NOT EXISTS "munkakor" varchar(255);
ALTER TABLE "muszak" ADD COLUMN IF NOT EXISTS "statusz" varchar(50) NOT NULL DEFAULT 'publikus';

-- Demo partner (GreenPark — B0510001)
INSERT INTO "partner_regisztracio" ("cegnev", "adoszam", "kapcsolat_nev", "email", "telefon", "statusz")
SELECT 'GreenPark Kft.', '12345678-2-41', 'Kornya József', 'partner.demo@greenpark.hu', '+36 30 555 1234', 'jóváhagyva'
WHERE NOT EXISTS (SELECT 1 FROM "partner_regisztracio" WHERE "cegnev" = 'GreenPark Kft.');

-- Beosztás csoport
INSERT INTO "beosztas_csoport" ("nev", "projekt_id", "partner_id", "statusz", "leiras")
SELECT
  'Kertész gyakornok — Expo tér',
  p.id,
  pr.id,
  'aktív',
  'Reggeli kertészeti műszakok a Budapest Expo téren. Diákok jelentkezhetnek vagy beosztásra kerülnek.'
FROM "projekt" p
CROSS JOIN "partner_regisztracio" pr
WHERE p."azonosito" = 'B0510001' AND pr."cegnev" = 'GreenPark Kft.'
  AND NOT EXISTS (
    SELECT 1 FROM "beosztas_csoport" bc
    WHERE bc."nev" = 'Kertész gyakornok — Expo tér'
  );

-- Demo műszakok (elmúlt + következő 2 hét)
INSERT INTO "muszak" (
  "projekt_id", "beosztas_csoport_id", "partner_id", "cim", "hely",
  "datum", "kezdet", "vege", "letszam_megrendelt", "munkakor", "statusz", "leiras"
)
SELECT
  p.id, bc.id, pr.id,
  v.cim, 'Budapest Expo tér',
  v.datum::date, v.kezdet, v.vege, v.letszam, v.munkakor, v.statusz, v.leiras
FROM "projekt" p
JOIN "beosztas_csoport" bc ON bc."projekt_id" = p.id
JOIN "partner_regisztracio" pr ON pr.id = bc."partner_id"
CROSS JOIN (VALUES
  ('Kertész gyakornok — reggeli', CURRENT_DATE - 3, '07:00', '11:00', 2, 'Adminisztratív, irodai', 'lezárt', 'Ledolgozott műszak'),
  ('Kertész gyakornok — reggeli', CURRENT_DATE - 1, '07:00', '11:00', 2, 'Adminisztratív, irodai', 'lezárt', 'Ledolgozott műszak'),
  ('Kertész gyakornok — reggeli', CURRENT_DATE + 1, '07:00', '11:00', 3, 'Adminisztratív, irodai', 'publikus', 'Következő műszak'),
  ('Kertész gyakornok — délutáni', CURRENT_DATE + 2, '13:00', '17:00', 2, 'Adminisztratív, irodai', 'publikus', NULL),
  ('Kertész gyakornok — reggeli', CURRENT_DATE + 5, '07:00', '11:00', 4, 'Adminisztratív, irodai', 'publikus', 'Hétvégi kiegészítés'),
  ('Kertész gyakornok — reggeli', CURRENT_DATE + 7, '07:00', '11:00', 2, 'Adminisztratív, irodai', 'piszkozat', 'Még nem publikált')
) AS v(cim, datum, kezdet, vege, letszam, munkakor, statusz, leiras)
WHERE p."azonosito" = 'B0510001'
  AND NOT EXISTS (
    SELECT 1 FROM "muszak" m
    WHERE m."beosztas_csoport_id" = bc.id AND m."datum" = v.datum::date
  );

-- Meglévő műszakok (0006) összekötése partnerrel
UPDATE "muszak" m SET
  "partner_id" = pr.id,
  "beosztas_csoport_id" = bc.id,
  "letszam_megrendelt" = COALESCE(m."letszam_megrendelt", 2),
  "munkakor" = COALESCE(m."munkakor", 'Adminisztratív, irodai'),
  "statusz" = COALESCE(NULLIF(m."statusz", ''), 'publikus')
FROM "projekt" p, "partner_regisztracio" pr, "beosztas_csoport" bc
WHERE m."projekt_id" = p.id AND p."azonosito" = 'B0510001'
  AND pr."cegnev" = 'GreenPark Kft.'
  AND bc."projekt_id" = p.id
  AND m."partner_id" IS NULL;

-- Beosztások: első 2 diák a közeli műszakokra
INSERT INTO "beosztas" ("muszak_id", "diak_id", "statusz")
SELECT m.id, d.id, 'beosztva'
FROM "muszak" m
CROSS JOIN LATERAL (
  SELECT id FROM "diak_regisztracio" ORDER BY id LIMIT 2
) d
WHERE m."projekt_id" = (SELECT id FROM "projekt" WHERE "azonosito" = 'B0510001')
  AND m."datum" >= CURRENT_DATE - 1
  AND NOT EXISTS (
    SELECT 1 FROM "beosztas" b WHERE b."muszak_id" = m.id AND b."diak_id" = d.id
  );

-- Jelenléti ívek demo (tegnapi műszakokhoz)
INSERT INTO "jelenlet" ("beosztas_id", "diak_id", "erkezes", "tavozas", "statusz", "megjegyzes")
SELECT b.id, b."diak_id",
  (m."datum" + m."kezdet"::time)::timestamp,
  (m."datum" + m."vege"::time)::timestamp,
  CASE WHEN b.id % 3 = 0 THEN 'jóváhagyva' WHEN b.id % 3 = 1 THEN 'rögzített' ELSE 'rögzített' END,
  CASE WHEN b.id % 3 = 0 THEN 'Partner által elfogadva' ELSE NULL END
FROM "beosztas" b
JOIN "muszak" m ON m.id = b."muszak_id"
WHERE m."datum" = CURRENT_DATE - 1
  AND NOT EXISTS (SELECT 1 FROM "jelenlet" j WHERE j."beosztas_id" = b.id);
