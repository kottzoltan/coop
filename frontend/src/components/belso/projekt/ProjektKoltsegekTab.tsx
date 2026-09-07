import { useState } from 'react';
import { KOLTSEG_TIPUSOK, nextMetaId, type ProjektKoltsegMeta, type ProjektMetaPayload } from '@coop/shared';
import { BtnGhost, BtnPrimary, FieldLabel, Modal } from './Modal';
import { ft, parseArInput } from './utils';

type Props = {
  meta: ProjektMetaPayload;
  mentes: boolean;
  onMentes: (meta: ProjektMetaPayload) => Promise<void>;
};

export function ProjektKoltsegekTab({ meta, mentes, onMentes }: Props) {
  const [modal, setModal] = useState(false);
  const lista = meta.koltsegek ?? [];

  async function ujKoltseg(koltseg: Omit<ProjektKoltsegMeta, 'id'>) {
    const uj: ProjektKoltsegMeta = { ...koltseg, id: nextMetaId(lista) };
    await onMentes({ ...meta, koltsegek: [uj, ...lista] });
    setModal(false);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <BtnGhost sm onClick={() => setModal(true)}>
          + Új költség
        </BtnGhost>
      </div>
      {lista.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
          Nincs költség.
        </div>
      ) : (
        <table className="w-full rounded-card border border-border bg-card text-sm">
          <thead>
            <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
              <th className="px-3 py-2">Megnevezés</th>
              <th className="px-3 py-2">Összeg</th>
              <th className="px-3 py-2">Dátum</th>
              <th className="px-3 py-2">Időszak</th>
              <th className="px-3 py-2">Típus</th>
              <th className="px-3 py-2">Számlázandó</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((k) => (
              <tr key={k.id ?? k.nev} className="border-b border-border">
                <td className="px-3 py-2">{k.nev}</td>
                <td className="px-3 py-2 font-semibold">{ft(k.osszeg)}</td>
                <td className="px-3 py-2">{k.datum ?? '—'}</td>
                <td className="px-3 py-2">{k.idoszak ?? '—'}</td>
                <td className="px-3 py-2">{k.tipus ?? '—'}</td>
                <td className="px-3 py-2">{k.szamlazando ? 'igen' : 'nem'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <KoltsegModal
        open={modal}
        mentes={mentes}
        onClose={() => setModal(false)}
        onSubmit={ujKoltseg}
      />
    </div>
  );
}

function KoltsegModal({
  open,
  mentes,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mentes: boolean;
  onClose: () => void;
  onSubmit: (k: Omit<ProjektKoltsegMeta, 'id'>) => Promise<void>;
}) {
  const [nev, setNev] = useState('');
  const [osszeg, setOsszeg] = useState('');
  const [datum, setDatum] = useState('');
  const [idoszak, setIdoszak] = useState('');
  const [tipus, setTipus] = useState<string>(KOLTSEG_TIPUSOK[0]);
  const [szamlazando, setSzamlazando] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  async function ment() {
    if (!nev.trim() || !osszeg.trim()) {
      setHiba('Töltsd ki a kötelező mezőket.');
      return;
    }
    setHiba(null);
    await onSubmit({
      nev: nev.trim(),
      osszeg: parseArInput(osszeg),
      datum,
      idoszak,
      tipus,
      szamlazando,
    });
    setNev('');
    setOsszeg('');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Költségek hozzáadása"
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
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={szamlazando} onChange={(e) => setSzamlazando(e.target.checked)} />
        Számlázandó?
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <FieldLabel required>Összeg</FieldLabel>
          <input className="field-input w-full" value={osszeg} onChange={(e) => setOsszeg(e.target.value)} />
        </label>
        <label>
          <FieldLabel required>Megnevezés</FieldLabel>
          <input className="field-input w-full" value={nev} onChange={(e) => setNev(e.target.value)} />
        </label>
        <label>
          <FieldLabel>Dátum</FieldLabel>
          <input className="field-input w-full" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>
        <label>
          <FieldLabel>Elszámolási időszak</FieldLabel>
          <input
            className="field-input w-full"
            value={idoszak}
            onChange={(e) => setIdoszak(e.target.value)}
            placeholder="2026-07"
          />
        </label>
        <label className="sm:col-span-2">
          <FieldLabel>Típus</FieldLabel>
          <select className="field-input w-full" value={tipus} onChange={(e) => setTipus(e.target.value)}>
            {KOLTSEG_TIPUSOK.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
}
