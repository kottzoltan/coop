-- Adóévi konfiguráció (bérszámfejtés + NAV modul P0)

CREATE TABLE IF NOT EXISTS adoev_konfig (
  id serial PRIMARY KEY,
  tax_year integer NOT NULL UNIQUE,
  szja_rate numeric(8, 6) NOT NULL,
  tb_rate numeric(8, 6) NOT NULL,
  szocho_rate numeric(8, 6) NOT NULL,
  under25_monthly_allowance_limit integer NOT NULL,
  personal_allowance_monthly_limit integer NOT NULL,
  first_marriage_monthly_allowance integer NOT NULL,
  family_allowance_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  rounding_rules jsonb NOT NULL DEFAULT '{"szja":"floor","tb":"floor","szocho":"floor"}'::jsonb,
  valid_from date NOT NULL,
  valid_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2026 seed — értékek migrációban, nem alkalmazáskódban
INSERT INTO adoev_konfig (
  tax_year,
  szja_rate,
  tb_rate,
  szocho_rate,
  under25_monthly_allowance_limit,
  personal_allowance_monthly_limit,
  first_marriage_monthly_allowance,
  family_allowance_rules,
  rounding_rules,
  valid_from,
  is_active
) VALUES (
  2026,
  0.15,
  0.185,
  0.13,
  715765,
  96900,
  33335,
  '[
    {"childrenCount": 1, "monthlyAmount": 10000},
    {"childrenCount": 2, "monthlyAmount": 20000},
    {"childrenCount": 3, "monthlyAmount": 33000}
  ]'::jsonb,
  '{"szja":"floor","tb":"floor","szocho":"floor"}'::jsonb,
  '2026-01-01',
  true
) ON CONFLICT (tax_year) DO NOTHING;
