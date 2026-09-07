CREATE TABLE IF NOT EXISTS "diak_regisztracio" (
  "id" serial PRIMARY KEY NOT NULL,
  "nev" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "telefon" varchar(50) NOT NULL,
  "szuldat" date NOT NULL,
  "lakcim" text,
  "iroda" varchar(255) NOT NULL,
  "iskola" varchar(255),
  "megjegyzes" text,
  "statusz" varchar(50) DEFAULT 'érdeklődő' NOT NULL,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);
