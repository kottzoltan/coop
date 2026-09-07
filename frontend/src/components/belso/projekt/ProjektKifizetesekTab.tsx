import { useEffect, useState } from 'react';
import {
  KIFIZETES_STATUSZOK,
  nextMetaId,
  type ProjektKifizetesMeta,
  type ProjektMetaPayload,
} from '@coop/shared';
import { BtnGhost, BtnPrimary, FieldLabel, Modal } from './Modal';
import { ft, parseArInput } from './utils';

type Props = {
  meta: ProjektMetaPayload;
  mentes: boolean;
  onMentes: (meta: ProjektMetaPayload) => Promise<void>;
};

export function ProjektKifizetesekTab({ meta, mentes, onMentes }: Props) {
  const [modal, setModal] = useState(false);
  const [szerkesztId, setSzerkesztId] = useState<string | null>(null);
  const lista = meta.kifizetesek ?? [];

  function megnyitUj() {
    setSzerkesztId(null);
    setModal(true);
  }

  function megnyitSzerkeszt(k: ProjektKifizetesMeta) {
    setSzerkesztId(k.id ?? null);
    setModal(true);
  }

  async function mentKifizetes(kif: ProjektKifizetesMeta) {
    const next = [...lista];
    if (szerkesztId) {
      const idx = next.findIndex((x) => x.id === szerkesztId);
      if (idx >= 0) next[idx] = kif;
      else next.unshift(kif);
    } else {
      next.unshift(kif);
    }
    await onMentes({ ...meta, kifizetesek: next });
    setModal(false);
  }

  async function torol(id: string) {
    if (!confirm('Kifizetés törlése?')) return;
    await onMentes({
      ...meta,
      kifizetesek: lista.filter((k) => k.id !== id),
    });
  }

  const szerkesztett = szerkesztId ? lista.find((k) => k.id === szerkesztId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <BtnGhost sm onClick={megnyitUj}>
          + Új kifizetés
        </BtnGhost>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
          Nincs rögzített kifizetés.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                <th className="px-3 py-2">Témavezető</th>
                <th className="px-3 py-2">Számfejtési időszak</th>
                <th className="px-3 py-2">Teljesítési időszak</th>
                <th className="px-3 py-2">Diákok</th>
                <th className="px-3 py-2">Összeg</th>
                <th className="px-3 py-2">Státusz</th>
                <th className="px-3 py-2">Munkalap</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lista.map((k) => (
                <tr key={k.id ?? `${k.szf_idoszak}-${k.temavezeto}`} className="border-b border-border">
                  <td className="px-3 py-2">{k.temavezeto ?? '—'}</td>
                  <td className="px-3 py-2">{k.szf_idoszak ?? '—'}</td>
                  <td className="px-3 py-2">{k.teljesitesi_idoszak ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{k.diakok_szama ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold">
                    {k.osszesen != null ? ft(k.osszesen) : '—'}
                  </td>
                  <td className="px-3 py-2">{k.statusz ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-text-muted">{k.munkalap_azonosito ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => megnyitSzerkeszt(k)}
                      className="mr-2 text-xs font-semibold text-[#2C7BD6]"
                    >
                      Szerk.
                    </button>
                    {!k.munkalap_azonosito && k.id && (
                      <button
                        type="button"
                        onClick={() => torol(k.id!)}
                        className="text-xs font-semibold text-danger"
                      >
                        Törlés
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KifizetesModal
        open={modal}
        mentes={mentes}
        lista={lista}
        szerkesztett={szerkesztett}
        onClose={() => setModal(false)}
        onSubmit={mentKifizetes}
      />
    </div>
  );
}

function KifizetesModal({
  open,
  mentes,
  lista,
  szerkesztett,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mentes: boolean;
  lista: ProjektKifizetesMeta[];
  szerkesztett?: ProjektKifizetesMeta;
  onClose: () => void;
  onSubmit: (k: ProjektKifizetesMeta) => Promise<void>;
}) {
  const [temavezeto, setTemavezeto] = useState('');
  const [szfIdoszak, setSzfIdoszak] = useState('');
  const [teljIdoszak, setTeljIdoszak] = useState('');
  const [diakokSzama, setDiakokSzama] = useState('');
  const [osszesen, setOsszesen] = useState('');
  const [statusz, setStatusz] = useState<string>(KIFIZETES_STATUSZOK[0]);

  useEffect(() => {
    if (!open) return;
    setTemavezeto(szerkesztett?.temavezeto ?? '');
    setSzfIdoszak(szerkesztett?.szf_idoszak ?? '');
    setTeljIdoszak(szerkesztett?.teljesitesi_idoszak ?? '');
    setDiakokSzama(szerkesztett?.diakok_szama != null ? String(szerkesztett.diakok_szama) : '');
    setOsszesen(szerkesztett?.osszesen != null ? String(szerkesztett.osszesen) : '');
    setStatusz(szerkesztett?.statusz ?? KIFIZETES_STATUSZOK[0]);
  }, [open, szerkesztett]);

  async function handleSubmit() {
    const ossz = parseArInput(osszesen);
    const diak = diakokSzama ? Number(diakokSzama) : undefined;
    await onSubmit({
      id: szerkesztett?.id ?? nextMetaId(lista),
      temavezeto: temavezeto.trim() || undefined,
      szf_idoszak: szfIdoszak.trim() || undefined,
      teljesitesi_idoszak: teljIdoszak.trim() || undefined,
      diakok_szama: diak && !Number.isNaN(diak) ? diak : undefined,
      osszesen: ossz,
      statusz,
      munkalap_azonosito: szerkesztett?.munkalap_azonosito,
    });
  }

  return (
    <Modal
      open={open}
      title={szerkesztett ? 'Kifizetés szerkesztése' : 'Új kifizetés'}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="space-y-4"
      >
        <label className="block">
          <FieldLabel>Témavezető</FieldLabel>
          <input
            value={temavezeto}
            onChange={(e) => setTemavezeto(e.target.value)}
            className="field-input w-full"
            disabled={!!szerkesztett?.munkalap_azonosito}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Számfejtési időszak</FieldLabel>
            <input
              value={szfIdoszak}
              onChange={(e) => setSzfIdoszak(e.target.value)}
              placeholder="2026-07"
              className="field-input w-full"
              disabled={!!szerkesztett?.munkalap_azonosito}
            />
          </label>
          <label className="block">
            <FieldLabel>Teljesítési időszak</FieldLabel>
            <input
              value={teljIdoszak}
              onChange={(e) => setTeljIdoszak(e.target.value)}
              placeholder="2026-07"
              className="field-input w-full"
              disabled={!!szerkesztett?.munkalap_azonosito}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Diákok száma</FieldLabel>
            <input
              type="number"
              min={0}
              value={diakokSzama}
              onChange={(e) => setDiakokSzama(e.target.value)}
              className="field-input w-full"
            />
          </label>
          <label className="block">
            <FieldLabel>Összeg (Ft)</FieldLabel>
            <input
              value={osszesen}
              onChange={(e) => setOsszesen(e.target.value)}
              className="field-input w-full"
            />
          </label>
        </div>
        <label className="block">
          <FieldLabel>Státusz</FieldLabel>
          <select
            value={statusz}
            onChange={(e) => setStatusz(e.target.value)}
            className="field-input w-full"
          >
            {KIFIZETES_STATUSZOK.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {szerkesztett?.munkalap_azonosito && (
          <p className="text-xs text-text-muted">
            Munkalapból generált tétel: {szerkesztett.munkalap_azonosito}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <BtnGhost onClick={onClose}>Mégse</BtnGhost>
          <BtnPrimary onClick={() => void handleSubmit()} disabled={mentes}>
            Mentés
          </BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
