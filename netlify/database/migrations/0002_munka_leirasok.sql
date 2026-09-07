-- Demo leírások a seed munkákhoz (melodiak.hu stílusú részletek oldalhoz)
UPDATE "munka_hirdetes" SET "leiras" = 'Kertész gyakornok egész nyáron
A munkához 18. életévet betöltött, nappali tagozatos hallgatói jogviszonnyal rendelkező személy jelentkezhet.
Multinacionális cégnél végezhető kertészeti munka.
A munka elsősorban nyári időszakra szól, de ősszel is van lehetőség a folytatásra.'
WHERE "cim" = 'Kertész gyakornok' AND ("leiras" IS NULL OR "leiras" = '');

UPDATE "munka_hirdetes" SET "leiras" = 'Fizikai munka Székesfehérváron, gyári környezetben.
Asztalvázak és székvázak ellenőrzése, javítása.
Reggeli műszak, hétköznapokon.'
WHERE "cim" LIKE 'asztalvázak%' AND ("leiras" IS NULL OR "leiras" = '');

UPDATE "munka_hirdetes" SET "leiras" = 'Senior könyvelői feladatok pénzügyi folyamatfejlesztési projektekkel.
Gazdasági szakirányú hallgatóknak ajánlott.
Hosszútávú, szakmai gyakorlat lehetőség.'
WHERE "cim" LIKE 'Senior könyvelő%' AND ("leiras" IS NULL OR "leiras" = '');

UPDATE "munka_hirdetes" SET "leiras" = 'Raktári munka Pécsett, csomagolás és komissiózás.
Hétvégi munkavégzés is lehetséges.
Fizikai munka, de jó fizetéssel.'
WHERE "cim" = 'Raktáros' AND ("leiras" IS NULL OR "leiras" = '');

UPDATE "munka_hirdetes" SET "leiras" = 'Toborzási adminisztrációs feladatok támogatása.
Irodai környezet, hosszútávú lehetőség.
Kommunikatív, precíz diákokat keresünk.'
WHERE "cim" = 'Támogató toborzó' AND ("leiras" IS NULL OR "leiras" = '');
