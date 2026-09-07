-- ICE platform beállítások (e-mail sablonok stb.)

CREATE TABLE IF NOT EXISTS ice_beallitas (
  kulcs varchar(100) PRIMARY KEY,
  ertek jsonb NOT NULL DEFAULT '{}'::jsonb,
  modositva timestamp NOT NULL DEFAULT now()
);

ALTER TABLE partner_meghivo
  ADD COLUMN IF NOT EXISTS email_targy varchar(500);

-- Alap partner meghívó e-mail sablon
INSERT INTO ice_beallitas (kulcs, ertek)
VALUES (
  'partner_meghivo_sablon',
  '{
    "targy": "Meghívó az ICE partnerfelületre — {{cegnev}}",
    "szoveg": "Kedves {{nev}}!\n\nMeghívtak az ICE partnerfelületre{{projekt_sor}} kapcsolattartóként.\n\n{{uzenet_sor}}\n\nA belépéshez állítsd be a jelszavad az alábbi linken ({{lejarat}}-ig érvényes):\n{{link}}\n\nÜdvözlettel,\nMeló-Diák / ICE"
  }'::jsonb
)
ON CONFLICT (kulcs) DO NOTHING;
