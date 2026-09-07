#!/usr/bin/env node
/**
 * Lokális smoke: migráció fájlok + opcionális /api/health?schema=1
 * Használat: npm run smoke
 * Éles ellenőrzés: curl https://ice89.netlify.app/api/health?schema=1
 */
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'netlify/database/migrations');

const kotelezo = [
  '0013_szovetkezeti_tag.sql',
  '0014_partner_crm.sql',
  '0015_munkalap.sql',
  '0016_projekt_partner_id.sql',
  '0017_tag_melyites.sql',
  '0018_munkalap_korrekcio.sql',
  '0019_jelenlet_qr.sql',
  '0020_jelentkezes_kampany.sql',
  '0021_nopqr.sql',
  '0022_stuvw.sql',
];

let hiba = false;
for (const f of kotelezo) {
  const p = join(migDir, f);
  if (!existsSync(p)) {
    console.error(`✗ Hiányzó migráció: ${f}`);
    hiba = true;
  } else {
    console.log(`✓ ${f}`);
  }
}

const osszes = readdirSync(migDir).filter((f) => f.endsWith('.sql')).length;
console.log(`\nMigrációk összesen: ${osszes} fájl`);

const baseUrl = process.env.SMOKE_URL ?? process.env.URL ?? '';
if (baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/health?schema=1`;
  console.log(`\nHealth check: ${url}`);
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
    if (json.status === 'figyelmeztetes') hiba = true;
  } catch (e) {
    console.warn('Health fetch sikertelen (dev szerver nem fut?):', e.message);
  }
} else {
  console.log('\nTipp: SMOKE_URL=https://ice89.netlify.app npm run smoke');
}

process.exit(hiba ? 1 : 0);
