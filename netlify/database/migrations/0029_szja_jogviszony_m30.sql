-- P5/P6/P3: tagság, jogviszony, SZJA kedvezmény nyilatkozat + M30/08E form seed

CREATE TABLE IF NOT EXISTS tagsag (
  id serial PRIMARY KEY,
  tag_id integer NOT NULL UNIQUE REFERENCES szovetkezeti_tag(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'AKTIV',
  start_date date,
  end_date date,
  membership_agreement_signed_at timestamptz,
  office_id varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jogviszony (
  id serial PRIMARY KEY,
  tag_id integer NOT NULL REFERENCES szovetkezeti_tag(id) ON DELETE CASCADE,
  relation_type varchar(40) NOT NULL DEFAULT 'SCHOOL_COOP_MEMBER_WORK',
  is_insured boolean NOT NULL DEFAULT false,
  tb_exempt_reason varchar(100),
  szocho_exempt_reason varchar(100),
  nav_declaration_required boolean NOT NULL DEFAULT false,
  start_date date NOT NULL,
  end_date date,
  project_id integer REFERENCES projekt(id),
  status varchar(30) NOT NULL DEFAULT 'AKTIV',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jogviszony_tag ON jogviszony(tag_id);

CREATE TABLE IF NOT EXISTS szja_kedvezmeny_nyilatkozat (
  id serial PRIMARY KEY,
  tag_id integer NOT NULL REFERENCES szovetkezeti_tag(id) ON DELETE CASCADE,
  legacy_id varchar(100),
  tipus varchar(50) NOT NULL,
  allowance_type varchar(50) NOT NULL,
  adoeloleghonap varchar(7),
  valid_from date NOT NULL,
  valid_to date,
  requested_monthly_amount integer,
  shared_with_spouse boolean NOT NULL DEFAULT false,
  document_id varchar(100),
  megjegyzes text,
  status varchar(30) NOT NULL DEFAULT 'AKTIV',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_szja_kedv_tag ON szja_kedvezmeny_nyilatkozat(tag_id);

-- Tagság seed meglévő tagokból
INSERT INTO tagsag (tag_id, status, start_date, end_date, membership_agreement_signed_at, office_id)
SELECT
  t.id,
  CASE WHEN t.tagsag_statusz IN ('aktív', 'felfüggesztett') THEN 'AKTIV' ELSE 'KILEPETT' END,
  t.belepes,
  t.kilepes,
  CASE WHEN t.belepes IS NOT NULL THEN (t.belepes::timestamptz + interval '1 day') ELSE NULL END,
  t.iroda
FROM szovetkezeti_tag t
WHERE NOT EXISTS (SELECT 1 FROM tagsag tg WHERE tg.tag_id = t.id);

-- Alap jogviszony: iskolaszövetkezeti tagi munka (08E alapból nem)
INSERT INTO jogviszony (tag_id, relation_type, is_insured, tb_exempt_reason, szocho_exempt_reason, nav_declaration_required, start_date, end_date, status)
SELECT
  t.id,
  'SCHOOL_COOP_MEMBER_WORK',
  false,
  'ISKOLASZOVETKEZETI_TAG_NAPPALI',
  'ISKOLASZOVETKEZETI_JOGVISZONY',
  false,
  COALESCE(t.belepes, CURRENT_DATE),
  t.kilepes,
  CASE WHEN t.tagsag_statusz = 'aktív' THEN 'AKTIV' ELSE 'LEZART' END
FROM szovetkezeti_tag t
WHERE t.tagsag_statusz IN ('aktív', 'felfüggesztett', 'kilépett')
  AND NOT EXISTS (
    SELECT 1 FROM jogviszony j
    WHERE j.tag_id = t.id AND j.relation_type = 'SCHOOL_COOP_MEMBER_WORK'
  );

-- SZJA kedvezmény migráció JSONB-ból
INSERT INTO szja_kedvezmeny_nyilatkozat (
  tag_id, legacy_id, tipus, allowance_type, adoeloleghonap, valid_from, valid_to,
  requested_monthly_amount, megjegyzes, status
)
SELECT
  t.id,
  k->>'id',
  COALESCE(k->>'tipus', 'családi'),
  CASE COALESCE(k->>'tipus', 'családi')
    WHEN 'négy_gyermek_anyuka' THEN 'MOTHERS_4_OR_MORE'
    WHEN 'személyi' THEN 'PERSONAL_ALLOWANCE'
    WHEN 'első_házas' THEN 'FIRST_MARRIAGE'
    WHEN 'családi' THEN 'FAMILY_ALLOWANCE'
    ELSE 'FAMILY_ALLOWANCE'
  END,
  k->>'adoeloleghonap',
  COALESCE((k->>'ervenyes_tol')::date, CURRENT_DATE),
  NULLIF(k->>'ervenyes_ig', '')::date,
  NULLIF(k->>'havi_adokedvezmeny', '')::integer,
  k->>'megjegyzes',
  CASE COALESCE(k->>'statusz', 'aktív')
    WHEN 'aktív' THEN 'AKTIV'
    WHEN 'megszűnt' THEN 'MEGSZUNT'
    ELSE 'LEJART'
  END
FROM szovetkezeti_tag t,
  jsonb_array_elements(COALESCE(t.szja_kedvezmenyek, '[]'::jsonb)) AS k
WHERE NOT EXISTS (
  SELECT 1 FROM szja_kedvezmeny_nyilatkozat s
  WHERE s.tag_id = t.id AND s.legacy_id = k->>'id'
);

-- M30 és 08E form verzió seed
INSERT INTO nav_urlap_verzio (form_code, tax_year, version, valid_from, schema_file_path, field_mapping_json, is_active)
SELECT '26M30', 2026, '1.0', '2026-01-01', 'config/nav/2026/26M30-mapping.json',
  '[
    {"iceField":"meta.taxYear","navFieldCode":"ADOEV","required":true},
    {"iceField":"person.name","navFieldCode":"M30_NEV","required":true},
    {"iceField":"person.taxIdentificationNumber","navFieldCode":"M30_ADOAZON","transform":"TAX_ID","required":true},
    {"iceField":"person.totalGross","navFieldCode":"M30_BRUTTO","transform":"HUF","required":true},
    {"iceField":"person.totalSzja","navFieldCode":"M30_SZJA","transform":"HUF","required":true}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM nav_urlap_verzio WHERE form_code = '26M30' AND tax_year = 2026);

INSERT INTO nav_urlap_verzio (form_code, tax_year, version, valid_from, schema_file_path, field_mapping_json, is_active)
SELECT '08E', 2026, '1.0', '2026-01-01', 'config/nav/2026/08E-mapping.json',
  '[
    {"iceField":"person.taxIdentificationNumber","navFieldCode":"08E_ADOAZON","transform":"TAX_ID","required":true},
    {"iceField":"person.name","navFieldCode":"08E_NEV","transform":"NAME_UPPER","required":true},
    {"iceField":"person.birthDate","navFieldCode":"08E_SZULDAT","transform":"DATE_ISO","required":true},
    {"iceField":"person.relationType","navFieldCode":"08E_JOGVISZONY","required":true},
    {"iceField":"person.startDate","navFieldCode":"08E_KEZDET","transform":"DATE_ISO","required":true}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM nav_urlap_verzio WHERE form_code = '08E' AND tax_year = 2026);
