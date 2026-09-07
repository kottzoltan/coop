import { describe, expect, it } from 'vitest';
import {
  computeTeljigTotals,
  legutobbiTeljigFedezet,
  oraOsszesitesSzamfejtesiBerenkent,
  szamitFedezet,
  szamitSzereploKompenzacio,
  teljesitesElteresSorok,
  teljesitesSorElteres,
  teljesitesSorokFromMunkalap,
  type ProjektMetaPayload,
} from './projekt-demo-meta.js';

const alapMeta: ProjektMetaPayload = {
  dijak: [{ id: '1', nev: '2350 Ft/óra', ar: 2350, egysegtipus: 'Ft/óra', tipus: 'Szervezős' }],
  szamfejtesi_berek: [
    { id: 'szf1', nev: '1800 Ft/óra', ar: 1800, vallalasi_dij_id: '1' },
  ],
  koltsegek: [{ id: 'k1', nev: 'Utazás', osszeg: 5000 }],
  teljesitesek: [
    {
      id: '1',
      azonosito: 'B0510001-200001',
      sorok: [{ dij_id: '1', menny: 80, elsz_menny: 80 }],
      koltseg_sorok: [{ koltseg_id: 'k1', szorzo: 1 }],
    },
  ],
  kifizetesek: [{ temavezeto: 'Teszt', szf_idoszak: '2026-06', osszesen: 144_000 }],
};

describe('computeTeljigTotals', () => {
  it('kiszámolja a bevételt, tagi bért és fedezetet soronként', () => {
    const tot = computeTeljigTotals(alapMeta, alapMeta.teljesitesek![0]);
    expect(tot.bevetel).toBe(188_000); // 2350 × 80
    expect(tot.tagi_ber).toBe(144_000); // 1800 × 80
    expect(tot.kozvetlen_koltsegek).toBe(5000);
    expect(tot.fedezet).toBe(39_000);
  });

  it('kezeli a költség szorzót', () => {
    const tot = computeTeljigTotals(alapMeta, {
      sorok: [{ dij_id: '1', menny: 10, elsz_menny: 10 }],
      koltseg_sorok: [{ koltseg_id: 'k1', szorzo: 2 }],
    });
    expect(tot.kozvetlen_koltsegek).toBe(10_000);
    expect(tot.fedezet).toBe(23_500 - 18_000 - 10_000);
  });
});

describe('szamitFedezet', () => {
  it('projekt szinten összesíti a teljig bevételt és költségeket', () => {
    const f = szamitFedezet(alapMeta);
    expect(f.bevetel).toBe(188_000);
    expect(f.kozvetlen_koltsegek).toBe(5000);
    expect(f.tagi_ber).toBe(144_000); // kifizetések összege
    expect(f.fedezet).toBe(39_000);
  });

  it('kifizetés nélkül a teljig tagi bérből számol', () => {
    const meta: ProjektMetaPayload = {
      ...alapMeta,
      kifizetesek: [],
    };
    const f = szamitFedezet(meta);
    expect(f.tagi_ber).toBe(144_000);
  });

  it('több teljesítés igazolást összead', () => {
    const meta: ProjektMetaPayload = {
      ...alapMeta,
      kifizetesek: [],
      teljesitesek: [
        {
          id: '1',
          sorok: [{ dij_id: '1', menny: 10, elsz_menny: 10 }],
          koltseg_sorok: [],
        },
        {
          id: '2',
          sorok: [{ dij_id: '1', menny: 5, elsz_menny: 5 }],
          koltseg_sorok: [{ koltseg_id: 'k1', szorzo: 1 }],
        },
      ],
    };
    const f = szamitFedezet(meta);
    expect(f.bevetel).toBe(35_250); // 2350 × 15
    expect(f.tagi_ber).toBe(27_000); // 1800 × 15
    expect(f.kozvetlen_koltsegek).toBe(5000);
    expect(f.fedezet).toBe(3250);
  });
});

describe('teljesitesSorElteres', () => {
  it('jelzi ha menny és elsz menny különbözik', () => {
    expect(teljesitesSorElteres({ menny: 80, elsz_menny: 80 })).toBe(false);
    expect(teljesitesSorElteres({ menny: 120, elsz_menny: 118 })).toBe(true);
  });

  it('teljesitesElteresSorok szűri az eltérő sorokat', () => {
    const sorok = [
      { dij_id: '1', menny: 80, elsz_menny: 80 },
      { dij_id: '1', menny: 120, elsz_menny: 118 },
    ];
    expect(teljesitesElteresSorok(sorok)).toHaveLength(1);
  });
});

describe('szamitSzereploKompenzacio', () => {
  it('részesedés alapján számol', () => {
    expect(szamitSzereploKompenzacio(100_000, 10, 0)).toBe(10_000);
  });

  it('minimum összeget alkalmaz', () => {
    expect(szamitSzereploKompenzacio(10_000, 5, 15_000)).toBe(15_000);
  });
});

describe('legutobbiTeljigFedezet', () => {
  it('az első teljig fedezetét adja vissza', () => {
    expect(legutobbiTeljigFedezet(alapMeta)).toBe(39_000);
  });

  it('üres listán null', () => {
    expect(legutobbiTeljigFedezet({ teljesitesek: [] })).toBeNull();
  });
});

describe('teljesitesSorokFromMunkalap', () => {
  it('munkalap óráiból generál teljesítés sorokat', () => {
    const meta: ProjektMetaPayload = {
      dijak: [{ id: '1', nev: 'Díj', ar: 2000, egysegtipus: 'Ft/óra', tipus: 'Szervezős' }],
      szamfejtesi_berek: [{ id: 'szf1', nev: 'Bér', ar: 1500, vallalasi_dij_id: '1' }],
    };
    const diakok = [
      {
        idoadatok: {
          '2026-06-01': { kod: 'szf1', tol: '08:00', ig: '12:00' },
          '2026-06-02': { kod: 'szf1', tol: '08:00', ig: '10:00' },
        },
      },
    ];
    const sorok = teljesitesSorokFromMunkalap(diakok, meta);
    expect(sorok).toEqual([{ dij_id: '1', menny: 6, elsz_menny: 6 }]);
    expect(oraOsszesitesSzamfejtesiBerenkent(diakok).get('szf1')).toBe(6);
  });
});
