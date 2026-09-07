import { db } from '../../../db/index.js';
import {
  diakRegisztracio,
  munkaHirdetes,
  munkaJelentkezes,
  munkalap,
  partnerRegisztracio,
  partner,
  partnerKapcsolattarto,
  projekt,
  szovetkezetiTag,
} from '../../../db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';
import { tagHianyossagSorok, tagVanHianyossag } from '../../../shared/src/tag.js';
import { selectProjektekListahoz } from './projekt-db.js';
import { mergeProjektMeta } from './projekt-meta.js';
import {
  computeTeljigTotals,
  szamitFedezet,
} from '../../../shared/src/projekt-demo-meta.js';
import { buildCsv } from './riport-csv.js';

export async function projektListaCsv(): Promise<string> {
  const sorok = await selectProjektekListahoz();
  const fejlec = [
    'Azonosító',
    'Megnevezés',
    'Partner',
    'Iroda',
    'Prioritás',
    'Státusz',
    'Hirdetések (aktív/össz)',
    'Jelentkezők',
    'Bevétel (Ft)',
    'Tagi bér (Ft)',
    'Költségek (Ft)',
    'Fedezet (Ft)',
  ];

  const sorokCsv = sorok.map((r) => {
    const meta = mergeProjektMeta(r.projekt);
    const f = szamitFedezet(meta);
    return [
      r.projekt.azonosito,
      r.projekt.nev,
      r.projekt.partner_nev ?? '',
      r.projekt.iroda ?? '',
      r.projekt.prioritas ?? '',
      r.projekt.statusz,
      `${r.aktiv_hirdetes}/${r.hirdetes_szam}`,
      r.jelentkezok,
      f.bevetel,
      f.tagi_ber,
      f.kozvetlen_koltsegek,
      f.fedezet,
    ];
  });

  return buildCsv([fejlec, ...sorokCsv]);
}

export async function teljesitesOsszesitoCsv(): Promise<string> {
  const sorok = await selectProjektekListahoz();
  const fejlec = [
    'Projekt azonosító',
    'Projekt név',
    'Partner',
    'Teljig azonosító',
    'Időszak',
    'Státusz',
    'Teljig dátuma',
    'Bevétel (Ft)',
    'Tagi bér (Ft)',
    'Költségek (Ft)',
    'Fedezet (Ft)',
  ];

  const sorokCsv: unknown[][] = [];
  for (const r of sorok) {
    const meta = mergeProjektMeta(r.projekt);
    for (const t of meta.teljesitesek ?? []) {
      const tot = computeTeljigTotals(meta, t);
      sorokCsv.push([
        r.projekt.azonosito,
        r.projekt.nev,
        r.projekt.partner_nev ?? '',
        t.azonosito ?? '',
        t.idoszak ?? '',
        t.statusz ?? '',
        t.teljig_datuma ?? '',
        tot.bevetel,
        tot.tagi_ber,
        tot.kozvetlen_koltsegek,
        tot.fedezet,
      ]);
    }
  }

  return buildCsv([fejlec, ...sorokCsv]);
}

export async function erdeklodokCsv(): Promise<string> {
  const sorok = await db.select().from(diakRegisztracio).orderBy(diakRegisztracio.letrehozva);
  const fejlec = ['ID', 'Név', 'E-mail', 'Telefon', 'Születési dátum', 'Iroda', 'Iskola', 'Státusz', 'Regisztrálva'];
  const sorokCsv = sorok.map((s) => [
    s.id,
    s.nev,
    s.email,
    s.telefon,
    s.szuldat,
    s.iroda,
    s.iskola ?? '',
    s.statusz,
    s.letrehozva?.toISOString?.() ?? s.letrehozva,
  ]);
  return buildCsv([fejlec, ...sorokCsv]);
}

export async function jelentkezesekCsv(hirdetesId?: number): Promise<string> {
  const base = db
    .select({
      id: munkaJelentkezes.id,
      hirdetes_id: munkaJelentkezes.hirdetes_id,
      hirdetes_cim: munkaHirdetes.cim,
      regisztracio_id: munkaJelentkezes.regisztracio_id,
      nev: munkaJelentkezes.nev,
      email: munkaJelentkezes.email,
      telefon: munkaJelentkezes.telefon,
      statusz: munkaJelentkezes.statusz,
      letrehozva: munkaJelentkezes.letrehozva,
    })
    .from(munkaJelentkezes)
    .innerJoin(munkaHirdetes, eq(munkaHirdetes.id, munkaJelentkezes.hirdetes_id));

  const sorok = hirdetesId
    ? await base.where(eq(munkaJelentkezes.hirdetes_id, hirdetesId)).orderBy(desc(munkaJelentkezes.letrehozva))
    : await base.orderBy(desc(munkaJelentkezes.letrehozva));

  const fejlec = ['ID', 'Hirdetés ID', 'Hirdetés', 'Diák ID', 'Név', 'E-mail', 'Telefon', 'Státusz', 'Jelentkezés ideje'];
  const sorokCsv = sorok.map((s) => [
    s.id,
    s.hirdetes_id,
    s.hirdetes_cim,
    s.regisztracio_id,
    s.nev,
    s.email,
    s.telefon,
    s.statusz,
    s.letrehozva?.toISOString?.() ?? s.letrehozva,
  ]);
  return buildCsv([fejlec, ...sorokCsv]);
}

