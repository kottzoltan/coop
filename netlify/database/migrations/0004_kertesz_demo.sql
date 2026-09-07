-- Kertész gyakornok demo tartalom (melodiak.hu minta)
UPDATE "munka_hirdetes" SET
  "fobb_feladatok" = 'Fűvágás és kapcsolódó feladatok
Levelek összeszedése
Sövény vágás
Gyomlálás
Söprögetés
Öntözés',
  "elonyt_jelent" = 'Kertészeti tanulmányok',
  "munkavegzes_helye" = 'X. kerület Expo tér',
  "munkavegzes_idopontja" = 'Hétköznapokon 4 vagy 8 órában. Heti 20 óra vállalása a minimum elvárás.
Kezdés mindig a kora reggeli órákban.',
  "berezes_szoveg" = '2350 Ft/óra',
  "befejezo_szoveg" = 'Jelentkezni a kornya.jozsef@melodiak.hu címre lehet önéletrajzzal.',
  "felelos" = 'Kornya József',
  "toborzo" = 'Kornya József',
  "oneletrajz" = true,
  "telefonszam" = true
WHERE "cim" = 'Kertész gyakornok';
