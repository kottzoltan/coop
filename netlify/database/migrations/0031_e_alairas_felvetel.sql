-- E-aláírás kérelem bővítés: felvétel utáni keret- és eseti szerződés

ALTER TABLE e_alairas_kerelem
  ADD COLUMN IF NOT EXISTS diak_regisztracio_id integer,
  ADD COLUMN IF NOT EXISTS jelentkezes_id integer,
  ADD COLUMN IF NOT EXISTS projekt_id integer,
  ADD COLUMN IF NOT EXISTS szerzodes_tipus varchar(30),
  ADD COLUMN IF NOT EXISTS microsec_idobelyeg varchar(120),
  ADD COLUMN IF NOT EXISTS alairva_at timestamp,
  ADD COLUMN IF NOT EXISTS email_kuldve_at timestamp;

CREATE INDEX IF NOT EXISTS e_alairas_kerelem_diak_idx
  ON e_alairas_kerelem (diak_regisztracio_id);

CREATE INDEX IF NOT EXISTS e_alairas_kerelem_jelentkezes_idx
  ON e_alairas_kerelem (jelentkezes_id);