export async function partnerRegisztraciokCsv(): Promise<string> {
  const sorok = await db
    .select({
      id: partnerRegisztracio.id,
      cegnev: partnerRegisztracio.cegnev,
      adoszam: partnerRegisztracio.adoszam,
      kapcsolat_nev: partnerRegisztracio.kapcsolatNev,
      email: partnerRegisztracio.email,
      telefon: partnerRegisztracio.telefon,
      statusz: partnerRegisztracio.statusz,
      letrehozva: partnerRegisztracio.letrehozva,
      projektek: sql<string>`(
        SELECT string_agg(p.azonosito, ', ' ORDER BY p.azonosito)
        FROM projekt p
        WHERE lower(p.partner_nev) = lower(${partnerRegisztracio.cegnev})
      )`,
    })
    .from(partnerRegisztracio);

  const fejlec = ['ID', 'Cégnév', 'Adószám', 'Kapcsolat', 'E-mail', 'Telefon', 'Státusz', 'Projektek', 'Regisztrálva'];
  const sorokCsv = sorok.map((s) => [
    s.id,
    s.cegnev,
    s.adoszam,
    s.kapcsolat_nev,
    s.email,
    s.telefon,
    s.statusz,
    s.projektek ?? '',
    s.letrehozva?.toISOString?.() ?? s.letrehozva,
  ]);
  return buildCsv([fejlec, ...sorokCsv]);
}

export async function tagokCsv(): Promise<string> {
  const sorok = await db.select().from(szovetkezetiTag).orderBy(szovetkezetiTag.nev);
  const fejlec = [
    'ID',
    'Név',
    'Adószám',
    'E-mail',
    'Telefon',
    'Iroda',
    'Iskola',
    'Tagság státusz',
    'Belépés',
    'NAV bejelentés',
    'Kilépés',
    'Részjegy',
    'Bankszámla státusz',
    'Bankszámlaszám',
    'Diákigazolvány',
    'Diákig. érvényes',
    'Eseti szerződés',
    'Üzemorvosi',
    'Tüdőszűrő',
  ];
  const sorokCsv = sorok.map((s) => [
    s.id,
    s.nev,
    s.adoszam,
    s.email,
    s.telefon ?? '',
    s.iroda,
    s.iskola ?? '',
    s.tagsagStatusz,
    s.belepes ?? '',
    s.navBejelentes ?? '',
    s.kilepes ?? '',
    s.reszjegy ?? 0,
    s.bank,
    s.bankszamlaszam ?? '',
    s.diakig ?? '',
    s.diakigErvenyes ?? '',
    s.eszerz,
    s.uzemorv,
    s.tudo,
  ]);
  return buildCsv([fejlec, ...sorokCsv]);
}

export async function partnerekCsv(): Promise<string> {
  const sorok = await db
    .select()
    .from(partner)
    .where(eq(partner.kapcsolatTipus, 'partner'))
    .orderBy(partner.nev);

  const kapcsolattartok = await db.select().from(partnerKapcsolattarto);
  const ktMap = new Map<number, string>();
  for (const kt of kapcsolattartok) {
    const elozo = ktMap.get(kt.partnerId);
    const nev = kt.nev + (kt.email ? ` (${kt.email})` : '');
    ktMap.set(kt.partnerId, elozo ? `${elozo}; ${nev}` : nev);
  }

  const fejlec = [
    'ID',
    'Cégnév',
    'Adószám',
    'Cím',
    'Iroda',
    'Státusz',
    'Felelős',
    'Kapcsolattartók',
    'Létrehozva',
  ];
  const sorokCsv = sorok.map((s) => [
    s.id,
    s.nev,
    s.adoszam ?? '',
    s.cim ?? '',
    s.iroda,
    s.statusz,
    s.felelos ?? '',
    ktMap.get(s.id) ?? '',
    s.letrehozva?.toISOString?.() ?? s.letrehozva,
  ]);
  return buildCsv([fejlec, ...sorokCsv]);
}

export async function munkalapokCsv(): Promise<string> {
  const sorok = await db
    .select({
      ml: munkalap,
      projekt_azonosito: projekt.azonosito,
      projekt_nev: projekt.nev,
    })
    .from(munkalap)
    .innerJoin(projekt, eq(munkalap.projektId, projekt.id))
    .orderBy(desc(munkalap.letrehozva));

  const fejlec = [
    'Azonosító',
    'Projekt',
    'Projekt név',
    'Telj. időszak',
    'Számfejtési időszak',
    'Státusz',
    'Diákok száma',
    'Témavezető',
    'Létrehozva',
  ];
  const sorokCsv = sorok.map((r) => {
    const diakok = Array.isArray(r.ml.diakok) ? r.ml.diakok : [];
    return [
      r.ml.azonosito,
      r.projekt_azonosito,
      r.projekt_nev,
      r.ml.teljIdoszak,
      r.ml.szfIdoszak,
      r.ml.statusz,
      diakok.length,
      r.ml.temavezeto ?? '',
      r.ml.letrehozva?.toISOString?.() ?? r.ml.letrehozva,
    ];
  });
  return buildCsv([fejlec, ...sorokCsv]);
}

export async function tagHianyossagCsv(): Promise<string> {
  const sorok = await db.select().from(szovetkezetiTag).orderBy(szovetkezetiTag.nev);
  const fejlec = ['Tag ID', 'Név', 'Iroda', 'Hiányosság kód', 'Hiányosság', 'Státusz'];
  const sorokCsv: unknown[][] = [];
  for (const t of sorok) {
    const mapped = {
      bank: t.bank,
      bankszamlaszam: t.bankszamlaszam,
      eszerz: t.eszerz,
      uzemorv: t.uzemorv,
      tudo: t.tudo,
      diakig: t.diakig,
      diakig_ervenyes: t.diakigErvenyes,
    };
    if (!tagVanHianyossag(mapped)) continue;
    for (const h of tagHianyossagSorok(mapped)) {
      if (h.statusz === 'ok') continue;
      sorokCsv.push([t.id, t.nev, t.iroda, h.kod, h.leiras, h.statusz]);
    }
  }
  return buildCsv([fejlec, ...sorokCsv]);
}
