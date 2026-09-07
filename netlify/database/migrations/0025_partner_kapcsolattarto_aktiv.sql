-- Partner kapcsolattartó: aktív / inaktív (történeti nyilvántartás)

ALTER TABLE partner_kapcsolattarto
  ADD COLUMN IF NOT EXISTS aktiv boolean NOT NULL DEFAULT true;

UPDATE partner_kapcsolattarto SET aktiv = true WHERE aktiv IS NULL;
