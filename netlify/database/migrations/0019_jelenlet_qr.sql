-- QR-kódos jelenlét időbélyegek (FK #13)

ALTER TABLE "jelenlet" ADD COLUMN IF NOT EXISTS "qr_erkezes" timestamp;
ALTER TABLE "jelenlet" ADD COLUMN IF NOT EXISTS "qr_tavozas" timestamp;
