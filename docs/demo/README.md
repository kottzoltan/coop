# ICE folyamat demó videó

## Kimenet

- **MP4:** [`out/ICE-folyamat-vegigjatas.mp4`](out/ICE-folyamat-vegigjatas.mp4) (~70 mp, 1280×720)
- **Interaktív HTML:** [`ice-e2e-folyamat.html`](ice-e2e-folyamat.html) — böngészőben is lejátszható

```bash
open docs/demo/out/ICE-folyamat-vegigjatas.mp4
open docs/demo/ice-e2e-folyamat.html
```

## Forgatókönyv

1. Partner megrendelés (piszkozat)
2. PV visszaigazolás → publikus műszak
3. Diák a műszakra (beosztás / jelentkezés)
4. Diák e-jelenlét (GPS + időablak)
5. Partner jelenlét jóváhagyás
6. PV véglegesítés → számfejthető
7. Bérszámfejtés / munkalap futás
8. Diák bérlap + jóváírás értesítés
9. Admin NAV bevallás elküldése
10. Záró összegzés

## Újragenerálás

```bash
cd docs/demo
npm install playwright
npx playwright install chromium
node render-video.mjs
```

## Megjegyzés

A 8. (diák bérlap / push értesítés) és a 9. (NAV élő beküldés) jelenetek a célfolyamatot mutatják — a diák bérlap UI és a NAV online submit a termékben még részben hiányzik / export-alapú. A 1–7. lépések az élő ICE UI-hoz igazodnak.
