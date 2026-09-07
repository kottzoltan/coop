-- Jelenléti ív workflow: többszintű jóváhagyás, audit, flexibilis rögzítés, OCR stub

ALTER TABLE jelenlet ALTER COLUMN beosztas_id DROP NOT NULL;

ALTER TABLE jelenlet ADD COLUMN IF NOT EXISTS projekt_id integer;
ALTER TABLE jelenlet ADD COLUMN IF NOT EXISTS muszak_datum date;
ALTER TABLE jelenlet ADD COLUMN IF NOT EXISTS partner_id integer;
ALTER TABLE jelenlet ADD COLUMN IF NOT EXISTS munkalap_id integer;
ALTER TABLE jelenlet ADD COLUMN IF NOT EXISTS munkalap_hozzarendelve boolean NOT NULL DEFAULT false;
ALTER TABLE jelenlet ADD COLUMN IF NOT EXISTS forras varchar(30) NOT NULL DEFAULT 'diak';
ALTER TABLE jelenlet ADD COLUMN IF NOT EXISTS rogzitette_identity_id uuid;
ALTER TABLE jelenlet ADD COLUMN IF NOT EXISTS rogzites_mod varchar(30) NOT NULL DEFAULT 'beosztas';

CREATE INDEX IF NOT EXISTS idx_jelenlet_statusz ON jelenlet(statusz);
CREATE INDEX IF NOT EXISTS idx_jelenlet_projekt ON jelenlet(projekt_id);
CREATE INDEX IF NOT EXISTS idx_jelenlet_partner ON jelenlet(partner_id);
CREATE INDEX IF NOT EXISTS idx_jelenlet_muszak_datum ON jelenlet(muszak_datum);

-- Régi „jóváhagyva” → partner_jóváhagyva (PV lépés külön)
UPDATE jelenlet SET statusz = 'partner_jóváhagyva' WHERE statusz = 'jóváhagyva';

-- Beosztás-alapú sorok meta kitöltése
UPDATE jelenlet j SET
  projekt_id = m.projekt_id,
  muszak_datum = m.datum,
  partner_id = m.partner_id
FROM beosztas b
JOIN muszak m ON m.id = b.muszak_id
WHERE j.beosztas_id = b.id
  AND j.projekt_id IS NULL;

CREATE TABLE IF NOT EXISTS jelenlet_modositas_naplo (
  id serial PRIMARY KEY,
  jelenlet_id integer NOT NULL REFERENCES jelenlet(id) ON DELETE CASCADE,
  mezo varchar(50) NOT NULL,
  regi_ertek text,
  uj_ertek text,
  indok text,
  modosito_identity_id varchar(255),
  modosito_szerep varchar(30),
  letrehozva timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jelenlet_naplo_jelenlet ON jelenlet_modositas_naplo(jelenlet_id);

CREATE TABLE IF NOT EXISTS jelenlet_ocr_feltoltes (
  id serial PRIMARY KEY,
  jelenlet_id integer REFERENCES jelenlet(id) ON DELETE SET NULL,
  diak_id integer NOT NULL,
  projekt_id integer,
  blob_key varchar(500) NOT NULL,
  statusz varchar(30) NOT NULL DEFAULT 'feltoltve',
  kinyert_json jsonb,
  biztonsag numeric(5, 2),
  pv_megerositette boolean NOT NULL DEFAULT false,
  letrehozva timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jelenlet_ocr_diak ON jelenlet_ocr_feltoltes(diak_id);

-- Hirdetés: nyílt vs. visszatérő diákok (4. fázis alap)
ALTER TABLE munka_hirdetes ADD COLUMN IF NOT EXISTS jelentkezes_szabaly varchar(30) NOT NULL DEFAULT 'nyilt';
