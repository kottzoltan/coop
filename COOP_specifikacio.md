# ICE — Fejlesztési specifikáció (Cursor átadáshoz)

> Ez a dokumentum a Claude-dal közösen kidolgozott kattintható mockok (ld. mellékelt `.html` fájlok) alapján összegzi a rendszer felépítését, adatmodelljét és üzleti szabályait, hogy Cursorban ez alapján neki lehessen állni a valódi implementációnak.

---

## 1. Áttekintés

Az **ICE** (korábban SAM) egy belső ügyviteli rendszer a Meló-Diák diákmunka-szövetkezet számára. Modulok, mock fájlonként:

| Modul | Fájl | Állapot |
|---|---|---|
| Szövetkezeti tagok | `ice_tagok_mock.html` | v1 design, kész |
| Partnerek + CRM + Szerződések | `ice_partnerek_mock.html` | kész, CRM kanban-nal |
| Projektek | `ice_projektek_mock.html` | kész, mély Alap adatok + fedezetszámítás |
| Toborzás (Hirdetések, Jelentkezések) | `ice_toborzas_mock.html` | kész |
| Bérszámfejtés (Munkalapok) | `ice_berszamfejtes_mock.html` | kész, havi naptár-rács |

Minden mock önálló, egyetlen HTML fájl (vanilla JS, backend nélkül, in-memory adatokkal) — **ezek vizuális és interakciós referenciák**, nem produkciós kód. A valódi appban közös adatbázisra és API-ra lesz szükség, a mockok jelenleg *nem* osztanak adatot egymás között (pl. a Projektek mock diákjai nem ugyanazok, mint a Bérszámfejtés mock diákjai — ezt élesben egy közös `tagok` táblára kell fűzni).

---

## 2. Design rendszer (v1)

- **Színek**: navy sidebar `#1C2536`, arany accent `#B8863F` / `#E9C989`, krém háttér `#F6F4EF`, fehér kártyák, hairline szegélyek `#E4E0D6`.
- **Tipó**: Segoe UI / Inter, nincs egyedi betűtípus-import szükséges.
- **Komponensek**: `.card` (fehér, kerekített, halvány szegély), `.btn-primary` (navy) / `.btn-ghost` (fehér), `.badge` státuszjelvények (zöld=aktív/jóváhagyott, piros=inaktív/elutasított, szürke=piszkozat, arany=lezárt), `.section-head-bar` (kék összecsukható szekciófejek — Bérszámfejtésnél), `.segment` (szegmensvezérlő, pl. Vállalási díjak / Számfejtési bérek váltó).
- **Táblázatok**: sűrű, hairline sorok, felül szűrő-sor mintázat több helyen (Excel-szerű inline filter).
- **Modalok**: `.overlay` + `.modal` (középre rendezett, max-height + scroll), többségük egyszerű form, néhány repeatable-block mintás (+/− gombokkal, pl. Munkavégzési helyek, több munkalap egyszerre).

---

## 3. Modulok és adatmodell

### 3.1 Szövetkezeti tagok
**Entitás: `Tag`**
```
id, nev, adoszam, taj, email, telefon, szuldat, lakcim,
iroda, iskola, diakig, diakig_ervenyesseg,
tagsag_statusz (érvényes | érvénytelen | piszkozat),
belepes, kilepes, reszjegy,
bank_statusz, eseti_szerzodes_statusz + lejarat,
uzemorvosi_statusz + lejarat, tudoszuro_statusz + lejarat,
dokumentumok[]
```
**Fontos**: a lista Műveletek menüje: Tag átemelése (duplikált profil összefésülése e-mail/adószám alapján), Tömeges szinkronizálás/lezárás/kiléptetés, exportok (Tag adat, Módosítás napló, Tagdíj befizetési/kifizetési lista, Tagság változás lista, Tag dokumentumok riport).

### 3.2 Partnerek + CRM + Szerződések
**Entitás: `Partner`**
```
id, nev, adoszam, cim, iroda, statusz (aktív|inaktív),
kapcsolat_tipus (lead|partner), crm_statusz (Új lead|Kapcsolatfelvétel|
  Ajánlat kiküldve|Tárgyalás|Megbízóvá alakítva|Elutasítva),
felelos, letrehozva,
kapcsolattartok: [{ nev, email, mobil, vezetekes, szamlazasi (bool),
  hozzaferes (nincs|olvasas|iras), megjegyzes }]
```
**Entitás: `Kommunikacio`** (CRM napló, `partner_id`-hez kötve): `tipus (ajánlat|megbeszélés|ügyfélértékelés|reklamáció|ticket), datum, szerzo, targy, leiras, statusz (nyitva|lezárva, csak reklamáció/ticket-nél)`.
**Entitás: `Szerzodes`** (partnerhez kötve): `azonosito, kelte, erv_kezdete, erv_vege, szamlazasi_cim{}, levelezesi_cim{}, megjegyzes, dokumentumok[]`.

