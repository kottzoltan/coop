-- P1: bérszámfejtési futás, sorok, adó snapshot, validáció

CREATE TABLE IF NOT EXISTS ber_szamfejtes_futas (
  id serial PRIMARY KEY,
  cooperative_id integer NOT NULL DEFAULT 1,
  payroll_period varchar(7) NOT NULL,
  performance_period varchar(7),
  status varchar(20) NOT NULL DEFAULT 'DRAFT',
  created_by varchar(255),
  closed_at timestamptz,
  korrekcio_szulo_id integer REFERENCES ber_szamfejtes_futas(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ber_futas_period ON ber_szamfejtes_futas(payroll_period);
CREATE INDEX IF NOT EXISTS idx_ber_futas_status ON ber_szamfejtes_futas(status);

CREATE TABLE IF NOT EXISTS ber_szamfejtes_futas_munkalap (
  futas_id integer NOT NULL REFERENCES ber_szamfejtes_futas(id) ON DELETE CASCADE,
  munkalap_id integer NOT NULL REFERENCES munkalap(id),
  PRIMARY KEY (futas_id, munkalap_id)
);

CREATE TABLE IF NOT EXISTS ber_szamfejtett_sor (
  id serial PRIMARY KEY,
  payroll_run_id integer NOT NULL REFERENCES ber_szamfejtes_futas(id) ON DELETE CASCADE,
  tag_id integer NOT NULL REFERENCES szovetkezeti_tag(id),
  projekt_id integer NOT NULL REFERENCES projekt(id),
  wage_code_id varchar(50) NOT NULL,
  gross_amount integer NOT NULL,
  work_hours numeric(10, 2),
  work_date_from date,
  work_date_to date,
  payment_date date,
  jogviszony_tipus varchar(40) NOT NULL DEFAULT 'SCHOOL_COOP_MEMBER_WORK',
  source_munkalap_id integer REFERENCES munkalap(id),
  source_attendance_line_id integer
);

CREATE INDEX IF NOT EXISTS idx_ber_sor_futas ON ber_szamfejtett_sor(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_ber_sor_tag ON ber_szamfejtett_sor(tag_id);

CREATE TABLE IF NOT EXISTS ado_szamitas_snapshot (
  id serial PRIMARY KEY,
  payroll_run_id integer NOT NULL REFERENCES ber_szamfejtes_futas(id),
  payroll_line_id integer NOT NULL REFERENCES ber_szamfejtett_sor(id),
  tag_id integer NOT NULL REFERENCES szovetkezeti_tag(id),
  tax_year integer NOT NULL,
  gross_amount integer NOT NULL,
  income_category varchar(50) NOT NULL,
  initial_szja_base integer NOT NULL,
  applied_allowances_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_szja_base integer NOT NULL,
  calculated_szja integer NOT NULL,
  tb_base integer NOT NULL,
  tb_amount integer NOT NULL,
  szocho_base integer NOT NULL,
  szocho_amount integer NOT NULL,
  net_amount integer NOT NULL,
  tb_exempt_reason varchar(100),
  szocho_exempt_reason varchar(100),
  calculation_version varchar(20) NOT NULL,
  korrekcio_szulo_snapshot_id integer REFERENCES ado_szamitas_snapshot(id),
  is_immutable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ado_snapshot_futas ON ado_szamitas_snapshot(payroll_run_id);

CREATE TABLE IF NOT EXISTS ber_szamfejtes_validacios_hiba (
  id serial PRIMARY KEY,
  payroll_run_id integer NOT NULL REFERENCES ber_szamfejtes_futas(id) ON DELETE CASCADE,
  severity varchar(10) NOT NULL,
  code varchar(50) NOT NULL,
  message text NOT NULL,
  tag_id integer,
  munkalap_id integer,
  payroll_line_id integer
);

-- Snapshot immutability: lezárt futás snapshotjai nem módosíthatók
CREATE OR REPLACE FUNCTION ado_szamitas_snapshot_immutable_guard()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_immutable = true THEN
    RAISE EXCEPTION 'ADO_SNAPSHOT_IMMUTABLE: a lezárt snapshot nem módosítható';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.is_immutable = true THEN
    RAISE EXCEPTION 'ADO_SNAPSHOT_IMMUTABLE: a lezárt snapshot nem törölhető';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ado_snapshot_immutable ON ado_szamitas_snapshot;
CREATE TRIGGER trg_ado_snapshot_immutable
  BEFORE UPDATE OR DELETE ON ado_szamitas_snapshot
  FOR EACH ROW EXECUTE FUNCTION ado_szamitas_snapshot_immutable_guard();
