-- Szövetkezeti tagok (SAM #01) — élő modul, mock adatokkal

CREATE TABLE IF NOT EXISTS "szovetkezeti_tag" (
  "id" serial PRIMARY KEY NOT NULL,
  "diak_regisztracio_id" integer,
  "nev" varchar(255) NOT NULL,
  "adoszam" varchar(50) NOT NULL,
  "taj" varchar(30),
  "email" varchar(255) NOT NULL,
  "telefon" varchar(50),
  "szuldat" date,
  "lakcim" text,
  "iroda" varchar(255) NOT NULL,
  "iskola" varchar(255),
  "diakig" varchar(50),
  "diakig_ervenyes" date,
  "tagsag_statusz" varchar(50) NOT NULL DEFAULT 'piszkozat',
  "belepes" date,
  "kilepes" date,
  "reszjegy" integer DEFAULT 0,
  "bank" varchar(20) NOT NULL DEFAULT 'nincs',
  "eszerz" varchar(20) NOT NULL DEFAULT 'nincs',
  "eszerz_lejar" date,
  "uzemorv" varchar(20) NOT NULL DEFAULT 'nincs',
  "uzemorv_lejar" date,
  "tudo" varchar(20) NOT NULL DEFAULT 'nincs',
  "tudo_lejar" date,
  "dokumentumok" jsonb DEFAULT '[]'::jsonb,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "szovetkezeti_tag_email_idx" ON "szovetkezeti_tag" ("email");
CREATE INDEX IF NOT EXISTS "szovetkezeti_tag_adoszam_idx" ON "szovetkezeti_tag" ("adoszam");
CREATE INDEX IF NOT EXISTS "szovetkezeti_tag_tagsag_statusz_idx" ON "szovetkezeti_tag" ("tagsag_statusz");

INSERT INTO "szovetkezeti_tag" (
  "nev", "adoszam", "taj", "email", "telefon", "szuldat", "lakcim", "iroda", "iskola",
  "diakig", "diakig_ervenyes", "tagsag_statusz", "belepes", "kilepes", "reszjegy",
  "bank", "eszerz", "eszerz_lejar", "uzemorv", "uzemorv_lejar", "tudo", "tudo_lejar", "dokumentumok"
)
SELECT * FROM (VALUES
  ('Kovács Anna','8412345678','123 456 789','kovacs.anna@melodiak.hu','+36 30 111 2233','2002-04-12'::date,'1085 Budapest, Üllői út 12.','Budapest','BME','DI-2024-00981','2026-10-31'::date,'érvényes','2023-09-01'::date,NULL::date,3000,'van','van','2026-09-30'::date,'van','2026-12-01'::date,'van','2027-01-15'::date,'["Diákigazolvány másolat","Bankszámla igazolás"]'::jsonb),
  ('Nagy Bence','8423456789','234 567 890','nagy.bence@melodiak.hu','+36 20 222 3344','2001-11-03'::date,'4024 Debrecen, Kossuth u. 3.','Debrecen','DE','DI-2023-00214','2026-06-30'::date,'érvényes','2022-02-15'::date,NULL::date,3000,'nincs','lejárt','2026-05-31'::date,'nincs',NULL::date,'van','2026-11-20'::date,'["Diákigazolvány másolat"]'::jsonb),
  ('Tóth Eszter','8434567890','345 678 901','toth.eszter@melodiak.hu','+36 70 333 4455','2003-02-27'::date,'6720 Szeged, Dugonics tér 2.','Szeged','SZTE','DI-2025-01122','2027-03-31'::date,'érvényes','2024-01-10'::date,NULL::date,3000,'van','van','2026-08-15'::date,'van','2026-07-05'::date,'nincs',NULL::date,'[]'::jsonb),
  ('Szabó Márk','8445678901','456 789 012','szabo.mark@melodiak.hu','+36 30 444 5566','2000-08-19'::date,'7622 Pécs, Rákóczi út 5.','Pécs','PTE','DI-2022-00089','2026-02-28'::date,'érvénytelen','2021-09-01'::date,'2026-03-01'::date,3000,'van','van','2025-12-31'::date,'van','2025-10-10'::date,'van','2025-09-09'::date,'["Kilépési nyilatkozat"]'::jsonb),
  ('Kiss Zoé','8456789012','567 890 123','kiss.zoe@melodiak.hu','+36 20 555 6677','2004-01-05'::date,'9022 Győr, Bécsi kapu tér 1.','Győr','SZE','DI-2025-01887','2027-09-30'::date,'érvényes','2025-02-01'::date,NULL::date,3000,'van','van','2026-10-01'::date,'van','2026-09-01'::date,'van','2026-09-01'::date,'["Diákigazolvány másolat","Bankszámla igazolás","Eseti szerződés"]'::jsonb),
  ('Horváth Dávid','8467890123','678 901 234','horvath.david@melodiak.hu','+36 30 666 7788','2002-06-30'::date,'1112 Budapest, Kelenföldi u. 8.','Budapest','Corvinus','DI-2024-00567','2026-08-31'::date,'érvényes','2023-11-20'::date,NULL::date,3000,'nincs','nincs',NULL::date,'nincs',NULL::date,'nincs',NULL::date,'[]'::jsonb),
  ('Varga Léna','8478901234','789 012 345','varga.lena@melodiak.hu','+36 70 777 8899','2001-12-14'::date,'1073 Budapest, Erzsébet krt. 20.','Budapest','ELTE','DI-2023-00341','2026-06-30'::date,'piszkozat',NULL::date,NULL::date,0,'nincs','nincs',NULL::date,'nincs',NULL::date,'nincs',NULL::date,'[]'::jsonb),
  ('Molnár Petra','8489012345','890 123 456','molnar.petra@melodiak.hu','+36 20 888 9900','2003-09-09'::date,'6722 Szeged, Tisza L. krt. 44.','Szeged','SZTE','DI-2025-01455','2027-05-31'::date,'érvényes','2024-09-01'::date,NULL::date,3000,'van','van','2026-09-20'::date,'lejárt','2026-05-01'::date,'van','2026-12-31'::date,'["Diákigazolvány másolat"]'::jsonb)
) AS v(nev,adoszam,taj,email,telefon,szuldat,lakcim,iroda,iskola,diakig,diakig_ervenyes,tagsag_statusz,belepes,kilepes,reszjegy,bank,eszerz,eszerz_lejar,uzemorv,uzemorv_lejar,tudo,tudo_lejar,dokumentumok)
WHERE NOT EXISTS (SELECT 1 FROM "szovetkezeti_tag" LIMIT 1);

-- Meglévő diák regisztrációk összekötése e-mail alapján
UPDATE "szovetkezeti_tag" t
SET "diak_regisztracio_id" = d.id
FROM "diak_regisztracio" d
WHERE lower(t.email) = lower(d.email) AND t."diak_regisztracio_id" IS NULL;
