-- Coop multi-tenant: cég + ceg_id a partnereken/projekteken + munkatárs

CREATE TABLE IF NOT EXISTS "ceg" (
  "id" serial PRIMARY KEY NOT NULL,
  "kod" varchar(50) NOT NULL UNIQUE,
  "nev" varchar(255) NOT NULL,
  "aktiv" boolean DEFAULT true NOT NULL,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "partner" ADD COLUMN IF NOT EXISTS "ceg_id" integer;
ALTER TABLE "partner" ADD COLUMN IF NOT EXISTS "meta" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "projekt" ADD COLUMN IF NOT EXISTS "ceg_id" integer;

CREATE TABLE IF NOT EXISTS "munkatars" (
  "id" serial PRIMARY KEY NOT NULL,
  "ceg_id" integer NOT NULL,
  "kulso_id" integer,
  "nev" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "szerepkorok" text,
  "jogosultsag" jsonb DEFAULT '{}'::jsonb,
  "identity_id" uuid,
  "aktiv" boolean DEFAULT true NOT NULL,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "munkatars_ceg_email_uidx" ON "munkatars" ("ceg_id", "email");
CREATE INDEX IF NOT EXISTS "partner_ceg_id_idx" ON "partner" ("ceg_id");
CREATE INDEX IF NOT EXISTS "projekt_ceg_id_idx" ON "projekt" ("ceg_id");
CREATE INDEX IF NOT EXISTS "partner_adoszam_idx" ON "partner" ("adoszam");

INSERT INTO "ceg" ("kod", "nev")
VALUES
  ('munkaero', 'Munkaerő Humánszolgáltató Szociális Szövetkezet'),
  ('kozep-mo', 'Közép-Magyarországi Szociális Szövetkezet')
ON CONFLICT ("kod") DO NOTHING;
