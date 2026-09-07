import { useEffect, useState } from 'react';
import {
  MUNKANAP_FORMATUMOK,
  PRIORITASOK,
  PROJEKT_STATUSZOK,
  type ProjektMetaPayload,
} from '@coop/shared';
import type { Projekt, ProjektSorPatch } from '../../../api/coop';
import { getPartnerek } from '../../../api/coop';
import { BtnGhost, BtnPrimary, FieldLabel } from './Modal';

type Props = {
  sor: Projekt;
  meta: ProjektMetaPayload;
  mentes: boolean;
  onMentes: (meta: ProjektMetaPayload, sor: ProjektSorPatch) => Promise<void>;
};

type Hely = { irszam: string; varos: string; utca: string };

export function ProjektAlapTab({ sor, meta, mentes, onMentes }: Props) {
  const [nev, setNev] = useState(sor.nev);
  const [partnerId, setPartnerId] = useState<string>(sor.partner_id ? String(sor.partner_id) : '');
  const [partnerek, setPartnerek] = useState<Array<{ id: number; nev: string }>>([]);
  const [iroda, setIroda] = useState(sor.iroda ?? '');
  const [statusz, setStatusz] = useState(sor.statusz);
  const [prioritas, setPrioritas] = useState(sor.prioritas ?? 'Elsődleges');
  const [belsoMunka, setBelsoMunka] = useState(!!sor.belso_munka);
  const [agazat, setAgazat] = useState(meta.agazat ?? '');
  const [kategoria, setKategoria] = useState(meta.kategoria ?? '');
  const [varmegye, setVarmegye] = useState(meta.varmegye ?? '');
  const [nemzgazd, setNemzgazd] = useState(meta.nemzgazd ?? '');
  const [cimkek, setCimkek] = useState(meta.cimkek ?? '');
  const [kezdete, setKezdete] = useState(meta.kezdete ?? '');
  const [vege, setVege] = useState(meta.vege ?? '');
  const [leiras, setLeiras] = useState(meta.leiras ?? '');
  const [feladatok, setFeladatok] = useState(meta.feladatok ?? '');
  const [megjegyzes, setMegjegyzes] = useState(meta.megjegyzes ?? '');
  const [helyek, setHelyek] = useState<Hely[]>(
    (meta.munkavegzesi_helyek ?? []).map((h) => ({
      irszam: h.irszam ?? '',
      varos: h.varos ?? '',
      utca: h.utca ?? '',
    })),
  );
  const [uzemorvosEu, setUzemorvosEu] = useState(!!meta.uzemorvos_eu);
  const [munkanapFormatum, setMunkanapFormatum] = useState(meta.munkanap_formatum ?? MUNKANAP_FORMATUMOK[0]);
  const [afaKulcs, setAfaKulcs] = useState(meta.szamlazas?.afa_kulcs ?? '');
  const [tartozik, setTartozik] = useState(meta.szamlazas?.tartozik ?? '');
  const [kovetel, setKovetel] = useState(meta.szamlazas?.kovetel ?? '');
  const [munkaszam, setMunkaszam] = useState(meta.szamlazas?.munkaszam ?? '');
  const [szamlazasiCim, setSzamlazasiCim] = useState(meta.szamlazas?.szamlazasi_cim ?? '');
  const [postafiok, setPostafiok] = useState(meta.szamlazas?.postafiok ?? '');
  const [eszamla, setEszamla] = useState(!!meta.szamlazas?.eszamla);
  const [szamlazasiIntegracio, setSzamlazasiIntegracio] = useState(
    !!meta.szamlazas?.szamlazasi_integracio,
  );
  const [automatikusSzamlazas, setAutomatikusSzamlazas] = useState(
    !!meta.szamlazas?.automatikus_szamlazas,
  );
  const [piszkozatTeljig, setPiszkozatTeljig] = useState(!!meta.szamlazas?.piszkozat_teljig);
  const [szamlaMellek, setSzamlaMellek] = useState(!!meta.szamlazas?.szamla_mellek);
  const [fizetesiHatarido, setFizetesiHatarido] = useState(meta.szamlazas?.fizetesi_hatarido ?? '');

  useEffect(() => {
    getPartnerek()
      .then((d) => setPartnerek(d.sorok.map((p) => ({ id: p.id, nev: p.nev }))))
      .catch(() => setPartnerek([]));
  }, []);

  useEffect(() => {
    setNev(sor.nev);
    setPartnerId(sor.partner_id ? String(sor.partner_id) : '');
    setIroda(sor.iroda ?? '');
    setStatusz(sor.statusz);
    setPrioritas(sor.prioritas ?? 'Elsődleges');
    setBelsoMunka(!!sor.belso_munka);
    setAgazat(meta.agazat ?? '');
    setKategoria(meta.kategoria ?? '');
    setVarmegye(meta.varmegye ?? '');
    setNemzgazd(meta.nemzgazd ?? '');
    setCimkek(meta.cimkek ?? '');
    setKezdete(meta.kezdete ?? '');
    setVege(meta.vege ?? '');
    setLeiras(meta.leiras ?? '');
    setFeladatok(meta.feladatok ?? '');
    setMegjegyzes(meta.megjegyzes ?? '');
    setHelyek(
      (meta.munkavegzesi_helyek ?? []).map((h) => ({
        irszam: h.irszam ?? '',
        varos: h.varos ?? '',
        utca: h.utca ?? '',
      })),
    );
    setUzemorvosEu(!!meta.uzemorvos_eu);
    setMunkanapFormatum(meta.munkanap_formatum ?? MUNKANAP_FORMATUMOK[0]);
    setAfaKulcs(meta.szamlazas?.afa_kulcs ?? '');
    setTartozik(meta.szamlazas?.tartozik ?? '');
    setKovetel(meta.szamlazas?.kovetel ?? '');
    setMunkaszam(meta.szamlazas?.munkaszam ?? '');
    setSzamlazasiCim(meta.szamlazas?.szamlazasi_cim ?? '');
    setPostafiok(meta.szamlazas?.postafiok ?? '');
    setEszamla(!!meta.szamlazas?.eszamla);
    setSzamlazasiIntegracio(!!meta.szamlazas?.szamlazasi_integracio);
    setAutomatikusSzamlazas(!!meta.szamlazas?.automatikus_szamlazas);
    setPiszkozatTeljig(!!meta.szamlazas?.piszkozat_teljig);
    setSzamlaMellek(!!meta.szamlazas?.szamla_mellek);
    setFizetesiHatarido(meta.szamlazas?.fizetesi_hatarido ?? '');
  }, [sor, meta]);

  async function ment() {
    if (!nev.trim()) return;
    if (!partnerId) return;
    const ujMeta: ProjektMetaPayload = {
      ...meta,
      agazat,
      kategoria,
      varmegye,
      nemzgazd,
      cimkek,
      kezdete,
      vege,
      leiras,
      feladatok,
      megjegyzes,
      uzemorvos_eu: uzemorvosEu,
      munkanap_formatum: munkanapFormatum,
      szamlazas: {
        afa_kulcs: afaKulcs || undefined,
        tartozik: tartozik || undefined,
        kovetel: kovetel || undefined,
        munkaszam: munkaszam || undefined,
        szamlazasi_cim: szamlazasiCim || undefined,
        postafiok: postafiok || undefined,
        eszamla: eszamla || undefined,
        szamlazasi_integracio: szamlazasiIntegracio || undefined,
        automatikus_szamlazas: automatikusSzamlazas || undefined,
        piszkozat_teljig: piszkozatTeljig || undefined,
        szamla_mellek: szamlaMellek || undefined,
        fizetesi_hatarido: fizetesiHatarido || undefined,
      },
      munkavegzesi_helyek: helyek.filter((h) => h.irszam || h.varos || h.utca),
    };
    await onMentes(ujMeta, {
      nev,
      partner_id: partnerId ? Number(partnerId) : null,
      iroda: iroda || null,
      statusz,
      prioritas,
      belso_munka: belsoMunka,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <BtnPrimary onClick={ment} disabled={mentes || !partnerId || !nev.trim()}>
          {mentes ? 'Mentés…' : 'Mentés'}
        </BtnPrimary>
      </div>

      <section className="rounded-card border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-navy">Partner és projekt</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label>
            <FieldLabel required>Partner</FieldLabel>
            <select
              className="field-input w-full"
              value={partnerId}
              required
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">— válassz partnert —</option>
              {partnerek.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nev}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              Csak <b>partner</b> típusú CRM rekordok. Ha üres a lista, előbb alakítsd át a leadet partnerré.
            </p>
          </label>
          <label>
            <FieldLabel required>Megnevezés</FieldLabel>
            <input className="field-input w-full" value={nev} onChange={(e) => setNev(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Kirendeltség</FieldLabel>
            <input className="field-input w-full" value={iroda} onChange={(e) => setIroda(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={belsoMunka} onChange={(e) => setBelsoMunka(e.target.checked)} />
            Belső munka
          </label>
          <label>
            <FieldLabel>Státusz</FieldLabel>
            <select className="field-input w-full" value={statusz} onChange={(e) => setStatusz(e.target.value)}>
              {PROJEKT_STATUSZOK.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Prioritás</FieldLabel>
            <select className="field-input w-full" value={prioritas} onChange={(e) => setPrioritas(e.target.value)}>
              {PRIORITASOK.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-navy">Besorolás</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label>
            <FieldLabel>Ágazat</FieldLabel>
            <input className="field-input w-full" value={agazat} onChange={(e) => setAgazat(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Kategória</FieldLabel>
            <input className="field-input w-full" value={kategoria} onChange={(e) => setKategoria(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Vármegye</FieldLabel>
            <input className="field-input w-full" value={varmegye} onChange={(e) => setVarmegye(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Nemzetgazdasági ágazat</FieldLabel>
            <input className="field-input w-full" value={nemzgazd} onChange={(e) => setNemzgazd(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Címkék</FieldLabel>
            <input className="field-input w-full" value={cimkek} onChange={(e) => setCimkek(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Projekt kezdete</FieldLabel>
            <input className="field-input w-full" type="date" value={kezdete} onChange={(e) => setKezdete(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Projekt vége</FieldLabel>
            <input className="field-input w-full" type="date" value={vege} onChange={(e) => setVege(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-navy">Munkavégzés és üzemorvos (SAM)</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label>
            <FieldLabel>Munkanap formátum</FieldLabel>
            <select
              className="field-input w-full"
              value={munkanapFormatum}
              onChange={(e) => setMunkanapFormatum(e.target.value)}
            >
              {MUNKANAP_FORMATUMOK.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm md:col-span-2">
            <input type="checkbox" checked={uzemorvosEu} onChange={(e) => setUzemorvosEu(e.target.checked)} />
            EU üzemorvosi követelmény
          </label>
        </div>
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-navy">Számlázás</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label>
            <FieldLabel>ÁFA kulcs</FieldLabel>
            <input className="field-input w-full" value={afaKulcs} onChange={(e) => setAfaKulcs(e.target.value)} placeholder="27%" />
          </label>
          <label>
            <FieldLabel>Tartozik</FieldLabel>
            <input className="field-input w-full" value={tartozik} onChange={(e) => setTartozik(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Követel</FieldLabel>
            <input className="field-input w-full" value={kovetel} onChange={(e) => setKovetel(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Munkaszám</FieldLabel>
            <input className="field-input w-full" value={munkaszam} onChange={(e) => setMunkaszam(e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <FieldLabel>Számlázási cím</FieldLabel>
            <input className="field-input w-full" value={szamlazasiCim} onChange={(e) => setSzamlazasiCim(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Postafiók</FieldLabel>
            <input className="field-input w-full" value={postafiok} onChange={(e) => setPostafiok(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Fizetési határidő</FieldLabel>
            <input
              className="field-input w-full"
              value={fizetesiHatarido}
              onChange={(e) => setFizetesiHatarido(e.target.value)}
              placeholder="8 nap"
            />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={eszamla} onChange={(e) => setEszamla(e.target.checked)} />
            E-számla
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={szamlazasiIntegracio}
              onChange={(e) => setSzamlazasiIntegracio(e.target.checked)}
            />
            Számlázási integráció
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={piszkozatTeljig}
              onChange={(e) => setPiszkozatTeljig(e.target.checked)}
            />
            Piszkozat teljig
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={szamlaMellek}
              onChange={(e) => setSzamlaMellek(e.target.checked)}
            />
            Számla mellék
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={automatikusSzamlazas}
              disabled={!szamlazasiIntegracio}
              onChange={(e) => setAutomatikusSzamlazas(e.target.checked)}
            />
            Automatikus számlázás
            {!szamlazasiIntegracio && (
              <span className="text-xs text-text-muted">(integráció szükséges)</span>
            )}
          </label>
        </div>
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy">Munkavégzési helyek</h3>
          <BtnGhost
            sm
            onClick={() => setHelyek([...helyek, { irszam: '', varos: '', utca: '' }])}
          >
            + Hely
          </BtnGhost>
        </div>
        <div className="mt-3 space-y-3">
          {helyek.map((h, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-border bg-cream-muted p-3 md:grid-cols-4">
              <input
                className="field-input"
                placeholder="Ir.szám"
                value={h.irszam}
                onChange={(e) => {
                  const next = [...helyek];
                  next[i] = { ...h, irszam: e.target.value };
                  setHelyek(next);
                }}
              />
              <input
                className="field-input"
                placeholder="Város"
                value={h.varos}
                onChange={(e) => {
                  const next = [...helyek];
                  next[i] = { ...h, varos: e.target.value };
                  setHelyek(next);
                }}
              />
              <input
                className="field-input md:col-span-2"
                placeholder="Utca, hsz."
                value={h.utca}
                onChange={(e) => {
                  const next = [...helyek];
                  next[i] = { ...h, utca: e.target.value };
                  setHelyek(next);
                }}
              />
            </div>
          ))}
          {helyek.length === 0 && (
            <p className="text-sm text-text-muted">Nincs munkavégzési hely rögzítve.</p>
          )}
        </div>
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-navy">Leírás</h3>
        <div className="mt-4 grid gap-3">
          <label>
            <FieldLabel>Leírás</FieldLabel>
            <textarea className="field-input w-full" rows={3} value={leiras} onChange={(e) => setLeiras(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Ellátandó feladatok megnevezése</FieldLabel>
            <textarea className="field-input w-full" rows={2} value={feladatok} onChange={(e) => setFeladatok(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Megjegyzés</FieldLabel>
            <textarea className="field-input w-full" rows={2} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} />
          </label>
        </div>
      </section>
    </div>
  );
}
