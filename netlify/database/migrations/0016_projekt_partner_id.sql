-- Projekt ↔ Partner FK (név helyett partner_id join)

ALTER TABLE "projekt" ADD COLUMN IF NOT EXISTS "partner_id" integer;

-- GreenPark (B0510001) — nincs az 0014 seed-ben
INSERT INTO "partner" ("nev", "adoszam", "cim", "iroda", "statusz", "kapcsolat_tipus", "crm_statusz", "felelos")
SELECT 'GreenPark Kft.', '12345678-2-41', '', 'Budapest', 'aktív', 'partner', 'Megbízóvá alakítva', 'Kiss Andrea'
WHERE NOT EXISTS (SELECT 1 FROM "partner" WHERE lower(trim("nev")) = lower(trim('GreenPark Kft.')));

-- Backfill: partner_nev → partner_id (case-insensitive név egyezés)
UPDATE "projekt" p
SET "partner_id" = pt."id"
FROM "partner" pt
WHERE p."partner_id" IS NULL
  AND p."partner_nev" IS NOT NULL
  AND lower(trim(p."partner_nev")) = lower(trim(pt."nev"));

CREATE INDEX IF NOT EXISTS "projekt_partner_id_idx" ON "projekt" ("partner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projekt_partner_id_fkey'
  ) THEN
    ALTER TABLE "projekt"
      ADD CONSTRAINT "projekt_partner_id_fkey"
      FOREIGN KEY ("partner_id") REFERENCES "partner" ("id")
      ON DELETE SET NULL;
  END IF;
END $$;
