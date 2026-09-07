import { useState } from 'react';
import {
  EGYSEG_TIPUSOK,
  MUNKAKOROK,
  nextMetaId,
  type ProjektMetaPayload,
  type ProjektSzamfejtesiBerMeta,
  type ProjektVallalasiDij,
} from '@coop/shared';
import { BtnGhost, BtnPrimary, FieldLabel, Modal } from './Modal';
import { ft, parseArInput } from './utils';

type Props = {
  meta: ProjektMetaPayload;
  mentes: boolean;
  onMentes: (meta: ProjektMetaPayload) => Promise<void>;
};

export function ProjektDijakTab({ meta, mentes, onMentes }: Props) {
  const [dijModal, setDijModal] = useState(false);
  const [szfModal, setSzfModal] = useState(false);
  const [szerkesztDij, setSzerkesztDij] = useState<ProjektVallalasiDij | null>(null);
  const [szerkesztSzf, setSzerkesztSzf] = useState<ProjektSzamfejtesiBerMeta | null>(null);

  const dijak = meta.dijak ?? [];
  const szfBerek = meta.szamfejtesi_berek ?? [];

  async function mentDijak(nextDijak: ProjektVallalasiDij[], nextSzf = szfBerek) {
    await onMentes({ ...meta, dijak: nextDijak, szamfejtesi_berek: nextSzf });
  }

  async function mentSzf(nextSzf: ProjektSzamfejtesiBerMeta[]) {
    await onMentes({ ...meta, szamfejtesi_berek: nextSzf });
  }

  async function ujVallalasiDij(dij: Omit<ProjektVallalasiDij, 'id'>) {
    if (szerkesztDij) {
      const next = dijak.map((d) =>
        d.id === szerkesztDij.id ? { ...d, ...dij } : d,
      );
      await mentDijak(next);
    } else {
      const uj: ProjektVallalasiDij = { ...dij, id: nextMetaId(dijak) };
      await mentDijak([uj, ...dijak]);
    }
    setDijModal(false);
    setSzerkesztDij(null);
  }

  async function ujSzamfejtesiBer(ber: Omit<ProjektSzamfejtesiBerMeta, 'id'>) {
    if (szerkesztSzf) {
      const next = szfBerek.map((s) =>
        s.id === szerkesztSzf.id ? { ...s, ...ber } : s,
      );
      await mentSzf(next);
    } else {
      const uj: ProjektSzamfejtesiBerMeta = { ...ber, id: nextMetaId(szfBerek) };
      await mentSzf([uj, ...szfBerek]);
    }
    setSzfModal(false);
    setSzerkesztSzf(null);
  }

  async function torolDij(id: string) {
    const hasSzf = szfBerek.some((s) => s.vallalasi_dij_id === id);
    if (hasSzf) {
      alert('Ehhez a vállalási díjhoz számfejtési bér tartozik — előbb azt töröld vagy módosítsd.');
      return;
    }
    if (!confirm('Biztosan törlöd ezt a vállalási díjat?')) return;
    await mentDijak(dijak.filter((d) => d.id !== id));
  }

  async function torolSzf(id: string) {
    if (!confirm('Biztosan törlöd ezt a számfejtési bért?')) return;
    await mentSzf(szfBerek.filter((s) => s.id !== id));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* Vállalási díjak — bal */}
      <div className="rounded-card border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-navy">Vállalási díjak</h3>
          <BtnGhost
            sm
            onClick={() => {
              setSzerkesztDij(null);
              setDijModal(true);
            }}
          >
            + Új vállalási díj
          </BtnGhost>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-cream-muted text-left text-[10px] uppercase text-text-muted">
                <th className="px-2 py-1.5">ID</th>
                <th className="px-2 py-1.5">Megnevezés</th>
                <th className="px-2 py-1.5">Egységár</th>
                <th className="px-2 py-1.5">Típus</th>
                <th className="px-2 py-1.5">Érvényesség</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {dijak.map((d) => (
                <tr key={d.id} className="border-b border-border">
                  <td className="px-2 py-2 font-mono text-gold">{d.id}</td>
                  <td className="px-2 py-2 font-medium text-navy">{d.nev}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{ft(d.ar)}</td>
                  <td className="px-2 py-2">{d.egysegtipus ?? '—'}</td>
                  <td className="px-2 py-2 text-text-muted">{d.ervenyesseg ?? '—'}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="mr-2 text-gold hover:underline"
                      onClick={() => {
                        setSzerkesztDij(d);
                        setDijModal(true);
                      }}
                    >
                      szerk.
                    </button>
                    <button
                      type="button"
                      className="text-danger hover:underline"
                      onClick={() => torolDij(d.id)}
                    >
                      törlés
                    </button>
                  </td>
                </tr>
              ))}
              {dijak.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-text-muted">
                    Nincs vállalási díj.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Számfejtési bérek — jobb */}
      <div className="rounded-card border border-border bg-card p-4">
        <div className="mb-2 rounded-lg border border-border bg-cream-muted px-2 py-1.5 text-[11px] text-text-body">
          Minden számfejtési bérhez kötelező vállalási díj FK — óraegyeztetés a teljig fülön.
        </div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-navy">Számfejtési bérek</h3>
          <BtnGhost
            sm
            onClick={() => {
              setSzerkesztSzf(null);
              setSzfModal(true);
            }}
            disabled={dijak.length === 0}
          >
            + Új számfejtési bér
          </BtnGhost>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-cream-muted text-left text-[10px] uppercase text-text-muted">
                <th className="px-2 py-1.5">ID</th>
                <th className="px-2 py-1.5">Publikus</th>
                <th className="px-2 py-1.5">Megnevezés</th>
                <th className="px-2 py-1.5">Bér</th>
                <th className="px-2 py-1.5">Vállalási díj</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {szfBerek.map((s) => {
                const vd = dijak.find((d) => d.id === s.vallalasi_dij_id);
                return (
                  <tr key={s.id} className="border-b border-border">
                    <td className="px-2 py-2 font-mono text-gold">{s.id}</td>
                    <td className="px-2 py-2">{s.publikus !== false ? '✓' : '—'}</td>
                    <td className="px-2 py-2 font-medium text-navy">{s.nev}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{ft(s.ar)}</td>
                    <td className="px-2 py-2 text-gold">{vd?.nev ?? s.vallalasi_dij_id}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        className="mr-2 text-gold hover:underline"
                        onClick={() => {
                          setSzerkesztSzf(s);
                          setSzfModal(true);
                        }}
                      >
                        szerk.
                      </button>
                      <button
                        type="button"
                        className="text-danger hover:underline"
                        onClick={() => torolSzf(s.id)}
                      >
                        törlés
                      </button>
                    </td>
                  </tr>
                );
              })}
              {szfBerek.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-text-muted">
                    Nincs számfejtési bér.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VallalasiDijModal
        key={szerkesztDij?.id ?? 'uj-dij'}
        open={dijModal}
        mentes={mentes}
        kezdeti={szerkesztDij}
        onClose={() => {
          setDijModal(false);
          setSzerkesztDij(null);
        }}
        onSubmit={ujVallalasiDij}
      />
      <SzamfejtesiBerModal
        key={szerkesztSzf?.id ?? 'uj-szf'}
        open={szfModal}
        mentes={mentes}
        dijak={dijak}
        kezdeti={szerkesztSzf}
        onClose={() => {
          setSzfModal(false);
          setSzerkesztSzf(null);
        }}
        onSubmit={ujSzamfejtesiBer}
      />
    </div>
  );
}

