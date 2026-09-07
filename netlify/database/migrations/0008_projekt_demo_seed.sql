-- Szereplő bővített mezők + demo meta seed + extra projektek

ALTER TABLE "projekt_szereplo" ADD COLUMN IF NOT EXISTS "email" varchar(255);
ALTER TABLE "projekt_szereplo" ADD COLUMN IF NOT EXISTS "erv_kezdete" varchar(20);
ALTER TABLE "projekt_szereplo" ADD COLUMN IF NOT EXISTS "erv_vege" varchar(20);
ALTER TABLE "projekt_szereplo" ADD COLUMN IF NOT EXISTS "tipus" varchar(50);
ALTER TABLE "projekt_szereplo" ADD COLUMN IF NOT EXISTS "osszeg" integer DEFAULT 0;
ALTER TABLE "projekt_szereplo" ADD COLUMN IF NOT EXISTS "min_osszeg" integer DEFAULT 0;
ALTER TABLE "projekt_szereplo" ADD COLUMN IF NOT EXISTS "reszesedes" integer DEFAULT 0;

-- Demo meta rögzítése DB-ben (teszteléshez — felülírja az üres vagy csak {} meta-t)
UPDATE "projekt" SET "meta" = '{"agazat":"Fizikai ágazat","kategoria":"Könnyű fizikai, gyári, raktári","varmegye":"Pest","cimkek":"kertész, gyakornok, nyári","kezdete":"2026-04-01","leiras":"Kertészeti gyakornoki program — Expo tér, korai reggeli műszakok.","munkavegzesi_helyek":[{"irszam":"1101","varos":"Budapest","utca":"Expo tér"}],"kapcsolattartok":[{"nev":"Kornya József","email":"kornya.jozsef@melodiak.hu","mobil":"+36 30 555 1234","szamlazasi":false}],"dijak":[{"id":"1","nev":"2350 Ft/óra - Kertész gyakornok","ar":2350,"egysegtipus":"Ft/óra","tipus":"Szervezős","ervenyesseg":"2026.01–2026.12"}],"szamfejtesi_berek":[{"id":"1","nev":"Kertész gyakornok","ar":2350,"egysegtipus":"Ft/óra","munkakor":"Adminisztratív, irodai","vallalasi_dij_id":"1","ervenyesseg":"2026.01–2026.12"}],"koltsegek":[{"id":"1","nev":"Munkaruha — kesztyű, védőruha","osszeg":45000,"datum":"2026-05-10","tipus":"Eszköz"}],"teljesitesek":[{"id":"1","azonosito":"B0510001-200699","idoszak":"2026-06","statusz":"Jóváhagyott","teljig_datuma":"2026-07-01","sorok":[{"dij_id":"1","menny":80,"elsz_menny":80}]}],"kifizetesek":[{"temavezeto":"Kornya József","szf_idoszak":"2026-06","osszesen":188000,"statusz":"Beküldött"}],"dokumentumok":[{"nev":"GreenPark Kft szerződés 2026.pdf","tipus":"Szerződés","statusz":"Feltöltve"}]}'::jsonb
WHERE "azonosito" = 'B0510001';

UPDATE "projekt" SET "meta" = '{"agazat":"Fizikai ágazat","kategoria":"Üzlet, bolt, értékesítés","varmegye":"Pest","kezdete":"2026-03-01","leiras":"Ruházati üzlet raktár leltár — szezonális diákmunka.","munkavegzesi_helyek":[{"irszam":"1051","varos":"Budapest","utca":"Váci utca 12."}],"kapcsolattartok":[{"nev":"Konfár Kitti","email":"konfar.kitti@melodiak.hu","mobil":"+36 20 111 2233","szamlazasi":true}],"dijak":[{"id":"1","nev":"2000 Ft/óra - Ruhabolti kisegítői feladatok","ar":2000,"egysegtipus":"Ft/óra","tipus":"Szervezős"}],"szamfejtesi_berek":[{"id":"1","nev":"Ruhabolti kisegítő","ar":2000,"munkakor":"Üzlet, bolt, értékesítés","vallalasi_dij_id":"1"}],"koltsegek":[],"teljesitesek":[],"kifizetesek":[]}'::jsonb
WHERE "azonosito" = 'B0359192';

