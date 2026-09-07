-- Diákportál profil kiegészítő adatok (tanulmány, social, ráérés, önéletrajz meta)

ALTER TABLE "diak_regisztracio" ADD COLUMN IF NOT EXISTS "profil" jsonb DEFAULT '{}'::jsonb;
UPDATE "diak_regisztracio" SET "profil" = '{}'::jsonb WHERE "profil" IS NULL;
