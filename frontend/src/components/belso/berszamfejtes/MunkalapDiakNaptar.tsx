import { useEffect, useMemo, useState } from 'react';
import { orakKozott, type MunkalapDiak } from '@coop/shared';

const HET_NAPOK = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

type BerKod = { id?: string; ar?: number; nev?: string };

type Props = {
  szfIdoszak: string;
  diak: MunkalapDiak;
  berKodok: BerKod[];
  szerkesztheto: boolean;
  onMentes: (diak: MunkalapDiak) => Promise<void>;
};

function napokSzama(yyyymm: string): number {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

function hetNapja(yyyymm: string, nap: number): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return HET_NAPOK[new Date(y, m - 1, nap).getDay()];
}

export function MunkalapDiakNaptar({
  szfIdoszak,
  diak,
  berKodok,
  szerkesztheto,
  onMentes,
}: Props) {
  const [idoadatok, setIdoadatok] = useState(diak.idoadatok ?? {});
  const [ment, setMent] = useState(false);
  const [naptarNyitva, setNaptarNyitva] = useState(false);
  const [kijeloltNapok, setKijeloltNapok] = useState<number[]>([]);
  const [bulkKod, setBulkKod] = useState('');
  const [bulkTol, setBulkTol] = useState('');
  const [bulkIg, setBulkIg] = useState('');

  useEffect(() => {
    setIdoadatok(diak.idoadatok ?? {});
  }, [diak.student_id, diak.idoadatok]);

  const napok = useMemo(() => napokSzama(szfIdoszak), [szfIdoszak]);
  const defaultKod = berKodok[0]?.id ?? '1';

  useEffect(() => {
    setBulkKod(defaultKod);
  }, [defaultKod]);

  function frissitNap(nap: number, mezo: 'kod' | 'tol' | 'ig', ertek: string) {
    setIdoadatok((prev) => {
      const key = String(nap);
      const elozo = prev[key] ?? { kod: defaultKod, tol: '', ig: '' };
      return { ...prev, [key]: { ...elozo, [mezo]: ertek } };
    });
  }

  async function mentes() {
    setMent(true);
    try {
      await onMentes({ ...diak, idoadatok });
    } finally {
      setMent(false);
    }
  }

  function toggleNap(nap: number) {
    setKijeloltNapok((prev) =>
      prev.includes(nap) ? prev.filter((n) => n !== nap) : [...prev, nap].sort((a, b) => a - b),
    );
  }

  function naptarAlkalmaz() {
    if (!kijeloltNapok.length) return;
    setIdoadatok((prev) => {
      const next = { ...prev };
      for (const nap of kijeloltNapok) {
        next[String(nap)] = { kod: bulkKod || defaultKod, tol: bulkTol, ig: bulkIg };
      }
      return next;
    });
    setNaptarNyitva(false);
  }

  let osszOra = 0;
  let osszBrutto = 0;
  const kodAr = (id?: string) => berKodok.find((k) => k.id === id)?.ar ?? 0;

  const sorok = [];
  for (let nap = 1; nap <= napok; nap++) {
    const e = idoadatok[String(nap)];
    const h = orakKozott(e?.tol, e?.ig);
    osszOra += h;
    osszBrutto += h * kodAr(e?.kod ?? defaultKod);
    const hetvege = hetNapja(szfIdoszak, nap) === 'V' || hetNapja(szfIdoszak, nap) === 'Szo';
    sorok.push(
      <tr key={nap} className={hetvege ? 'bg-cream-muted/60' : ''}>
        <td className="px-2 py-1 tabular-nums">{nap}</td>
        <td className="px-2 py-1 text-xs text-text-muted">{hetNapja(szfIdoszak, nap)}</td>
        <td className="px-2 py-1">
          <select
            disabled={!szerkesztheto}
            value={e?.kod ?? ''}
            onChange={(ev) => frissitNap(nap, 'kod', ev.target.value)}
            className="w-full min-w-[120px] rounded border border-border-input px-1 py-0.5 text-xs"
          >
            <option value="">—</option>
            {berKodok.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nev ?? k.id} ({k.ar} Ft)
              </option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1">
          <input
            type="time"
            disabled={!szerkesztheto}
            value={e?.tol ?? ''}
            onChange={(ev) => frissitNap(nap, 'tol', ev.target.value)}
            className="w-full rounded border border-border-input px-1 py-0.5 text-xs"
          />
        </td>
        <td className="px-2 py-1">
          <input
            type="time"
            disabled={!szerkesztheto}
            value={e?.ig ?? ''}
            onChange={(ev) => frissitNap(nap, 'ig', ev.target.value)}
            className="w-full rounded border border-border-input px-1 py-0.5 text-xs"
          />
        </td>
        <td className="px-2 py-1 text-right tabular-nums text-xs">
          {e?.tol && e?.ig ? h.toFixed(1) : '—'}
        </td>
      </tr>,
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-cream-muted/30 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-navy">
          Havi naptár — {szfIdoszak} · {osszOra.toFixed(1)} óra ·{' '}
          {Math.round(osszBrutto).toLocaleString('hu-HU')} Ft bruttó
        </span>
        <div className="flex flex-wrap gap-2">
          {szerkesztheto && (
            <button
              type="button"
              onClick={() => setNaptarNyitva(true)}
              className="rounded-btn border border-border px-3 py-1 text-xs font-semibold text-navy"
            >
              Jelenléti naptár
            </button>
          )}
          {szerkesztheto && (
            <button
              type="button"
              disabled={ment}
              onClick={mentes}
              className="rounded-btn bg-navy px-3 py-1 text-xs font-semibold text-cream disabled:opacity-50"
            >
              {ment ? 'Mentés…' : 'Naptár mentése'}
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-muted text-left text-[10px] uppercase text-text-muted">
            <tr>
              <th className="px-2 py-1">Nap</th>
              <th className="px-2 py-1">Hét</th>
              <th className="px-2 py-1">Kifizetési kód</th>
              <th className="px-2 py-1">Kezdet</th>
              <th className="px-2 py-1">Vége</th>
              <th className="px-2 py-1 text-right">Óra</th>
            </tr>
          </thead>
          <tbody>{sorok}</tbody>
        </table>
      </div>
      {naptarNyitva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-card border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-navy">Jelenléti naptár</h3>
                <p className="text-sm text-text-muted">
                  Tömeges kitöltés a kijelölt napokra a {szfIdoszak} időszakban.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNaptarNyitva(false)}
                className="text-sm text-text-muted"
              >
                Mégse
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold uppercase text-text-muted">
                Kifizetési kód
                <select
                  value={bulkKod}
                  onChange={(e) => setBulkKod(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
                >
                  {berKodok.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nev ?? k.id} ({k.ar} Ft)
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase text-text-muted">
                Kezdet
                <input
                  type="time"
                  value={bulkTol}
                  onChange={(e) => setBulkTol(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-text-muted">
                Vége
                <input
                  type="time"
                  value={bulkIg}
                  onChange={(e) => setBulkIg(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-text-muted">{kijeloltNapok.length} nap kijelölve</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKijeloltNapok(Array.from({ length: napok }, (_, i) => i + 1))}
                  className="rounded-btn border px-3 py-1 text-xs"
                >
                  Mind kijelölése
                </button>
                <button
                  type="button"
                  onClick={() => setKijeloltNapok([])}
                  className="rounded-btn border px-3 py-1 text-xs"
                >
                  Kijelölés törlése
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {Array.from({ length: napok }, (_, i) => i + 1).map((nap) => {
                const aktiv = kijeloltNapok.includes(nap);
                return (
                  <button
                    key={nap}
                    type="button"
                    onClick={() => toggleNap(nap)}
                    className={`rounded-btn border px-2 py-2 text-sm font-semibold ${
                      aktiv ? 'border-navy bg-navy text-cream' : 'border-border bg-card text-navy'
                    }`}
                  >
                    {nap}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setNaptarNyitva(false)} className="rounded-btn border px-4 py-2 text-sm">
                Mégse
              </button>
              <button
                type="button"
                disabled={!kijeloltNapok.length || !bulkTol || !bulkIg}
                onClick={naptarAlkalmaz}
                className="rounded-btn bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Kitöltés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