function parseErvenyesseg(erv?: string): [string, string] {
  if (!erv) return ['', ''];
  const parts = erv.split('–');
  return [parts[0]?.trim() === '—' ? '' : parts[0]?.trim() ?? '', parts[1]?.trim() === '—' ? '' : parts[1]?.trim() ?? ''];
}

function VallalasiDijModal({
  open,
  mentes,
  kezdeti,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mentes: boolean;
  kezdeti?: ProjektVallalasiDij | null;
  onClose: () => void;
  onSubmit: (dij: Omit<ProjektVallalasiDij, 'id'>) => Promise<void>;
}) {
  const [kezdete0, vege0] = parseErvenyesseg(kezdeti?.ervenyesseg);
  const [nev, setNev] = useState(kezdeti?.nev ?? '');
  const [ar, setAr] = useState(kezdeti?.ar != null ? String(kezdeti.ar) : '');
  const [egysegtipus, setEgysegtipus] = useState<string>(kezdeti?.egysegtipus ?? EGYSEG_TIPUSOK[0]);
  const [tipus, setTipus] = useState(kezdeti?.tipus ?? 'Szervezős');
  const [kezdete, setKezdete] = useState(kezdete0);
  const [vege, setVege] = useState(vege0);
  const [hiba, setHiba] = useState<string | null>(null);

  async function ment() {
    if (!nev.trim()) {
      setHiba('Add meg a díj megnevezését.');
      return;
    }
    setHiba(null);
    await onSubmit({
      nev: nev.trim(),
      ar: parseArInput(ar),
      egysegtipus,
      tipus,
      ervenyesseg: `${kezdete || '—'}–${vege || '—'}`,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kezdeti ? 'Vállalási díj szerkesztése' : 'Vállalási díjak hozzáadása'}
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
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <FieldLabel required>Megnevezés</FieldLabel>
          <input className="field-input w-full" value={nev} onChange={(e) => setNev(e.target.value)} />
        </label>
        <label>
          <FieldLabel required>Egységár</FieldLabel>
          <input className="field-input w-full" value={ar} onChange={(e) => setAr(e.target.value)} />
        </label>
        <label>
          <FieldLabel required>Egység típus</FieldLabel>
          <select className="field-input w-full" value={egysegtipus} onChange={(e) => setEgysegtipus(e.target.value)}>
            {EGYSEG_TIPUSOK.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel required>Típus</FieldLabel>
          <select className="field-input w-full" value={tipus} onChange={(e) => setTipus(e.target.value)}>
            <option>Szervezős</option>
            <option>Átfuttatás</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <FieldLabel>Érvényesség kezdete és vége</FieldLabel>
        <div className="flex items-center gap-2">
          <input className="field-input flex-1" value={kezdete} onChange={(e) => setKezdete(e.target.value)} placeholder="2026.06" />
          <span>→</span>
          <input className="field-input flex-1" value={vege} onChange={(e) => setVege(e.target.value)} placeholder="2026.12" />
        </div>
      </label>
    </Modal>
  );
}

function SzamfejtesiBerModal({
  open,
  mentes,
  dijak,
  kezdeti,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mentes: boolean;
  dijak: ProjektVallalasiDij[];
  kezdeti?: ProjektSzamfejtesiBerMeta | null;
  onClose: () => void;
  onSubmit: (ber: Omit<ProjektSzamfejtesiBerMeta, 'id'>) => Promise<void>;
}) {
  const [kezdete0, vege0] = parseErvenyesseg(kezdeti?.ervenyesseg);
  const [nev, setNev] = useState(kezdeti?.nev ?? '');
  const [ar, setAr] = useState(kezdeti?.ar != null ? String(kezdeti.ar) : '');
  const [egysegtipus, setEgysegtipus] = useState<string>(kezdeti?.egysegtipus ?? EGYSEG_TIPUSOK[0]);
  const [munkakor, setMunkakor] = useState<string>(kezdeti?.munkakor ?? MUNKAKOROK[0]);
  const [vallalasiDijId, setVallalasiDijId] = useState(kezdeti?.vallalasi_dij_id ?? dijak[0]?.id ?? '');
  const [publikus, setPublikus] = useState(kezdeti?.publikus !== false);
  const [kezdete, setKezdete] = useState(kezdete0);
  const [vege, setVege] = useState(vege0);
  const [hiba, setHiba] = useState<string | null>(null);

  async function ment() {
    if (!nev.trim()) {
      setHiba('Add meg a bér megnevezését.');
      return;
    }
    if (!vallalasiDijId) {
      setHiba('Válassz egy kapcsolódó vállalási díjat — ez kötelező.');
      return;
    }
    setHiba(null);
    await onSubmit({
      nev: nev.trim(),
      ar: parseArInput(ar),
      egysegtipus,
      munkakor,
      vallalasi_dij_id: vallalasiDijId,
      publikus,
      ervenyesseg: `${kezdete || '—'}–${vege || '—'}`,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kezdeti ? 'Számfejtési bér szerkesztése' : 'Számfejtési bérek hozzáadása'}
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
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <FieldLabel required>Megnevezés</FieldLabel>
          <input className="field-input w-full" value={nev} onChange={(e) => setNev(e.target.value)} />
        </label>
        <label>
          <FieldLabel required>Egységár</FieldLabel>
          <input className="field-input w-full" value={ar} onChange={(e) => setAr(e.target.value)} />
        </label>
        <label>
          <FieldLabel required>Egység típus</FieldLabel>
          <select className="field-input w-full" value={egysegtipus} onChange={(e) => setEgysegtipus(e.target.value)}>
            {EGYSEG_TIPUSOK.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <FieldLabel required>Vállalási díj</FieldLabel>
          <select className="field-input w-full" value={vallalasiDijId} onChange={(e) => setVallalasiDijId(e.target.value)}>
            {dijak.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nev} — {ft(d.ar)} {d.egysegtipus}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel required>Munkakör</FieldLabel>
          <select className="field-input w-full" value={munkakor} onChange={(e) => setMunkakor(e.target.value)}>
            {MUNKAKOROK.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publikus} onChange={(e) => setPublikus(e.target.checked)} />
        Publikus (hirdetéshez / toborzáshoz)
      </label>
      <label className="mt-3 block">
        <FieldLabel>Érvényesség kezdete és vége</FieldLabel>
        <div className="flex items-center gap-2">
          <input className="field-input flex-1" value={kezdete} onChange={(e) => setKezdete(e.target.value)} />
          <span>→</span>
          <input className="field-input flex-1" value={vege} onChange={(e) => setVege(e.target.value)} />
        </div>
      </label>
    </Modal>
  );
}
