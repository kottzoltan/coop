# Coop

Digitális szövetkezet menedzsment (ICE fork alapokon).

## Modulok (terv)

- Cégek (tenant) + munkatársak + jogosultság
- Partnerek + CRM + ajánlatkészítő + szerződésgeneráló
- Projektek (díjak, bérek, költségek, TIG, fedezet, szereplők)
- Vezetői elszámolás
- Könyvelés / bérimport + kintlévőség
- E-számlázás (TIG → e-számla)

## Fejlesztés

```bash
npm install
npm run dev
```

## Munkaerő SZSZ import

Excel forrás: `data/imports/munkaero-2026-08-31/`

```bash
python3 scripts/import-munkaero-szsz.py
# → netlify/database/migrations/0035_ceg_tenant.sql
# → scripts/sql/munkaero_szsz_seed.sql  (nem auto-migration; külön import)
```

Seed (PGlite-en ellenőrizve): **731 partner**, **129 projekt**, **117 szerződés**, **124 kapcsolattartó**, **35 munkatárs**.

Éles DB: a sémamigrációk deploykor futnak. A Munkaerő seed külön (`scripts/sql/…`), ne legyen a migrations mappában (`BEGIN`/`COMMIT` töri a deploy tranzakciót).

ICE-ból átvéve: partner, projekt, fedezet, szereplő-kompenzáció. A diák/tag/bérszámfejtés modulok fokozatosan lecserélődnek / kikerülnek.
