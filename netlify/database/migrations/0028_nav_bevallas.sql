-- P4: NAV bevallás (08) táblák + 2026 űrlap verzió seed

CREATE TABLE IF NOT EXISTS nav_urlap_verzio (
  id serial PRIMARY KEY,
  form_code varchar(20) NOT NULL,
  tax_year integer NOT NULL,
  version varchar(20) NOT NULL,
  valid_from date NOT NULL,
  valid_to date,
  schema_file_path varchar(500),
  field_mapping_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS bevallas_futas (
  id serial PRIMARY KEY,
  type varchar(20) NOT NULL,
  tax_year integer NOT NULL,
  period varchar(7),
  cooperative_id integer NOT NULL DEFAULT 1,
  payroll_run_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'DRAFT',
  generated_at timestamptz,
  generated_by varchar(255),
  form_version_id integer REFERENCES nav_urlap_verzio(id),
  korrekcio_szulo_id integer REFERENCES bevallas_futas(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bevallas_futas_period ON bevallas_futas(period, type);
CREATE INDEX IF NOT EXISTS idx_bevallas_futas_status ON bevallas_futas(status);

CREATE TABLE IF NOT EXISTS bevallas_szemelyi_sor (
  id serial PRIMARY KEY,
  declaration_run_id integer NOT NULL REFERENCES bevallas_futas(id) ON DELETE CASCADE,
  tag_id integer NOT NULL REFERENCES szovetkezeti_tag(id),
  tax_identification_number varchar(20) NOT NULL,
  name varchar(255) NOT NULL,
  birth_date date NOT NULL,
  relation_type varchar(40),
  gross_amount integer NOT NULL,
  final_szja_base integer NOT NULL,
  calculated_szja integer NOT NULL,
  tb_amount integer NOT NULL,
  szocho_amount integer NOT NULL,
  exemptions_json jsonb
);

CREATE TABLE IF NOT EXISTS bevallas_osszesito (
  id serial PRIMARY KEY,
  declaration_run_id integer NOT NULL UNIQUE REFERENCES bevallas_futas(id) ON DELETE CASCADE,
  person_count integer NOT NULL,
  total_gross integer NOT NULL,
  total_szja_base integer NOT NULL,
  total_szja integer NOT NULL,
  total_tb integer NOT NULL,
  total_szocho integer NOT NULL
);

CREATE TABLE IF NOT EXISTS bevallas_validacios_hiba (
  id serial PRIMARY KEY,
  declaration_run_id integer NOT NULL REFERENCES bevallas_futas(id) ON DELETE CASCADE,
  severity varchar(10) NOT NULL,
  code varchar(50) NOT NULL,
  message text NOT NULL,
  tag_id integer
);

CREATE TABLE IF NOT EXISTS bevallas_export_fajl (
  id serial PRIMARY KEY,
  declaration_run_id integer NOT NULL REFERENCES bevallas_futas(id) ON DELETE CASCADE,
  file_type varchar(20) NOT NULL,
  file_name varchar(500) NOT NULL,
  file_hash varchar(64) NOT NULL,
  storage_path varchar(500) NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ber_audit_log (
  id serial PRIMARY KEY,
  entity_type varchar(50) NOT NULL,
  entity_id integer NOT NULL,
  action varchar(50) NOT NULL,
  actor_id varchar(255),
  payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2608 mapping seed (mezőkódok configban — nem alkalmazáskódban)
INSERT INTO nav_urlap_verzio (form_code, tax_year, version, valid_from, schema_file_path, field_mapping_json, is_active)
SELECT
  '2608',
  2026,
  '1.0',
  '2026-01-01',
  'config/nav/2026/2608-mapping.json',
  '[
    {"iceField":"meta.formCode","navFieldCode":"FORM_KOD","xmlPath":"/bevallas/@formCode","required":true},
    {"iceField":"meta.taxYear","navFieldCode":"ADOEV","xmlPath":"/bevallas/@taxYear","transform":"YEAR","required":true},
    {"iceField":"meta.period","navFieldCode":"IDOSZAK","xmlPath":"/bevallas/@period","required":true},
    {"iceField":"summary.totalGross","navFieldCode":"OSSZ_BRUTTO","xmlPath":"/bevallas/osszesito/osszBrutto","transform":"HUF","required":true},
    {"iceField":"summary.totalSzja","navFieldCode":"OSSZ_SZJA","xmlPath":"/bevallas/osszesito/osszSzja","transform":"HUF","required":true},
    {"iceField":"person.taxIdentificationNumber","navFieldCode":"SZEM_ADOAZON","xmlPath":"adoazonosito","transform":"TAX_ID","required":true},
    {"iceField":"person.name","navFieldCode":"SZEM_NEV","xmlPath":"nev","transform":"NAME_UPPER","required":true},
    {"iceField":"person.birthDate","navFieldCode":"SZEM_SZULDAT","xmlPath":"szuletesiDatum","transform":"DATE_ISO","required":true},
    {"iceField":"person.grossAmount","navFieldCode":"SZEM_BRUTTO","xmlPath":"brutto","transform":"HUF","required":true},
    {"iceField":"person.finalSzjaBase","navFieldCode":"SZEM_SZJA_ALAP","xmlPath":"szjaAlap","transform":"HUF","required":true},
    {"iceField":"person.calculatedSzja","navFieldCode":"SZEM_SZJA","xmlPath":"levontSzja","transform":"HUF","required":true}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM nav_urlap_verzio WHERE form_code = '2608' AND tax_year = 2026);
