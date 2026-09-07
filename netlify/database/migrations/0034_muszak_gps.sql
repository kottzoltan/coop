-- Műszak helyszín GPS + sugar a diák jelenlét check-inhez
ALTER TABLE "muszak" ADD COLUMN IF NOT EXISTS "hely_lat" varchar(30);
ALTER TABLE "muszak" ADD COLUMN IF NOT EXISTS "hely_lng" varchar(30);
ALTER TABLE "muszak" ADD COLUMN IF NOT EXISTS "gps_sugar_m" integer DEFAULT 300;