**CRM logika**: lead → megbízó váltás (`kapcsolat_tipus` flip) megőrzi a teljes korábbi `Kommunikacio` előzményt ugyanazon a rekordon. A CRM tábla (kanban) drag-and-drop-pal lépteti a `crm_statusz`-t; "Megbízóvá alakítva" oszlopba húzva automatikusan `kapcsolat_tipus = partner`.

### 3.3 Projektek
**Entitás: `Projekt`**
```
id, azonosito, nev, partner_id, iroda, statusz, prioritas, belso_munka,
meta: { agazat, kategoria, varmegye, cimkek, kezdete, vege, munkanap_formatum,
  uzemorvosi_figyeles, foglalkoztatas_eu_vizsgalat, eu_vizsgalatok_figyeles,
  szamlazas: { eszamla, szamlazasi_integracio, piszkozat_teljig, szamla_mellek,
    fizetesi_hatarido, afa_bevallas, fizetesi_kondicio, afa, munka_megnevezes,
    fix_megjegyzes, egyeb_info },
  nemzetgazdasagi_agazat, valtozo_munkahely, leiras, ellatando_feladatok, megjegyzes },
munkavegzesi_helyek: [{ irszam, varos, utca }],
kapcsolattartok: [...ugyanaz mint Partnernél...],
szereplok: [{ nev, email, szerepkor (Managing Partner|Piackutató|Témavezető/Mentor|...),
  erv_kezdete, erv_vege, tipus (Fedezet arányos|Egyösszegű), osszeg, min_osszeg,
  reszesedes (%) }],
dijak (Vállalási díjak): [{ nev, ar, egysegtipus, tipus (Szervezős|Átfuttatás), ervenyesseg }],
szamfejtesi_berek: [{ nev, ar, egysegtipus, normaora, munkakor,
  vallalasi_dij_id (KÖTELEZŐ, ld. lent), ervenyesseg }],
koltsegek: [{ nev, osszeg, datum, elszamolasi_idoszak, tipus, szamlazando }],
szerzodesek: [...ugyanaz a szerkezet mint Partnernél, projekthez kötve...],
kifizetesek: [{ temavezeto, szf_idoszak, teljesitesi_idoszak, diakok_szama, osszesen, statusz }],
teljesitesek (Teljesítés igazolás): [{ azonosito, idoszak, statusz, teljig_datuma,
  szl_idoszak_kezdete, szl_idoszak_vege, szl_po, csoportositas, megjegyzes,
  sorok: [{ dij_id, menny, elsz_menny, kozvetitett }],
  koltseg_sorok: [{ koltseg_id, szorzo }] }],
dokumentumok: [{ nev, tipus, idoszak, feltolto, meret, feltoltve, statusz, megjegyzes }]
```

**KULCS-SZABÁLY — Fedezetszámítás** (ez a rendszer lényegi kontrollpontja):
- **Vállalási díj** = a partnernek kiszámlázott egységár.
- **Számfejtési bér** = a diáknak kifizetett egységár. **Minden Számfejtési bérnek kötelezően pontosan egy Vállalási díjhoz kell tartoznia** (`vallalasi_dij_id`), hogy hónap végén ellenőrizhető legyen a kifizetett és a kiszámlázott óraszám egyezése.
- **Teljesítés igazolás** soronként: `Bevétel = Σ(vállalási díj ára × elsz. menny.)`, `Tagi bér = Σ(számfejtési bér ára × menny.)`, `Közvetlen költségek = Σ(hozzárendelt költség × szorzó)`.
- **`Fedezet = Bevétel − Tagi bér − Közvetlen költségek`.**
- A **Szereplők** (profitrészesedéses résztvevők) kompenzációja: `max(legutóbbi Teljesítés igazolás Fedezete × Részesedés% / 100, Min. összeg)`.
- Ha `menny. ≠ elsz. menny.` egy Teljesítés igazolás sorban → vizuális figyelmeztetés (piros), mert ez azt jelzi, hogy a kifizetett és kiszámlázott óraszám nem egyezik.

