import { useMemo, useState } from 'react';
import {
  SZEREPKOROK,
  SZEREPLO_TIPUSOK,
  legutobbiTeljigFedezet,
  szamitSzereploKompenzacio,
  type ProjektMetaPayload,
} from '@coop/shared';
import type { ProjektSzereplo, UjSzereploInput } from '../../../api/coop';
import { BtnGhost, BtnPrimary, FieldLabel, Modal } from './Modal';
import { ft } from './utils';

type Props = {
  meta: ProjektMetaPayload;
  szereplok: ProjektSzereplo[];
  mentes: boolean;
  onHozzaad: (lista: UjSzereploInput[]) => Promise<void>;
  onTorol: (id: number) => Promise<void>;
};

function szamitKompenzacio(
  fedezet: number | null,
  s: ProjektSzereplo,
): string {
  if (fedezet === null) return '—';
  return ft(szamitSzereploKompenzacio(fedezet, s.reszesedes ?? 0, s.min_osszeg ?? 0));
}

export function ProjektSzereplokTab({ meta, szereplok, mentes, onHozzaad, onTorol }: Props) {
  const [modal, setModal] = useState(false);

  const legutobbiFedezet = useMemo(() => legutobbiTeljigFedezet(meta), [meta]);

  return (
    <div>
      {legutobbiFedezet !== null && (
        <div className="mb-3 rounded-lg border border-border bg-cream-muted px-3 py-2 text-xs text-text-body">
          A Kompenzáció oszlop a legutóbbi teljesítés igazolás fedezete ({ft(legutobbiFedezet)})
          alapján, a részesedés aránya szerint számolt érték (min. összeg figyelembevételével).
        </div>
      )}

      <div className="mb-3 flex justify-end">
        <BtnGhost sm onClick={() => setModal(true)}>
          + Új szereplők
        </BtnGhost>
      </div>

      {szereplok.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
          Ehhez a projekthez még nincs szereplő rendelve.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                <th className="px-3 py-2">Szereplő</th>
                <th className="px-3 py-2">Szerepkör</th>
                <th className="px-3 py-2">Érv. kezdete</th>
                <th className="px-3 py-2">Érv. vége</th>
                <th className="px-3 py-2">Típusa</th>
                <th className="px-3 py-2">Összeg</th>
                <th className="px-3 py-2">Min. összeg</th>
                <th className="px-3 py-2">Részesedés</th>
                <th className="px-3 py-2">Kompenzáció</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {szereplok.map((s) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-navy">{s.nev}</p>
                    {s.email && <p className="text-xs text-text-muted">{s.email}</p>}
                  </td>
                  <td className="px-3 py-2">{s.szerepkor ?? '—'}</td>
                  <td className="px-3 py-2">{s.erv_kezdete ?? '—'}</td>
                  <td className="px-3 py-2">{s.erv_vege || '—'}</td>
                  <td className="px-3 py-2">{s.tipus ?? '—'}</td>
                  <td className="px-3 py-2">{s.osszeg ?? 0}</td>
                  <td className="px-3 py-2">{s.min_osszeg ?? 0}</td>
                  <td className="px-3 py-2">{s.reszesedes ?? 0}%</td>
                  <td className="px-3 py-2 font-semibold">
                    {szamitKompenzacio(legutobbiFedezet, s)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-danger hover:underline"
                      disabled={mentes}
                      onClick={() => onTorol(s.id)}
                    >
                      törlés
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SzereploModal
        open={modal}
        mentes={mentes}
        onClose={() => setModal(false)}
        onSubmit={async (lista) => {
          await onHozzaad(lista);
          setModal(false);
        }}
      />
    </div>
  );
}

const uresSor = (): UjSzereploInput & { key: number } => ({
  key: Date.now() + Math.random(),
  nev: '',
  szerepkor: SZEREPKOROK[4],
  email: '',
  erv_kezdete: '',
  erv_vege: '',
  tipus: SZEREPLO_TIPUSOK[0],
  osszeg: 0,
  min_osszeg: 0,
  reszesedes: 0,
});

function SzereploModal({
  open,
  mentes,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mentes: boolean;
  onClose: () => void;
  onSubmit: (lista: UjSzereploInput[]) => Promise<void>;
}) {
  const [sorok, setSorok] = useState([uresSor()]);
  const [hiba, setHiba] = useState<string | null>(null);

  function ujSor() {
    setSorok([...sorok, uresSor()]);
  }

  function torolSor(key: number) {
    if (sorok.length <= 1) return;
    setSorok(sorok.filter((s) => s.key !== key));
  }

  function frissit(key: number, mezo: keyof UjSzereploInput, ertek: string | number) {
    setSorok(sorok.map((s) => (s.key === key ? { ...s, [mezo]: ertek } : s)));
  }

  async function ment() {
    const lista = sorok
      .filter((s) => s.nev.trim())
      .map(({ key: _k, ...rest }) => rest);
    if (!lista.length) {
      setHiba('Adj meg legalább egy szereplőt.');
      return;
    }
    setHiba(null);
    await onSubmit(lista);
    setSorok([uresSor()]);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Szereplők hozzáadása"
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
      <div className="space-y-4">
        {sorok.map((s) => (
          <div key={s.key} className="rounded-lg border border-border bg-cream-muted p-4">
            {sorok.length > 1 && (
              <button
                type="button"
                className="mb-2 text-xs text-danger hover:underline"
                onClick={() => torolSor(s.key)}
              >
                − Sor törlése
              </button>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <FieldLabel required>Szereplő</FieldLabel>
                <input
                  className="field-input w-full"
                  value={s.nev}
                  onChange={(e) => frissit(s.key, 'nev', e.target.value)}
                />
              </label>
              <label>
                <FieldLabel required>Szerepkör</FieldLabel>
                <select
                  className="field-input w-full"
                  value={s.szerepkor}
                  onChange={(e) => frissit(s.key, 'szerepkor', e.target.value)}
                >
                  {SZEREPKOROK.map((sk) => (
                    <option key={sk} value={sk}>
                      {sk}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>E-mail</FieldLabel>
                <input
                  className="field-input w-full"
                  type="email"
                  value={s.email}
                  onChange={(e) => frissit(s.key, 'email', e.target.value)}
                />
              </label>
              <label>
                <FieldLabel>Típusa</FieldLabel>
                <select
                  className="field-input w-full"
                  value={s.tipus}
                  onChange={(e) => frissit(s.key, 'tipus', e.target.value)}
                >
                  {SZEREPLO_TIPUSOK.map((t: (typeof SZEREPLO_TIPUSOK)[number]) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Érv. kezdete</FieldLabel>
                <input
                  className="field-input w-full"
                  placeholder="2026-06"
                  value={s.erv_kezdete}
                  onChange={(e) => frissit(s.key, 'erv_kezdete', e.target.value)}
                />
              </label>
              <label>
                <FieldLabel>Érv. vége</FieldLabel>
                <input
                  className="field-input w-full"
                  value={s.erv_vege}
                  onChange={(e) => frissit(s.key, 'erv_vege', e.target.value)}
                />
              </label>
              <label>
                <FieldLabel>Összeg</FieldLabel>
                <input
                  className="field-input w-full"
                  type="number"
                  value={s.osszeg}
                  onChange={(e) => frissit(s.key, 'osszeg', Number(e.target.value))}
                />
              </label>
              <label>
                <FieldLabel>Min. összeg</FieldLabel>
                <input
                  className="field-input w-full"
                  type="number"
                  value={s.min_osszeg}
                  onChange={(e) => frissit(s.key, 'min_osszeg', Number(e.target.value))}
                />
              </label>
              <label>
                <FieldLabel>Részesedés (%)</FieldLabel>
                <input
                  className="field-input w-full"
                  type="number"
                  value={s.reszesedes}
                  onChange={(e) => frissit(s.key, 'reszesedes', Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <BtnGhost sm onClick={ujSor}>
        + Sor hozzáadása
      </BtnGhost>
    </Modal>
  );
}
