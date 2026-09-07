import { useEffect, useMemo, useState } from 'react';
import {
  computeTeljigTotals,
  nextMetaId,
  teljesitesElteresSorok,
  teljesitesSorElteres,
  teljesitesSorokFromMunkalap,
  type ProjektMetaPayload,
  type ProjektTeljesitesKoltsegSor,
  type ProjektTeljesitesMeta,
  type ProjektTeljesitesSor,
} from '@coop/shared';
import { getMunkalap, getMunkalapok, type Munkalap } from '../../../api/coop';
import { BtnGhost, BtnPrimary, FieldLabel, Modal } from './Modal';
import { ft, parseArInput } from './utils';

type Props = {
  meta: ProjektMetaPayload;
  projektAzonosito: string;
  projektId: number;
  mentes: boolean;
  onMentes: (meta: ProjektMetaPayload) => Promise<void>;
};

export function ProjektTeljesitesTab({ meta, projektAzonosito, projektId, mentes, onMentes }: Props) {
  const [modal, setModal] = useState(false);
  const [szerkesztId, setSzerkesztId] = useState<string | null>(null);
  const lista = meta.teljesitesek ?? [];

  function megnyitUj() {
    setSzerkesztId(null);
    setModal(true);
  }

  function megnyitSzerkeszt(t: ProjektTeljesitesMeta) {
    setSzerkesztId(t.id ?? null);
    setModal(true);
  }

  async function mentTeljig(teljig: ProjektTeljesitesMeta) {
    const next = [...lista];
    if (szerkesztId) {
      const idx = next.findIndex((x) => x.id === szerkesztId);
      if (idx >= 0) next[idx] = teljig;
      else next.unshift(teljig);
    } else {
      next.unshift(teljig);
    }
    await onMentes({ ...meta, teljesitesek: next });
    setModal(false);
  }

  const szerkesztett = szerkesztId ? lista.find((t) => t.id === szerkesztId) : undefined;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <BtnGhost sm onClick={megnyitUj} disabled={(meta.dijak ?? []).length === 0}>
          + Új teljesítés igazolás
        </BtnGhost>
      </div>
      {(meta.dijak ?? []).length === 0 && (
        <p className="mb-3 text-sm text-text-muted">
          Előbb rögzíts vállalási díjat a Díjak & bérek fülön.
        </p>
      )}
      {lista.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
          Nincs teljesítés igazolás.
        </div>
      ) : (
        <div className="space-y-4">
          {lista.map((t) => {
            const tot = computeTeljigTotals(meta, t);
            const elteresek = teljesitesElteresSorok(t.sorok);
            return (
              <div key={t.id ?? t.azonosito} className="rounded-card border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy">{t.azonosito ?? 'Piszkozat'}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                      {t.statusz ?? 'Piszkozat'}
                    </span>
                    {t.munkalap_azonosito && (
                      <span className="rounded-md bg-cream-muted px-2 py-0.5 text-xs font-semibold text-text-muted">
                        munkalap: {t.munkalap_azonosito}
                      </span>
                    )}
                    <BtnGhost sm onClick={() => megnyitSzerkeszt(t)}>
                      Szerkesztés
                    </BtnGhost>
                  </div>
                </div>
                <p className="mt-1 text-sm text-text-muted">Időszak: {t.idoszak ?? '—'}</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-text-muted">Bevétel: </span>
                    <strong>{ft(tot.bevetel)}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Tagi bér: </span>
                    <strong>{ft(tot.tagi_ber)}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Költség: </span>
                    <strong>{ft(tot.kozvetlen_koltsegek)}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Fedezet: </span>
                    <strong className={tot.fedezet >= 0 ? 'text-success' : 'text-danger'}>
                      {ft(tot.fedezet)}
                    </strong>
                  </div>
                </div>
                {elteresek.length > 0 && (
                  <p className="mt-2 rounded-md bg-danger-bg px-2 py-1 text-xs font-semibold text-danger">
                    ⚠ Menny. ≠ elsz. menny. ({elteresek.length} sor) — a kifizetett és kiszámlázott óraszám
                    nem egyezik.
                  </p>
                )}
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase text-text-muted">
                      <th className="py-1">Díj</th>
                      <th className="py-1">Menny.</th>
                      <th className="py-1">Elsz. menny.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(t.sorok ?? []).map((s, j) => {
                      const dij = (meta.dijak ?? []).find((d) => d.id === s.dij_id);
                      const elter = teljesitesSorElteres(s);
                      return (
                        <tr
                          key={j}
                          className={`border-t border-border ${elter ? 'bg-danger-bg/40' : ''}`}
                        >
                          <td className="py-1">{dij?.nev ?? s.dij_id}</td>
                          <td className={`py-1 ${elter ? 'font-semibold text-danger' : ''}`}>
                            {s.menny}
                          </td>
                          <td className={`py-1 ${elter ? 'font-semibold text-danger' : ''}`}>
                            {s.elsz_menny}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <TeljigModal
        key={szerkesztett?.id ?? 'uj'}
        open={modal}
        mentes={mentes}
        meta={meta}
        projektAzonosito={projektAzonosito}
        projektId={projektId}
        kezdeti={szerkesztett}
        onClose={() => setModal(false)}
        onSubmit={mentTeljig}
      />
    </div>
  );
}

function TeljigModal({
  open,
  mentes,
  meta,
  projektAzonosito,
  projektId,
  kezdeti,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mentes: boolean;
  meta: ProjektMetaPayload;
  projektAzonosito: string;
  projektId: number;
  kezdeti?: ProjektTeljesitesMeta;
  onClose: () => void;
  onSubmit: (t: ProjektTeljesitesMeta) => Promise<void>;
}) {
  const dijak = meta.dijak ?? [];
  const koltsegek = meta.koltsegek ?? [];
  const szfBerek = meta.szamfejtesi_berek ?? [];

  const [statusz, setStatusz] = useState(kezdeti?.statusz ?? 'Piszkozat');
  const [teljigDatuma, setTeljigDatuma] = useState(kezdeti?.teljig_datuma ?? '');
  const [idoszak, setIdoszak] = useState(kezdeti?.idoszak ?? '');
  const [szlKezdet, setSzlKezdet] = useState(kezdeti?.szl_idoszak_kezdete ?? '');
  const [szlVeg, setSzlVeg] = useState(kezdeti?.szl_idoszak_vege ?? '');
  const [po, setPo] = useState(kezdeti?.szl_po ?? '');
  const [megjegyzes, setMegjegyzes] = useState(kezdeti?.megjegyzes ?? '');
  const [sorok, setSorok] = useState<ProjektTeljesitesSor[]>(kezdeti?.sorok ?? []);
  const [koltsegSorok, setKoltsegSorok] = useState<ProjektTeljesitesKoltsegSor[]>(
    kezdeti?.koltseg_sorok ?? [],
  );
  const [ujDijId, setUjDijId] = useState(dijak[0]?.id ?? '');
  const [ujKoltsegId, setUjKoltsegId] = useState(koltsegek[0]?.id ?? '');
  const [hiba, setHiba] = useState<string | null>(null);
  const [munkalapok, setMunkalapok] = useState<Munkalap[]>([]);
  const [kivalasztottMl, setKivalasztottMl] = useState('');
  const [mlToltes, setMlToltes] = useState(false);

  useEffect(() => {
    if (!open || !projektId) return;
    getMunkalapok({ projekt_id: projektId })
      .then((d) => setMunkalapok(d.sorok.filter((ml) => ml.diakok?.length)))
      .catch(() => setMunkalapok([]));
  }, [open, projektId]);

  async function orakBetolteseMunkalapbol() {
    if (!kivalasztottMl) {
      setHiba('Válassz munkalapot.');
      return;
    }
    setMlToltes(true);
    setHiba(null);
    try {
      const d = await getMunkalap(Number(kivalasztottMl));
      const ujSorok = teljesitesSorokFromMunkalap(d.munkalap.diakok, meta);
      if (!ujSorok.length) {
        setHiba('A munkalapon nincs óraegyeztethető adat (számfejtési bér ↔ vállalási díj).');
        return;
      }
      setSorok(ujSorok);
      if (!idoszak && d.munkalap.telj_idoszak) setIdoszak(d.munkalap.telj_idoszak);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Munkalap betöltése sikertelen');
    } finally {
      setMlToltes(false);
    }
  }

  const osszesito = useMemo(
    () => computeTeljigTotals(meta, { sorok, koltseg_sorok: koltsegSorok }),
    [meta, sorok, koltsegSorok],
  );

  function sorHozzaad() {
    if (!ujDijId) return;
    setSorok([...sorok, { dij_id: ujDijId, menny: 0, elsz_menny: 0 }]);
  }

  function koltsegSorHozzaad() {
    if (!ujKoltsegId) return;
    setKoltsegSorok([...koltsegSorok, { koltseg_id: ujKoltsegId, szorzo: 1 }]);
  }

  async function ment() {
    if (!teljigDatuma || !idoszak) {
      setHiba('A teljig dátuma és az elszámolási időszak kötelező.');
      return;
    }
    if (sorok.length === 0) {
      setHiba('Adj hozzá legalább egy vállalási díj sort.');
      return;
    }
    setHiba(null);

    const id = kezdeti?.id ?? nextMetaId(meta.teljesitesek ?? []);
    const azonosito =
      kezdeti?.azonosito ?? `${projektAzonosito}-${String(200000 + Math.floor(Math.random() * 9999))}`;

    await onSubmit({
      id,
      azonosito,
      statusz,
      teljig_datuma: teljigDatuma,
      idoszak,
      szl_idoszak_kezdete: szlKezdet,
      szl_idoszak_vege: szlVeg,
      szl_po: po,
      megjegyzes,
      sorok,
      koltseg_sorok: koltsegSorok,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kezdeti ? `Teljig szerkesztése — ${kezdeti.azonosito}` : 'Teljesítés igazolás létrehozása'}
      wide
      footer={
        <>
          <BtnGhost onClick={onClose}>Mégse</BtnGhost>
          <BtnPrimary onClick={ment} disabled={mentes}>
            {mentes ? 'Mentés…' : 'Mentés'}
          </BtnPrimary>
        </>
      }
    >
      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div>
          <FieldLabel>Bevétel</FieldLabel>
          <p className="font-semibold text-navy">{ft(osszesito.bevetel)}</p>
        </div>
        <div>
          <FieldLabel>Tagi bér + költség</FieldLabel>
          <p className="font-semibold text-navy">
            {ft(osszesito.tagi_ber + osszesito.kozvetlen_koltsegek)}
          </p>
        </div>
        <div>
          <FieldLabel>Fedezet</FieldLabel>
          <p className={`font-bold ${osszesito.fedezet >= 0 ? 'text-success' : 'text-danger'}`}>
            {ft(osszesito.fedezet)}
          </p>
        </div>
        <label>
          <FieldLabel>Állapot</FieldLabel>
          <select className="field-input w-full" value={statusz} onChange={(e) => setStatusz(e.target.value)}>
            <option>Piszkozat</option>
            <option>Jóváhagyott</option>
            <option>Számlázva</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <FieldLabel required>Teljig dátuma</FieldLabel>
          <input
            className="field-input w-full"
            type="date"
            value={teljigDatuma}
            onChange={(e) => setTeljigDatuma(e.target.value)}
          />
        </label>
        <label>
          <FieldLabel required>Elszámolási időszak</FieldLabel>
          <input
            className="field-input w-full"
            value={idoszak}
            onChange={(e) => setIdoszak(e.target.value)}
            placeholder="2026-07"
          />
        </label>
        <label>
          <FieldLabel>Számla PO</FieldLabel>
          <input className="field-input w-full" value={po} onChange={(e) => setPo(e.target.value)} />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <FieldLabel>Számlázási időszak</FieldLabel>
          <div className="flex items-center gap-2">
            <input className="field-input flex-1" type="date" value={szlKezdet} onChange={(e) => setSzlKezdet(e.target.value)} />
            <span>→</span>
            <input className="field-input flex-1" type="date" value={szlVeg} onChange={(e) => setSzlVeg(e.target.value)} />
          </div>
        </label>
        <label>
          <FieldLabel>Megjegyzés</FieldLabel>
          <textarea
            className="field-input w-full"
            rows={2}
            value={megjegyzes}
            onChange={(e) => setMegjegyzes(e.target.value)}
          />
        </label>
      </div>

      <h3 className="mb-2 mt-5 text-sm font-bold text-navy">Vállalási díjak — óraegyeztetés</h3>
      <div className="mb-2 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-cream-muted/40 p-3">
        <label className="flex-1 text-xs">
          <span className="font-bold text-text-muted">Órák betöltése munkalapból</span>
          <select
            className="field-input mt-1 w-full"
            value={kivalasztottMl}
            onChange={(e) => setKivalasztottMl(e.target.value)}
          >
            <option value="">— munkalap —</option>
            {munkalapok.map((ml) => (
              <option key={ml.id} value={ml.id}>
                {ml.azonosito} ({ml.szf_idoszak}, {ml.statusz})
              </option>
            ))}
          </select>
        </label>
        <BtnGhost onClick={orakBetolteseMunkalapbol} disabled={mlToltes || !kivalasztottMl}>
          {mlToltes ? 'Betöltés…' : 'Betöltés'}
        </BtnGhost>
      </div>
      <div className="mb-2 flex gap-2">
        <select className="field-input flex-1" value={ujDijId} onChange={(e) => setUjDijId(e.target.value)}>
          {dijak.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nev} — {ft(d.ar)}
            </option>
          ))}
        </select>
        <BtnGhost onClick={sorHozzaad}>+ Sor</BtnGhost>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-cream-muted text-left text-[10px] uppercase text-text-muted">
              <th className="px-2 py-1.5">Számfejtési bér</th>
              <th className="px-2 py-1.5">Vállalási díj</th>
              <th className="px-2 py-1.5">Menny.</th>
              <th className="px-2 py-1.5">Elsz. menny.</th>
              <th className="px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {sorok.map((s, i) => {
              const dij = dijak.find((d) => d.id === s.dij_id);
              const szf = szfBerek.find((x) => x.vallalasi_dij_id === s.dij_id);
              const elter = teljesitesSorElteres(s);
              return (
                <tr
                  key={i}
                  className={`border-t border-border ${elter ? 'bg-danger-bg/30' : ''}`}
                >
                  <td className="px-2 py-1.5">{szf?.nev ?? '—'}</td>
                  <td className="px-2 py-1.5">{dij?.nev ?? '—'}</td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`field-input w-16 ${elter ? 'border-danger text-danger' : ''}`}
                      value={s.menny}
                      onChange={(e) => {
                        const next = [...sorok];
                        next[i] = { ...s, menny: parseArInput(e.target.value) };
                        setSorok(next);
                      }}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`field-input w-16 ${elter ? 'border-danger text-danger' : ''}`}
                      value={s.elsz_menny}
                      onChange={(e) => {
                        const next = [...sorok];
                        next[i] = { ...s, elsz_menny: parseArInput(e.target.value) };
                        setSorok(next);
                      }}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      className="text-danger hover:underline"
                      onClick={() => setSorok(sorok.filter((_, j) => j !== i))}
                    >
                      törlés
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorok.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-text-muted">
                  Nincs rögzített sor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {koltsegek.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-sm font-bold text-navy">Költségek hozzárendelése</h3>
          <div className="mb-2 flex gap-2">
            <select
              className="field-input flex-1"
              value={ujKoltsegId}
              onChange={(e) => setUjKoltsegId(e.target.value)}
            >
              {koltsegek.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nev} — {ft(k.osszeg)}
                </option>
              ))}
            </select>
            <BtnGhost onClick={koltsegSorHozzaad}>+ Költség</BtnGhost>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-cream-muted text-left text-[10px] uppercase text-text-muted">
                  <th className="px-2 py-1.5">Költség</th>
                  <th className="px-2 py-1.5">Összeg</th>
                  <th className="px-2 py-1.5">Szorzó</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {koltsegSorok.map((k, i) => {
                  const src = koltsegek.find((c) => c.id === k.koltseg_id);
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">{src?.nev ?? '—'}</td>
                      <td className="px-2 py-1.5">{src ? ft(src.osszeg) : '—'}</td>
                      <td className="px-2 py-1.5">
                        <input
                          className="field-input w-16"
                          value={k.szorzo ?? 1}
                          onChange={(e) => {
                            const next = [...koltsegSorok];
                            next[i] = { ...k, szorzo: parseArInput(e.target.value) || 1 };
                            setKoltsegSorok(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          className="text-danger hover:underline"
                          onClick={() => setKoltsegSorok(koltsegSorok.filter((_, j) => j !== i))}
                        >
                          törlés
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