### 3.4 Toborzás
**Entitás: `Hirdetes`**
```
id, aktiv, projekt_statusz, projektszam (Projekt-re hivatkozik), partner, cim,
nyelv, toborzo (= felelos), varos, megtekintesek, jelentkezok, elfogadottak, letrehozva,
felelos (Projekt Szereplőiből jön!), kifizetesi_kod (Projekt kifizetesi_kodok/
  szamfejtesi_berek-ből választható, NEM szabad szöveg),
berezes (Alapbér|Pótlékos|Megegyezés szerint|Egyéni — ha Egyéni: egyeni_ber szöveg),
varos, extra_varos, extra_varmegye, munkanapok[] VAGY szoveges_munkaido + munkaido_leiras,
cimkek (max 13), min_korhatar, erv_datum,
oneletrajz (bool), telefonszam (bool, ALAPÉRTELMEZETTEN true!), megjegyzes,
nem_ertem_el (limit, alapért. "24 óra"),
munkavegzes_helye, munkavegzes_idopontja, berezes_szoveg, befejezo_szoveg,
eloszo_fejlec, eloszo_torzs (kötelező), eloszo_lablec, amit_kinalunk,
fobb_feladatok (kötelező), elvarasok, elonyt_jelent,
kep_nev, kep_focim (kötelező), kep_alcim, kep_alcim_szin
```
**Entitás: `Jelentkezes`**: `hirdetes_id, nev, email, telefon, datum, statusz`.
**Jelentkezés státuszok** (valós rendszerből): `Kezeletlen, Önéletrajzot várunk, Interjú, Felvéve, Más munkára ajánlottuk, Nem elérhető, Visszamondta, Elutasítva`. Van tömeges állapotváltoztatás.
**Gyorsműveletek** a listán: Jelentkezők, Szerkesztés, +14 nap meghosszabbítás, Aktiválás/Inaktiválás, Törlés.

### 3.5 Bérszámfejtés
**Entitás: `Munkalap`**
```
id, azonosito, nev (opcionális), projekt_id, temavezeto (auto a projektről),
telj_idoszak (ÉÉÉÉ-HH), szf_idoszak (ÉÉÉÉ-HH) — KÉT KÜLÖN DÁTUM,
tipus_egyosszegu (bool), megjegyzes, statusz, letrehozo, letrehozva,
diakok: [{ student_id, idoadatok: { [nap]: { kod (kifizetési kód id), tol, ig } },
  cimkek[], hozzaadva }]
```
**Munkalap életút**: `Piszkozat → Lezárt (4 controlling check lefut) → Jóváhagyott / Elutasított → Számfejtett (folyószámlára emelés, VÉGLEGES, nem vonható vissza)`. Elutasítottból vissza lehet térni Piszkozatra.

**4 controlling flag** (a screenshotok pontos elnevezése): `Magas bruttó bér?` (>300 000 Ft/diák), `Magas óraszám?` (>200 óra/diák), `Kevés alapbér?` (bérkód < aktuális minimálbér), `Problémás szünet?` (egybefüggő műszak túl hosszú, kötelező szünet hiánya).

**Diák-szintű munkaidő rögzítés**: **teljes havi naptár-rács** — minden naptári napra saját Kifizetési kód (a projekt bérkódjaiból) + Munkaidő kezdete/vége, amiből a Mennyiség (óra) és Összeg automatikusan számolódik. Tömeges kitöltés: "Jelenléti naptár" (napok kijelölése + egy kód/időintervallum → egyszerre minden kijelölt napra ráírja).

**Kifizetés bontás** összesítő: a munkalap (vagy egy diák) összes napi bejegyzését bérkód szerint csoportosítva `{azonosito, megnevezes, egysegar, mennyiseg, osszesen}`.

**Jelenlétek (Beosztás kezelő) tab**: a beosztáskezelőből (HRM/QR-kódos jelenlét-rögzítésből) érkező, még munkalaphoz nem rendelt műszakok listája — innen munkalaphoz rendelhetők (`Jelenlétek hozzárendelése beosztáskezelőből`).

**Diák-keresés a Munkalapon**: a "Diákok" szekció alapból csak a munkalapon lévőket mutatja, de van egy **"Teljes tagságból keresés"** mód is: teljes tagi állományból keres (név/adószám, Iroda, Iskola, Tagság státusz szerint), és onnan tömegesen ad hozzá diákokat a munkalaphoz.

