-- Demo workflow adatok: jelenlétek minden állapotban, bér futás, NAV piszkozat, Auchan + GreenPark

-- PV véglegesített jelenlétek (munkalaphoz rendelhető) — tegnapi GreenPark
UPDATE jelenlet j SET statusz = 'pv_véglegesített'
FROM beosztas b
JOIN muszak m ON m.id = b.muszak_id
JOIN projekt p ON p.id = m.projekt_id
WHERE j.beosztas_id = b.id
  AND p.azonosito = 'B0510001'
  AND m.datum = CURRENT_DATE - 3
  AND j.statusz IN ('partner_jóváhagyva', 'rögzített');

-- Partner jóváhagyásra váró (Auchan projekt)
INSERT INTO jelenlet (
  beosztas_id, diak_id, projekt_id, muszak_datum, partner_id,
  erkezes, tavozas, statusz, forras, rogzites_mod, megjegyzes
)
SELECT
  b.id, b.diak_id, m.projekt_id, m.datum, m.partner_id,
  (m.datum + m.kezdet::time)::timestamp,
  (m.datum + m.vege::time)::timestamp,
  'rögzített', 'diak', 'beosztas', 'Demo: partner jóváhagyásra vár'
FROM beosztas b
JOIN muszak m ON m.id = b.muszak_id
JOIN projekt p ON p.id = m.projekt_id
WHERE p.azonosito = 'B09450'
  AND m.datum >= CURRENT_DATE - 2
  AND m.datum <= CURRENT_DATE
  AND NOT EXISTS (SELECT 1 FROM jelenlet j WHERE j.beosztas_id = b.id)
LIMIT 8;

-- Partner által jóváhagyott, PV-re vár
INSERT INTO jelenlet (
  diak_id, projekt_id, muszak_datum, partner_id,
  erkezes, tavozas, statusz, forras, rogzites_mod, megjegyzes
)
SELECT
  d.id,
  p.id,
  CURRENT_DATE - 1,
  pr.id,
  (CURRENT_DATE - 1 + time '08:00')::timestamp,
  (CURRENT_DATE - 1 + time '16:00')::timestamp,
  'partner_jóváhagyva',
  'partner',
  'szabad',
  'Demo: előzetes beosztás nélkül, partner rögzítette'
FROM projekt p
CROSS JOIN partner_regisztracio pr
CROSS JOIN LATERAL (
  SELECT id FROM diak_regisztracio ORDER BY id LIMIT 1 OFFSET 2
) d
WHERE p.azonosito = 'B09450'
  AND pr.cegnev ILIKE '%Auchan%'
  AND NOT EXISTS (
    SELECT 1 FROM jelenlet j
    WHERE j.diak_id = d.id AND j.muszak_datum = CURRENT_DATE - 1 AND j.rogzites_mod = 'szabad'
  );

-- Audit napló demo (partner módosítás)
INSERT INTO jelenlet_modositas_naplo (jelenlet_id, mezo, regi_ertek, uj_ertek, indok, modosito_szerep)
SELECT j.id, 'tavozas', '15:30', '16:00', 'Partner javította a távozást', 'partner'
FROM jelenlet j
WHERE j.statusz = 'partner_jóváhagyva' AND j.rogzites_mod = 'szabad'
  AND NOT EXISTS (SELECT 1 FROM jelenlet_modositas_naplo n WHERE n.jelenlet_id = j.id)
LIMIT 1;

-- Piszkozat megrendelések (PV visszaigazolásra)
INSERT INTO muszak (
  projekt_id, beosztas_csoport_id, partner_id, cim, hely,
  datum, kezdet, vege, letszam_megrendelt, munkakor, statusz, leiras
)
SELECT
  p.id, bc.id, pr.id,
  'Raktári segéd — délelőtt', 'Soroksár',
  CURRENT_DATE + 3, '07:00', '15:00', 5, 'Raktári', 'piszkozat',
  'Demo megrendelés — PV visszaigazolásra vár'
FROM projekt p
JOIN partner_regisztracio pr ON pr.cegnev ILIKE '%Auchan%'
LEFT JOIN beosztas_csoport bc ON bc.projekt_id = p.id
WHERE p.azonosito = 'B09450'
  AND NOT EXISTS (
    SELECT 1 FROM muszak m
    WHERE m.projekt_id = p.id AND m.datum = CURRENT_DATE + 3 AND m.statusz = 'piszkozat'
  )
LIMIT 1;

-- Bér számfejtési futás demo (júniusi időszak)
INSERT INTO ber_szamfejtes_futas (payroll_period, performance_period, status, created_by)
SELECT '2026-06', '2026-06', 'DRAFT', 'demo@ice.hu'
WHERE NOT EXISTS (
  SELECT 1 FROM ber_szamfejtes_futas WHERE payroll_period = '2026-06' AND status = 'DRAFT'
);

INSERT INTO ber_szamfejtes_futas_munkalap (futas_id, munkalap_id)
SELECT f.id, ml.id
FROM ber_szamfejtes_futas f
CROSS JOIN munkalap ml
WHERE f.payroll_period = '2026-06' AND f.status = 'DRAFT'
  AND ml.azonosito = 'B0510001-ML01'
  AND NOT EXISTS (
    SELECT 1 FROM ber_szamfejtes_futas_munkalap x WHERE x.futas_id = f.id AND x.munkalap_id = ml.id
  );

-- NAV bevallás piszkozat demo
INSERT INTO bevallas_futas (type, tax_year, period, status, generated_by, payroll_run_ids)
SELECT 'NAV_08', 2026, '2026-06', 'DRAFT', 'demo@ice.hu', jsonb_build_array(f.id)
FROM ber_szamfejtes_futas f
WHERE f.payroll_period = '2026-06' AND f.status = 'DRAFT'
  AND NOT EXISTS (
    SELECT 1 FROM bevallas_futas b WHERE b.period = '2026-06' AND b.type = 'NAV_08' AND b.status = 'DRAFT'
  )
LIMIT 1;
