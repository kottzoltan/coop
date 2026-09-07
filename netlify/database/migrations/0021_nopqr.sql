-- N+P: jelentkezés „Nem elérhető” időbélyeg
ALTER TABLE munka_jelentkezes
  ADD COLUMN IF NOT EXISTS nem_ertem_el_at TIMESTAMP;
