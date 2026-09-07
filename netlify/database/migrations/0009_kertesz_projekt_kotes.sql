-- Kertész gyakornok hirdetés biztos kötése B0510001 projekthez
-- (ha a jelentkezés megvan, de a projekt sorban 0 jelentkező látszik)

UPDATE "munka_hirdetes" h SET
  "projekt_id" = p.id,
  "partner" = COALESCE(h."partner", p."partner_nev"),
  "felelos" = COALESCE(h."felelos", 'Kornya József'),
  "toborzo" = COALESCE(h."toborzo", 'Kornya József'),
  "eloszo_torzs" = COALESCE(h."eloszo_torzs", h."leiras", h."cim"),
  "fobb_feladatok" = COALESCE(h."fobb_feladatok", h."leiras", h."cim")
FROM "projekt" p
WHERE h."cim" = 'Kertész gyakornok'
  AND p."azonosito" = 'B0510001'
  AND (h."projekt_id" IS NULL OR h."projekt_id" <> p.id);
