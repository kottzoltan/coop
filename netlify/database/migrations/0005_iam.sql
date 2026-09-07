-- Identity alapú jogosultságkezelés (diák, partner, belső ügycsoportok)

CREATE TABLE IF NOT EXISTS "ice_felhasznalo" (
  "identity_id" uuid PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "szerep" varchar(20) NOT NULL,
  "diak_id" integer,
  "partner_kapcsolat_id" integer,
  "aktiv" boolean DEFAULT true NOT NULL,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "belso_jogosultsag" (
  "felhasznalo_identity_id" uuid NOT NULL,
  "ugycsoport" varchar(50) NOT NULL,
  "olvasas" boolean DEFAULT false NOT NULL,
  "iras" boolean DEFAULT false NOT NULL,
  PRIMARY KEY ("felhasznalo_identity_id", "ugycsoport"),
  FOREIGN KEY ("felhasznalo_identity_id")
    REFERENCES "ice_felhasznalo" ("identity_id")
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "partner_regisztracio" (
  "id" serial PRIMARY KEY NOT NULL,
  "cegnev" varchar(255) NOT NULL,
  "adoszam" varchar(50) NOT NULL,
  "kapcsolat_nev" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "telefon" varchar(50),
  "statusz" varchar(50) NOT NULL DEFAULT 'függőben',
  "jovahagyta_id" uuid,
  "megjegyzes" text,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

