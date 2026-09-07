# FK — Felhasználói kézikönyvek (SAM / ICE)

**Kanonikus tárolás:** ez a mappa (`/FK/`). A `.docx` fájlok az üzleti követelmények elsődleges forrásai.

Áttekintő infografika: [`../docs/ICE_platform_attekintes.png`](../docs/ICE_platform_attekintes.png)

## Modul → kézikönyv párosítás

| ICE modul / terület | Infografika szegmens | FK fájl(ok) |
|---------------------|----------------------|-------------|
| Szövetkezeti tagok, tagság | Diák menedzsment, diák életciklus 1–5, 11 | `Meló-Diák SAM #01`, `#05` SZJA, `#06` diákigazolvány, `#07` hiányosság, `[SAM] Tagság ügyintézés - Elektronikus aláírás` |
| Partnerek + CRM | CRM, Partner menedzsment, partner életciklus 1–3 | `Meló-Diák SAM #01`, `[SAM] Partnerfelület`, `[SAM] Partnerfelület - Partnerek - Belsős` |
| Projektek | Munka és projekt menedzsment, partner életciklus 4 | `Meló-Diák SAM #01`, `#04` projekt dokumentumok |
| Toborzás – Hirdetések | Diák életciklus 2, partner életciklus 5–6 | `Meló-Diák SAM #11` |
| Toborzás – Jelentkezések | Diák életciklus 2–3 | `Meló-Diák SAM #12` |
| Toborzás – Kampányok | (későbbi) | `[SAM] Kampányok` |
| Bérszámfejtés / Munkalapok | Bérszámfejtés szegmens, diák életciklus 9 | `Meló-Diák SAM #02`, `#03` korrekció |
| Jelenlét / Beosztáskezelő | Jelenlét kezelés, diák életciklus 7–8 | `Meló-Diák SAM #13` |
| Teljesítés igazolás, számlázás | Pénzügy és számlázás, partner életciklus 9–10 | `Meló-Diák SAM #01`, `#02` |
| Elektronikus aláírás | Integrációk: E-aláírás | `[SAM] Elektronikus aláírás`, `[SAM] Tagság ügyintézés - Elektronikus aláírás` |
| Dokumentumkezelés | Dokumentumkezelés szegmens | `#04`, aláírási kézikönyvek |
| Részletes kereső | (kereszt-modul) | `Meló-Diák SAM #08` |
| Ügyfélszolgálat | Belső munkatársi felület | `Meló-Diák SAM #09` |
| Blog | (későbbi) | `Meló-Diák SAM #10` |
| Partner portál (külső) | Partner portál doboz | `[SAM] Partnerfelület` |

## Fájllista

| Fájl | Rövid leírás |
|------|----------------|
| `Meló-Diák SAM #01 - alapok` | Teljes rendszer áttekintés, minden fő modul |
| `Meló-Diák SAM #02 - bérszámfejtés` | Munkalapok, controlling, folyószámla |
| `Meló-Diák SAM #03 - korrekciós bérszámfejtés` | Korrekciós munkalapok |
| `Meló-Diák SAM #04 - projekt dokumentumok` | Projekt dokumentum fül |
| `Meló-Diák SAM #05 - SZJA kedvezmények` | Tag SZJA kedvezmények |
| `Meló-Diák SAM #06 - Diákigazolvány` | Igazolvány típusok, online hosszabbítás |
| `Meló-Diák SAM #07 - Hiányosság lista` | Tag hiányosságok |
| `Meló-Diák SAM #08 - Részletes kereső` | Globális keresés |
| `Meló-Diák SAM #09 - Ügyfélszolgálati útmutató` | Ügyfélszolgálat |
| `Meló-Diák SAM #10 - Blog` | Blog modul |
| `Meló-Diák SAM #11 - Toborzás_Hirdetések` | Hirdetés felvitel, mezők |
| `Meló-Diák SAM #12 - Toborzás_Jelentkezések` | Jelentkezés kezelés, státuszok |
| `Meló-Diák SAM #13 - Beosztáskezelő` | Beosztás, jelenlét, QR/GPS |
| `[SAM] Elektronikus aláírás` | E-aláírás általános |
| `[SAM] Kampányok` | Toborzási kampányok |
| `[SAM] Partnerfelület` | Külső partner portál |
| `[SAM] Partnerfelület - Partnerek - Belsős` | Belső partner kezelés |
| `[SAM] Tagság ügyintézés - Elektronikus aláírás` | Tagsági szerződés e-aláírás |

## Fejlesztői workflow

```
FK kézikönyv (adott modul) → ICE_specifikacio.md → mocks/ice_*_mock.html → kód
```
