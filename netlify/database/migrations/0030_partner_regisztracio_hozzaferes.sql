-- Partner portál hozzáférés (olvasás / írás) a regisztráció szintjén

ALTER TABLE partner_regisztracio
  ADD COLUMN IF NOT EXISTS hozzaferes varchar(20) NOT NULL DEFAULT 'iras';

UPDATE partner_regisztracio
SET hozzaferes = 'iras'
WHERE statusz = 'jóváhagyva' AND (hozzaferes IS NULL OR hozzaferes = '');
