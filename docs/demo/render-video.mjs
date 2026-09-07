#!/usr/bin/env node
/**
 * ICE E2E folyamat demó → MP4
 * Használat: node render-video.mjs
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'ice-e2e-folyamat.html');
const framesDir = join(__dirname, 'frames');
const outDir = join(__dirname, 'out');
const outMp4 = join(outDir, 'ICE-folyamat-vegigjatas.mp4');
const SECONDS_PER_SLIDE = 6.5;

mkdirSync(framesDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
for (const f of existsSync(framesDir) ? [] : []) {
  /* noop */
}
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
});

const fileUrl = pathToFileURL(htmlPath).href;
await page.goto(`${fileUrl}?auto=0`, { waitUntil: 'networkidle' });
// wait for fonts
await page.waitForTimeout(800);

const count = await page.evaluate(() => window.__iceCount);
console.log(`Slides: ${count}`);

for (let i = 0; i < count; i++) {
  await page.evaluate((n) => window.__iceShow(n), i);
  await page.waitForTimeout(350);
  const frame = join(framesDir, `slide-${String(i).padStart(2, '0')}.png`);
  await page.screenshot({ path: frame, type: 'png' });
  console.log(`frame ${i + 1}/${count}`);
}

await browser.close();

const listPath = join(framesDir, 'list.txt');
const listBody = Array.from({ length: count }, (_, i) => {
  const f = join(framesDir, `slide-${String(i).padStart(2, '0')}.png`);
  return `file '${f}'\nduration ${SECONDS_PER_SLIDE}`;
}).join('\n');
// last frame must be repeated without duration quirk for ffmpeg concat demuxer
const last = join(framesDir, `slide-${String(count - 1).padStart(2, '0')}.png`);
writeFileSync(listPath, `${listBody}\nfile '${last}'\n`);

const ff = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-vf',
    'fps=30,format=yuv420p',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outMp4,
  ],
  { encoding: 'utf8' },
);

if (ff.status !== 0) {
  console.error(ff.stderr);
  process.exit(ff.status || 1);
}

console.log(`OK → ${outMp4}`);
