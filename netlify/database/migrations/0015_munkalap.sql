-- Munkalapok (bérszámfejtés) — demo seed a mock alapján

CREATE TABLE IF NOT EXISTS "munkalap" (
  "id" serial PRIMARY KEY NOT NULL,
  "azonosito" varchar(50) NOT NULL UNIQUE,
  "nev" varchar(500),
  "projekt_id" integer NOT NULL,
  "temavezeto" varchar(255),
  "telj_idoszak" varchar(7) NOT NULL,
  "szf_idoszak" varchar(7) NOT NULL,
  "tipus_egyosszegu" boolean NOT NULL DEFAULT false,
  "megjegyzes" text,
  "statusz" varchar(50) NOT NULL DEFAULT 'Piszkozat',
  "letrehozo" varchar(255),
  "diakok" jsonb DEFAULT '[]'::jsonb,
  "controlling" jsonb DEFAULT '{}'::jsonb,
  "letrehozva" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "munkalap_projekt_id_idx" ON "munkalap" ("projekt_id");
CREATE INDEX IF NOT EXISTS "munkalap_szf_idoszak_idx" ON "munkalap" ("szf_idoszak");
CREATE INDEX IF NOT EXISTS "munkalap_statusz_idx" ON "munkalap" ("statusz");

INSERT INTO "munkalap" (
  "azonosito", "nev", "projekt_id", "temavezeto", "telj_idoszak", "szf_idoszak",
  "tipus_egyosszegu", "statusz", "letrehozo", "diakok", "controlling", "letrehozva"
)
SELECT
  v.azonosito, v.nev, p.id, v.temavezeto, v.telj_idoszak, v.szf_idoszak,
  v.tipus_egyosszegu, v.statusz, v.letrehozo, v.diakok::jsonb, v.controlling::jsonb, v.letrehozva::timestamp
FROM (VALUES
  (
    'B0510001-ML01', 'GreenPark — júniusi bér', 'B0510001', 'Kornya József', '2026-06', '2026-06',
    false, 'Jóváhagyott', 'demo@ice.hu',
    '[{"student_id":1,"idoadatok":{"2":{"kod":"1","tol":"08:00","ig":"16:00"},"3":{"kod":"1","tol":"08:00","ig":"16:00"}},"cimkek":[],"hozzaadva":"2026-06-01"}]',
    '{"magas_brutto_ber":false,"magas_oraszam":false,"keves_alapber":false,"problemas_szunet":false}',
    '2026-06-01 09:12:00'
  ),
  (
    'B09450-ML01', 'Auchan raktár — júniusi bér', 'B09450', 'Kiss Andrea', '2026-06', '2026-06',
    false, 'Piszkozat', 'demo@ice.hu',
    '[{"student_id":6,"idoadatok":{"5":{"kod":"1","tol":"07:00","ig":"15:00"}},"cimkek":[],"hozzaadva":"2026-06-02"}]',
    '{}',
    '2026-06-02 10:05:00'
  ),
  (
    'B0472100-ML01', '', 'B0472100', 'Edőcs Ádám', '2026-06', '2026-06',
    false, 'Lezárt', 'demo@ice.hu',
    '[{"student_id":4,"idoadatok":{"10":{"kod":"1","tol":"08:00","ig":"20:00"}},"cimkek":[],"hozzaadva":"2026-06-11"}]',
    '{"magas_brutto_ber":false,"magas_oraszam":false,"keves_alapber":false,"problemas_szunet":true}',
    '2026-06-11 08:40:00'
  )
) AS v(azonosito, nev, projekt_azon, temavezeto, telj_idoszak, szf_idoszak, tipus_egyosszegu, statusz, letrehozo, diakok, controlling, letrehozva)
INNER JOIN "projekt" p ON p.azonosito = v.projekt_azon
WHERE NOT EXISTS (SELECT 1 FROM "munkalap" LIMIT 1);
