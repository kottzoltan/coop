# Coop

Szövetkezeti és munkaerő-kölcsönzési ERP (ICE fork alapokon).

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
# → netlify/database/migrations/0036_munkaero_szsz_seed.sql
```

Seed (PGlite-en ellenőrizve): **731 partner**, **129 projekt**, **117 szerződés**, **124 kapcsolattartó**, **35 munkatárs**.

Éles DB-hez: Coop Netlify site link + migrációk futtatása (0035, majd 0036).

ICE-ból átvéve: partner, projekt, fedezet, szereplő-kompenzáció. A diák/tag/bérszámfejtés modulok fokozatosan lecserélődnek / kikerülnek.
