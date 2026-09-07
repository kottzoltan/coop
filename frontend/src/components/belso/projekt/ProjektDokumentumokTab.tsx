import { useMemo, useState } from 'react';
import {
  nextMetaId,
  PROJEKT_DOKUMENTUM_STATUSZOK,
  PROJEKT_DOKUMENTUM_TIPUSOK,
  type ProjektDokumentumMeta,
  type ProjektMetaPayload,
} from '@coop/shared';
import { dokumentumLetoltesUrl, feltoltDokumentum } from '../../../api/coop';
import { BtnGhost, BtnPrimary, FieldLabel, Modal } from './Modal';

type Props = {
  projektId: number;
  meta: ProjektMetaPayload;
  mentes: boolean;
  onMentes: (meta: ProjektMetaPayload) => Promise<void>;
};

export function ProjektDokumentumokTab({ projektId, meta, mentes, onMentes }: Props) {
  const [modal, setModal] = useState(false);
  const [tipusSzuro, setTipusSzuro] = useState('mind');
  const [statuszSzuro, setStatuszSzuro] = useState('mind');
  const [kijelolt, setKijelolt] = useState<Set<string>>(new Set());

  const lista = meta.dokumentumok ?? [];

  const szurt = useMemo(() => {
    return lista.filter((d) => {
      if (tipusSzuro !== 'mind' && (d.tipus ?? '') !== tipusSzuro) return false;
      if (statuszSzuro !== 'mind' && (d.statusz ?? '') !== statuszSzuro) return false;
      return true;
    });
  }, [lista, tipusSzuro, statuszSzuro]);

  async function ujDokumentum(d: ProjektDokumentumMeta) {
    await onMentes({ ...meta, dokumentumok: [d, ...lista] });
    setModal(false);
  }

  async function torolKijelolt() {
    if (!kijelolt.size) return;
    const marad = lista.filter((d) => !kijelolt.has(d.id ?? d.nev));
    await onMentes({ ...meta, dokumentumok: marad });
    setKijelolt(new Set());
  }

  function toggleKijelolt(id: string) {
    setKijelolt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <BtnPrimary onClick={() => setModal(true)}>
            ⇪ Projekt dokumentum feltöltés
          </BtnPrimary>
          <BtnGhost sm onClick={torolKijelolt} disabled={!kijelolt.size || mentes}>
            🗑 Kijelölt törlése
          </BtnGhost>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="field-input text-xs"
            value={tipusSzuro}
            onChange={(e) => setTipusSzuro(e.target.value)}
          >
            <option value="mind">Minden dokumentum típus</option>
            {PROJEKT_DOKUMENTUM_TIPUSOK.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="field-input text-xs"
            value={statuszSzuro}
            onChange={(e) => setStatuszSzuro(e.target.value)}
          >
            <option value="mind">Minden státusz</option>
            {PROJEKT_DOKUMENTUM_STATUSZOK.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
              <th className="px-3 py-2 w-8" />
              <th className="px-3 py-2">Státusz</th>
              <th className="px-3 py-2">Típus</th>
              <th className="px-3 py-2">Időszak</th>
              <th className="px-3 py-2">Feltöltő</th>
              <th className="px-3 py-2">Név</th>
              <th className="px-3 py-2">Méret</th>
              <th className="px-3 py-2">Feltöltve</th>
              <th className="px-3 py-2">Megjegyzés</th>
            </tr>
          </thead>
          <tbody>
            {szurt.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-text-muted">
                  Ehhez a projekthez még nincs feltöltött dokumentum.
                </td>
              </tr>
            ) : (
              szurt.map((d) => {
                const key = d.id ?? d.nev;
                return (
                  <tr key={key} className="border-t border-border">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={kijelolt.has(key)}
                        onChange={() => toggleKijelolt(key)}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs">{d.statusz ?? '—'}</td>
                    <td className="px-3 py-2">{d.tipus ?? '—'}</td>
                    <td className="px-3 py-2">{d.idoszak ?? '—'}</td>
                    <td className="px-3 py-2">{d.feltolto ?? '—'}</td>
                    <td className="px-3 py-2 font-medium text-navy">
                      {d.blob_key ? (
                        <a
                          href={dokumentumLetoltesUrl(d.blob_key)}
                          className="text-gold hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.nev}
                        </a>
                      ) : (
                        d.nev
                      )}
                    </td>
                    <td className="px-3 py-2">{d.meret ?? '—'}</td>
                    <td className="px-3 py-2">{d.feltoltve ?? '—'}</td>
                    <td className="px-3 py-2 text-text-muted">{d.megjegyzes ?? '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <DokumentumModal
        open={modal}
        mentes={mentes}
        projektId={projektId}
        onClose={() => setModal(false)}
        onSubmit={ujDokumentum}
        nextId={nextMetaId(lista)}
      />
    </div>
  );
}

function formatMeret(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<{ base64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1]! : result;
      resolve({ base64, contentType: file.type || 'application/octet-stream' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function DokumentumModal({
  open,
  mentes,
  projektId,
  onClose,
  onSubmit,
  nextId,
}: {
  open: boolean;
  mentes: boolean;
  projektId: number;
  onClose: () => void;
  onSubmit: (d: ProjektDokumentumMeta) => Promise<void>;
  nextId: string;
}) {
  const [nev, setNev] = useState('');
  const [tipus, setTipus] = useState<string>(PROJEKT_DOKUMENTUM_TIPUSOK[0]);
  const [idoszak, setIdoszak] = useState('');
  const [megjegyzes, setMegjegyzes] = useState('');
  const [fajl, setFajl] = useState<File | null>(null);
  const [feltoltes, setFeltoltes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  async function ment() {
    if (!fajl) {
      setHiba('Válassz fájlt a feltöltéshez.');
      return;
    }
    const fajlnev = nev.trim() || fajl.name;
    setHiba(null);
    setFeltoltes(true);
    try {
      const { base64, contentType } = await fileToBase64(fajl);
      const feltolt = await feltoltDokumentum({
        scope_id: projektId,
        scope: 'projekt',
        fajlnev,
        tartalom_base64: base64,
        content_type: contentType,
      });
      const ma = new Date().toISOString().slice(0, 10);
      await onSubmit({
        id: nextId,
        nev: fajlnev,
        tipus,
        statusz: 'Feltöltve',
        idoszak: idoszak || undefined,
        feltolto: 'Belső felhasználó',
        meret: formatMeret(fajl.size),
        feltoltve: ma,
        megjegyzes: megjegyzes || undefined,
        blob_key: feltolt.blob_key,
      });
      setNev('');
      setIdoszak('');
      setMegjegyzes('');
      setFajl(null);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Feltöltés sikertelen');
    } finally {
      setFeltoltes(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Projekt dokumentum feltöltése"
      footer={
        <>
          <BtnGhost onClick={onClose}>Mégse</BtnGhost>
          <BtnPrimary onClick={ment} disabled={mentes || feltoltes}>
            {feltoltes ? 'Feltöltés…' : 'Feltöltés'}
          </BtnPrimary>
        </>
      }
    >
      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}
      <div className="grid gap-3">
        <label>
          <FieldLabel required>Fájl</FieldLabel>
          <input
            type="file"
            className="field-input w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFajl(f);
              if (f && !nev) setNev(f.name);
            }}
          />
          {fajl && (
            <p className="mt-1 text-xs text-text-muted">
              {fajl.name} · {formatMeret(fajl.size)}
            </p>
          )}
        </label>
        <label>
          <FieldLabel>Megjelenített név</FieldLabel>
          <input className="field-input w-full" value={nev} onChange={(e) => setNev(e.target.value)} placeholder="opcionális, alapból a fájlnév" />
        </label>
        <label>
          <FieldLabel>Típus</FieldLabel>
          <select className="field-input w-full" value={tipus} onChange={(e) => setTipus(e.target.value)}>
            {PROJEKT_DOKUMENTUM_TIPUSOK.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel>Időszak</FieldLabel>
          <input
            className="field-input w-full"
            placeholder="pl. 2026-06"
            value={idoszak}
            onChange={(e) => setIdoszak(e.target.value)}
          />
        </label>
        <label>
          <FieldLabel>Megjegyzés</FieldLabel>
          <input className="field-input w-full" value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
