-- Beosztáskezelő + jelenlét (SAM #13 alap, egyszerűsített)

CREATE TABLE IF NOT EXISTS "muszak" (
  "id" serial PRIMARY KEY NOT NULL,
  "projekt_id" integer,
  "cim" varchar(500) NOT NULL,
  "hely" varchar(255),
  "datum" date NOT NULL,
  "kezdet" varchar(10) NOT NULL,
  "vege" varchar(10) NOT NULL,
  "leiras" text,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "beosztas" (
  "id" serial PRIMARY KEY NOT NULL,
  "muszak_id" integer NOT NULL,
  "diak_id" integer NOT NULL,
  "statusz" varchar(50) NOT NULL DEFAULT 'tervezett',
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "jelenlet" (
  "id" serial PRIMARY KEY NOT NULL,
  "beosztas_id" integer NOT NULL,
  "diak_id" integer NOT NULL,
  "erkezes" timestamp,
  "tavozas" timestamp,
  "statusz" varchar(50) NOT NULL DEFAULT 'rögzített',
  "gps_lat" varchar(30),
  "gps_lng" varchar(30),
  "megjegyzes" text,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

-- Demo műszak + beosztás (ha üres)
INSERT INTO "muszak" ("projekt_id", "cim", "hely", "datum", "kezdet", "vege", "leiras")
SELECT 1, 'Kertész gyakornok — reggeli műszak', 'Budapest Expo tér', CURRENT_DATE + 7, '07:00', '11:00', 'Demo beosztás'
WHERE NOT EXISTS (SELECT 1 FROM "muszak" LIMIT 1)
  AND EXISTS (SELECT 1 FROM "projekt" WHERE id = 1);

INSERT INTO "beosztas" ("muszak_id", "diak_id", "statusz")
SELECT
  (SELECT id FROM "muszak" ORDER BY id LIMIT 1),
  (SELECT id FROM "diak_regisztracio" ORDER BY id LIMIT 1),
  'tervezett'
WHERE NOT EXISTS (SELECT 1 FROM "beosztas" LIMIT 1)
  AND EXISTS (SELECT 1 FROM "muszak" LIMIT 1)
  AND EXISTS (SELECT 1 FROM "diak_regisztracio" LIMIT 1);
