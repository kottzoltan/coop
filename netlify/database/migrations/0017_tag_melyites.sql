-- Tagok mélyítés: SZJA kedvezmények, diákigazolvány típus, bankszámlaszám (FK #05–07)

ALTER TABLE "szovetkezeti_tag" ADD COLUMN IF NOT EXISTS "bankszamlaszam" varchar(50);
ALTER TABLE "szovetkezeti_tag" ADD COLUMN IF NOT EXISTS "diakig_tipus" varchar(50);
ALTER TABLE "szovetkezeti_tag" ADD COLUMN IF NOT EXISTS "diakig_munkarend" varchar(50);
ALTER TABLE "szovetkezeti_tag" ADD COLUMN IF NOT EXISTS "diakig_online_hosszabbitas" boolean NOT NULL DEFAULT false;
ALTER TABLE "szovetkezeti_tag" ADD COLUMN IF NOT EXISTS "szja_kedvezmenyek" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Demo bankszámlaszámok (ahol bank = van)
UPDATE "szovetkezeti_tag"
SET "bankszamlaszam" = '11773016-12345678'
WHERE "bank" = 'van' AND ("bankszamlaszam" IS NULL OR "bankszamlaszam" = '');

UPDATE "szovetkezeti_tag"
SET "diakig_tipus" = 'magyar_diakigazolvany',
    "diakig_munkarend" = 'nappali'
WHERE "diakig" IS NOT NULL AND "diakig_tipus" IS NULL;

-- Demo SZJA kedvezmény (Kovács Anna)
UPDATE "szovetkezeti_tag"
SET "szja_kedvezmenyek" = '[
  {
    "id": "szja-demo-1",
    "tipus": "családi",
    "adoeloleghonap": "2026-01",
    "ervenyes_tol": "2026-01-01",
    "ervenyes_ig": "2026-12-31",
    "havi_adokedvezmeny": 133330,
    "megjegyzes": "1 eltartott — adóelőleg nyilatkozat beküldve",
    "statusz": "aktív"
  }
]'::jsonb
WHERE "email" = 'kovacs.anna@melodiak.hu'
  AND ("szja_kedvezmenyek" IS NULL OR "szja_kedvezmenyek" = '[]'::jsonb);

UPDATE "szovetkezeti_tag"
SET "szja_kedvezmenyek" = '[
  {
    "id": "szja-demo-2",
    "tipus": "első_házas",
    "adoeloleghonap": "2025-06",
    "ervenyes_tol": "2025-06-01",
    "ervenyes_ig": "2027-05-31",
    "havi_adokedvezmeny": 33335,
    "megjegyzes": "24 hónap — házasságkötés után",
    "statusz": "aktív"
  }
]'::jsonb
WHERE "email" = 'kiss.zoe@melodiak.hu'
  AND ("szja_kedvezmenyek" IS NULL OR "szja_kedvezmenyek" = '[]'::jsonb);