---

## 4. Kereszt-modul integrációk (élesben implementálandó)

1. **Szövetkezeti tagok → Bérszámfejtés / Toborzás**: a "diák" entitás egyetlen közös tábla; jelenleg minden mockban külön, kicsit eltérő minta-adat van.
2. **Projektek → Toborzás**: a Hirdetés "Toborzásért felelős" mezőjének választéka a Projekt **Szereplők** listájából jön (jelenleg a Toborzás mockban külön, statikus kollégalista van — élesben ezt a Projekt szereplőire kell kötni).
3. **Projektek → Bérszámfejtés**: a Munkalap Kifizetési kód-jai a Projekt **Számfejtési bérek** listájából jönnek; a Munkalap-on rögzített órák alapján generálódik a **Teljesítés igazolás** `sorok` tömbje (Munkalap ↔ Számfejtési bér ↔ Vállalási díj), ami a fedezetszámítás alapja.
4. **Partnerek → Projektek**: egy Projekt Partnerének Kapcsolattartói és Szerződései megjelennek a Projekt saját füleiben is (jelenleg mindkét mockban külön adat van).
5. **Bérszámfejtés → Pénzügyek** (még nem épült modul): a folyószámlára emelt munkalapok innen kerülnek tovább számlázásra/kifizetésre.

---

## 5. Cursor workflow

### 5.1 `.cursor/rules/project.mdc` tartalom (javasolt)
```
# ICE projekt szabályok
- Stack: [itt add meg, amit választasz — pl. React + Vite + TypeScript + Tailwind + Node/Express + PostgreSQL]
- Design tokenek: navy #1C2536, gold #B8863F/#E9C989, cream #F6F4EF, card white, border #E4E0D6
- Magyar mezőnevek és domain-fogalmak megőrzése (fedezet, vállalási díj, számfejtési bér, teljesítés igazolás,
  munkalap, tagság, kifizetési kód stb.) — NE fordítsd angolra a UI szövegeket vagy a domain-fogalmakat.
- A "Számfejtési bér" mindig egy "Vállalási díj"-hoz kapcsolódik (kötelező FK), ez a fedezetszámítás alapja.
- Ld. a mellékelt specifikációt (ez a dokumentum) és a kattintható mockokat (`ice_*_mock.html`) mint
  az egyetlen forrás az adatmodellhez és interakciókhoz.
```

### 5.2 Javasolt prompt-sorozat
1. *"Nézd át a mellékelt `ICE_specifikacio.md` fájlt és az összes `ice_*_mock.html` mockot. Hozz létre egy [React+TS / választott stack] projektet a közös adatmodellel (Tag, Partner, Projekt, Hirdetes, Jelentkezes, Munkalap entitások) TypeScript interface-ekként egy `types/` mappában, a fenti specifikáció szerint."*
2. *"Építsd meg az adatbázis sémát (Postgres/Prisma vagy választott ORM) a types/ alapján, külön táblákkal a kapcsolt entitásokhoz (kapcsolattartok, szereplok, dijak, szamfejtesi_berek stb.), és győződj meg róla, hogy a `szamfejtesi_berek.vallalasi_dij_id` kötelező foreign key."*
3. *"Implementáld a Szövetkezeti tagok modult a `ice_tagok_mock.html` vizuális és interakciós referenciaként, valós API-hívásokkal az előző lépésben létrehozott backendhez."*
4. *(ugyanez sorban: Partnerek+CRM → Projektek → Toborzás → Bérszámfejtés, mindig a megfelelő mock fájlra és a specifikáció adott szakaszára hivatkozva)*
5. *"Kösd össze a modulokat a 4. szakaszban (Kereszt-modul integrációk) leírtak szerint: Toborzás felelős-mezője a Projekt Szereplőiből, Bérszámfejtés kifizetési kódjai a Projekt Számfejtési béreiből, stb."*
6. *"Implementáld a Teljesítés igazolás fedezetszámítási logikáját a specifikáció 3.3-as szakasza szerint, majd írj hozzá egységteszteket a Bevétel/Tagi bér/Fedezet számításra."*

**Javaslat**: minden lépés után nézd át vizuálisan az eredményt, és ha eltér a mocktól, hivatkozz vissza konkrétan rá ("a Munkalap lista nálam nem mutatja a controlling ikonokat, ld. `ice_berszamfejtes_mock.html` `renderMunkalapList` függvénye").
