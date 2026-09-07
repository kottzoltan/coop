-- Partnerfelület meghívók (belső → kapcsolattartó)

CREATE TABLE IF NOT EXISTS partner_meghivo (
  id serial PRIMARY KEY,
  token varchar(64) NOT NULL UNIQUE,
  email varchar(255) NOT NULL,
  nev varchar(255) NOT NULL,
  uzenet text,
  forras varchar(30) NOT NULL,
  partner_id integer,
  projekt_id integer,
  partner_kapcsolattarto_id integer,
  projekt_kapcsolat_index integer,
  hozzaferes varchar(20) NOT NULL DEFAULT 'iras',
  statusz varchar(30) NOT NULL DEFAULT 'küldve',
  kuldte_identity_id uuid,
  identity_id uuid,
  lejarat timestamp,
  kuldve timestamp NOT NULL DEFAULT now(),
  elfogadva timestamp
);

CREATE INDEX IF NOT EXISTS partner_meghivo_email_idx ON partner_meghivo (lower(email));
CREATE INDEX IF NOT EXISTS partner_meghivo_statusz_idx ON partner_meghivo (statusz);
