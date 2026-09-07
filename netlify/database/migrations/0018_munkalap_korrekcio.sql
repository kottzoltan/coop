-- Korrekciós munkalap — szülő munkalap hivatkozás (FK #03)

ALTER TABLE "munkalap" ADD COLUMN IF NOT EXISTS "korrekcio_szulo_id" integer;
