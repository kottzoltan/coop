-- Jelentkezés workflow + kampányok modul

ALTER TABLE "munka_jelentkezes"
  ADD COLUMN IF NOT EXISTS "megjegyzes" text,
  ADD COLUMN IF NOT EXISTS "mas_hirdetes_id" integer;

CREATE TABLE IF NOT EXISTS "kampany" (
  "id" serial PRIMARY KEY,
  "nev" varchar(255) NOT NULL,
  "leiras" text,
  "statusz" varchar(50) NOT NULL DEFAULT 'aktív',
  "kezdet" date,
  "vege" date,
  "hirdetes_id" integer,
  "letrehozva" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "kampany_resztvevo" (
  "id" serial PRIMARY KEY,
  "kampany_id" integer NOT NULL REFERENCES "kampany"("id") ON DELETE CASCADE,
  "nev" varchar(255) NOT NULL,
  "email" varchar(255),
  "telefon" varchar(50),
  "regisztracio_id" integer,
  "tag_id" integer,
  "jelentkezes_id" integer,
  "statusz" varchar(50) NOT NULL DEFAULT 'aktív',
  "letrehozva" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "kampany_resztvevo_kampany_idx" ON "kampany_resztvevo" ("kampany_id");
