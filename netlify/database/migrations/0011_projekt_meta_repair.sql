-- Javító migráció: projekt meta oszlopok (ha a 0007 valamiért nem futott le)
ALTER TABLE "projekt" ADD COLUMN IF NOT EXISTS "prioritas" varchar(50) DEFAULT 'Elsődleges';
ALTER TABLE "projekt" ADD COLUMN IF NOT EXISTS "belso_munka" boolean DEFAULT false;
ALTER TABLE "projekt" ADD COLUMN IF NOT EXISTS "meta" jsonb DEFAULT '{}'::jsonb;

UPDATE "projekt" SET "prioritas" = 'Elsődleges' WHERE "prioritas" IS NULL;
UPDATE "projekt" SET "belso_munka" = false WHERE "belso_munka" IS NULL;
UPDATE "projekt" SET "meta" = '{}'::jsonb WHERE "meta" IS NULL;