UPDATE "projekt" SET "meta" = '{"agazat":"Fizikai ágazat","kategoria":"Könnyű fizikai, gyári, raktári","varmegye":"Pest","leiras":"Nyomdai kisegítő — asztalváz összeszerelés, csomagolás.","munkavegzesi_helyek":[{"irszam":"1117","varos":"Budapest","utca":"Irinyi József u. 4-20."}],"kapcsolattartok":[{"nev":"Konfár Kitti","email":"konfar.kitti@melodiak.hu","mobil":"+36 20 111 2233"}],"dijak":[{"id":"1","nev":"2100 Ft/óra - Nyomdai kisegítő","ar":2100,"egysegtipus":"Ft/óra","tipus":"Átfuttatás"}],"szamfejtesi_berek":[{"id":"1","nev":"Nyomdai kisegítő","ar":2100,"munkakor":"Fizikai, gyári, raktári","vallalasi_dij_id":"1"}]}'::jsonb
WHERE "azonosito" = 'B0472200';

UPDATE "projekt" SET "meta" = '{"agazat":"Fizikai ágazat","kategoria":"Adminisztratív, irodai","varmegye":"Pest","leiras":"Takarítás IV. kerület — irodaház common területek.","munkavegzesi_helyek":[{"irszam":"1042","varos":"Budapest","utca":"Rózsa u. 45."}],"kapcsolattartok":[{"nev":"Dilingai Pál","email":"dilingai.pal@melodiak.hu","mobil":"+36 30 444 5566"}],"dijak":[{"id":"1","nev":"2500 Ft/óra - Takarítás","ar":2500,"egysegtipus":"Ft/óra","tipus":"Szervezős"}],"szamfejtesi_berek":[{"id":"1","nev":"Takarítás","ar":2500,"munkakor":"Adminisztratív, irodai","vallalasi_dij_id":"1"}]}'::jsonb
WHERE "azonosito" = 'B0043100';

UPDATE "projekt" SET "meta" = '{"agazat":"Fizikai ágazat","kategoria":"Könnyű fizikai, gyári, raktári","varmegye":"Pest","leiras":"Címkézés Biatorbágy — logisztikai központ.","munkavegzesi_helyek":[{"irszam":"2051","varos":"Biatorbágy","utca":"Iparos u. 8."}],"kapcsolattartok":[{"nev":"Edőcs Ádám","email":"edocs.adam@melodiak.hu","mobil":"+36 70 333 4455"}],"dijak":[{"id":"1","nev":"2000 Ft/óra - Címkézés","ar":2000,"egysegtipus":"Ft/óra","tipus":"Szervezős"}],"szamfejtesi_berek":[{"id":"1","nev":"Címkézés","ar":2000,"munkakor":"Fizikai, gyári, raktári","vallalasi_dij_id":"1"}],"teljesitesek":[{"id":"1","azonosito":"B0472100-200601","idoszak":"2026-05","statusz":"Jóváhagyott","teljig_datuma":"2026-06-01","sorok":[{"dij_id":"1","menny":120,"elsz_menny":118}]}],"kifizetesek":[{"temavezeto":"Edőcs Ádám","szf_idoszak":"2026-05","osszesen":236000,"statusz":"Számfejtett"}]}'::jsonb
WHERE "azonosito" = 'B0472100';

-- Extra demo projektek (mock-ból)
INSERT INTO "projekt" ("azonosito", "nev", "partner_nev", "iroda", "prioritas", "belso_munka", "meta")
SELECT v.azonosito, v.nev, v.partner_nev, v.iroda, v.prioritas, v.belso_munka, v.meta::jsonb
FROM (VALUES
  ('B09450', 'Soroksári logisztikai raktár', 'Auchan Retail Magyarország Kft.', 'Meló-Diák Universitas Budapest', 'Másodlagos', false,
   '{"agazat":"Fizikai ágazat","kategoria":"Könnyű fizikai, gyári, raktári","varmegye":"Pest","kezdete":"2025-12-01","leiras":"Árufeltöltés és komissiózás logisztikai raktárban.","munkavegzesi_helyek":[{"irszam":"1239","varos":"Budapest","utca":"Nagykőrösi út 351."}],"kapcsolattartok":[{"nev":"Kelemen Zsolt","email":"kelemen.zsolt@auchan.hu","mobil":"+36 20 456 7788","szamlazasi":true}],"dijak":[{"id":"1","nev":"Alapbér — árufeltöltő","ar":2100,"egysegtipus":"Ft/óra","tipus":"Átfuttatás","ervenyesseg":"2025.11–2026.11"}],"szamfejtesi_berek":[{"id":"1","nev":"Árufeltöltő","ar":2100,"munkakor":"Árufeltöltő","vallalasi_dij_id":"1"}],"koltsegek":[],"teljesitesek":[]}'),
  ('B09781', 'Törökbálinti központi raktár', 'DM Kereskedelmi Kft.', 'Meló-Diák Universitas Budapest', 'Elsődleges', false,
   '{"agazat":"Fizikai ágazat","kategoria":"Könnyű fizikai, gyári, raktári","varmegye":"Pest","kezdete":"2026-02-01","leiras":"Komissiózás DM központi raktárban.","munkavegzesi_helyek":[{"irszam":"2045","varos":"Törökbálint","utca":"Torbágy u. 22."}],"kapcsolattartok":[{"nev":"Farkas Nóra","email":"farkas.nora@dm.hu","mobil":"+36 70 234 5566"},{"nev":"Papp Ildikó","email":"papp.ildiko@dm.hu","mobil":"+36 20 888 3344","szamlazasi":true}],"dijak":[{"id":"1","nev":"2000 Ft/óra - Komissiózó","ar":2000,"egysegtipus":"Ft/óra","tipus":"Szervezős"}],"szamfejtesi_berek":[{"id":"1","nev":"Komissiózó","ar":2000,"munkakor":"Komissiózó","vallalasi_dij_id":"1"}],"koltsegek":[],"teljesitesek":[]}')
) AS v(azonosito, nev, partner_nev, iroda, prioritas, belso_munka, meta)
WHERE NOT EXISTS (SELECT 1 FROM "projekt" p WHERE p.azonosito = v.azonosito);

-- Bérkódok az új projektekhez
INSERT INTO "projekt_ber_kod" ("projekt_id", "kod", "ar", "munkakor")
SELECT p.id, v.kod, v.ar, v.munkakor FROM "projekt" p
JOIN (VALUES
  ('B09450', '2100 Ft/óra - Árufeltöltő', 2100, 'Könnyű fizikai, gyári, raktári'),
  ('B09781', '2000 Ft/óra - Komissiózó', 2000, 'Könnyű fizikai, gyári, raktári')
) AS v(azonosito, kod, ar, munkakor) ON p.azonosito = v.azonosito
WHERE NOT EXISTS (
  SELECT 1 FROM "projekt_ber_kod" bk WHERE bk.projekt_id = p.id AND bk.kod = v.kod
);

-- Kiegészítő szereplők (kompenzációs demo adatok)
INSERT INTO "projekt_szereplo" ("projekt_id", "nev", "szerepkor", "email", "erv_kezdete", "tipus", "min_osszeg", "reszesedes")
SELECT p.id, v.nev, v.szerepkor, v.email, v.erv_kezdete, v.tipus, v.min_osszeg, v.reszesedes
FROM "projekt" p
JOIN (VALUES
  ('B0510001', 'Kiss Péter', 'Managing Partner', 'kis.peter@melodiak.hu', '2026-04', 'Fedezet arányos', 0, 5),
  ('B0472100', 'Kiss Péter', 'Managing Partner', 'kis.peter@melodiak.hu', '2026-03', 'Fedezet arányos', 0, 5),
  ('B0472100', 'Edőcs Ádám', 'Témavezető/Mentor', 'edocs.adam@melodiak.hu', '2026-03', 'Fedezet arányos', 4000, 13),
  ('B09450', 'Konfár Kitti', 'Piackutató', 'konfar.kitti@melodiak.hu', '2025-12', 'Fedezet arányos', 0, 10),
  ('B09781', 'Dilingai Pál', 'Témavezető/Mentor', 'dilingai.pal@melodiak.hu', '2026-02', 'Fedezet arányos', 3000, 12)
) AS v(azonosito, nev, szerepkor, email, erv_kezdete, tipus, min_osszeg, reszesedes) ON p.azonosito = v.azonosito
WHERE NOT EXISTS (
  SELECT 1 FROM "projekt_szereplo" sz
  WHERE sz.projekt_id = p.id AND sz.nev = v.nev AND sz.szerepkor = v.szerepkor
);