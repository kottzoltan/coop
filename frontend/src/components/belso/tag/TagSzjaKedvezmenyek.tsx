import { useState } from 'react';
import {
  SZJA_KEDVEZMENY_LABEL,
  SZJA_KEDVEZMENY_TIPUSOK,
  szjaKedvezmenyAktualisStatusz,
  type SzjaKedvezmeny,
  type SzovetkezetiTag,
} from '@coop/shared';

function statuszBadge(statusz: string) {
  const map: Record<string, string> = {
    aktív: 'bg-success-bg text-success',
    lejárt: 'bg-cream-muted text-text-muted',
    megszűnt: 'bg-danger-bg text-danger',
  };
  return map[statusz] ?? 'bg-cream-muted text-text-muted';
}

function ujKedvezmeny(): SzjaKedvezmeny {
  const ma = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    tipus: 'családi',
    adoeloleghonap: ma.slice(0, 7),
    ervenyes_tol: ma,
    ervenyes_ig: `${ma.slice(0, 4)}-12-31`,
    havi_adokedvezmeny: null,
    megjegyzes: null,
    statusz: 'aktív',
  };
}

type Props = {
  tag: SzovetkezetiTag;
  szerkeszt: boolean;
  onChange: (kedvezmenyek: SzjaKedvezmeny[]) => void;
};

export function TagSzjaKedvezmenyek({ tag, szerkeszt, onChange }: Props) {
  const [ujNyitva, setUjNyitva] = useState(false);
  const [szerkesztett, setSzerkesztett] = useState<SzjaKedvezmeny | null>(null);

  const lista = tag.szja_kedvezmenyek.map((k) => ({
    ...k,
    statusz: szjaKedvezmenyAktualisStatusz(k),
  }));

  function mentForm(k: SzjaKedvezmeny) {
    const friss = { ...k, statusz: szjaKedvezmenyAktualisStatusz(k) };
    const idx = tag.szja_kedvezmenyek.findIndex((x) => x.id === k.id);
    const ujak =
      idx >= 0
        ? tag.szja_kedvezmenyek.map((x) => (x.id === k.id ? friss : x))
        : [...tag.szja_kedvezmenyek, friss];
    onChange(ujak);
    setUjNyitva(false);
    setSzerkesztett(null);
  }

  function torol(id: string) {
    onChange(tag.szja_kedvezmenyek.filter((k) => k.id !== id));
  }

  function megszuntet(id: string) {
    onChange(
      tag.szja_kedvezmenyek.map((k) =>
        k.id === id ? { ...k, statusz: 'megszűnt' as const } : k,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        SZJA kedvezmények rögzítése tagonként (FK #05). Az adóelőleg-nyilatkozat formális helyességét
        a tag felelőssége — dupla igénybevételre figyelmeztess.
      </p>

      {lista.length === 0 ? (
        <p className="text-sm text-text-muted">Nincs rögzített SZJA kedvezmény.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-cream-muted text-left text-[11px] font-bold uppercase text-text-muted">
              <tr>
                <th className="px-3 py-2">Típus</th>
                <th className="px-3 py-2">Érvényes</th>
                <th className="px-3 py-2">Havi adókedvezmény</th>
                <th className="px-3 py-2">Státusz</th>
                {szerkeszt && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {lista.map((k) => (
                <tr key={k.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{SZJA_KEDVEZMENY_LABEL[k.tipus]}</td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {k.ervenyes_tol}
                    {k.ervenyes_ig ? ` → ${k.ervenyes_ig}` : ''}
                    {k.adoeloleghonap ? (
                      <span className="block">Adóelőleg: {k.adoeloleghonap}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {k.havi_adokedvezmeny != null
                      ? `${k.havi_adokedvezmeny.toLocaleString('hu-HU')} Ft`
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statuszBadge(k.statusz)}`}
                    >
                      {k.statusz}
                    </span>
                  </td>
                  {szerkeszt && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSzerkesztett(k)}
                        className="mr-2 text-xs font-semibold text-gold hover:underline"
                      >
                        Szerk.
                      </button>
                      {k.statusz === 'aktív' && (
                        <button
                          type="button"
                          onClick={() => megszuntet(k.id)}
                          className="mr-2 text-xs font-semibold text-text-muted hover:underline"
                        >
                          Megszüntet
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => torol(k.id)}
                        className="text-xs font-semibold text-danger hover:underline"
                      >
                        Töröl
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {szerkeszt && (
        <button
          type="button"
          onClick={() => {
            setSzerkesztett(ujKedvezmeny());
            setUjNyitva(true);
          }}
          className="rounded-btn border border-border px-3 py-2 text-sm font-semibold hover:bg-cream-muted"
        >
          + Új SZJA kedvezmény
        </button>
      )}

      {(ujNyitva || szerkesztett) && szerkesztett && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <form
            className="w-full max-w-md rounded-card border border-border bg-card p-5 shadow-lg"
            onSubmit={(e) => {
              e.preventDefault();
              mentForm(szerkesztett);
            }}
          >
            <h3 className="font-bold text-navy">
              {ujNyitva ? 'Új SZJA kedvezmény' : 'SZJA kedvezmény szerkesztése'}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Típus
                <select
                  className="field-input mt-1 w-full"
                  value={szerkesztett.tipus}
                  onChange={(e) =>
                    setSzerkesztett({
                      ...szerkesztett,
                      tipus: e.target.value as SzjaKedvezmeny['tipus'],
                    })
                  }
                >
                  {SZJA_KEDVEZMENY_TIPUSOK.map((t) => (
                    <option key={t} value={t}>
                      {SZJA_KEDVEZMENY_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Adóelőleg hónap (YYYY-MM)
                <input
                  type="month"
                  className="field-input mt-1 w-full"
                  value={szerkesztett.adoeloleghonap ?? ''}
                  onChange={(e) =>
                    setSzerkesztett({ ...szerkesztett, adoeloleghonap: e.target.value || null })
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Érvényes tól
                  <input
                    type="date"
                    required
                    className="field-input mt-1 w-full"
                    value={szerkesztett.ervenyes_tol}
                    onChange={(e) =>
                      setSzerkesztett({ ...szerkesztett, ervenyes_tol: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Érvényes ig
                  <input
                    type="date"
                    className="field-input mt-1 w-full"
                    value={szerkesztett.ervenyes_ig ?? ''}
                    onChange={(e) =>
                      setSzerkesztett({ ...szerkesztett, ervenyes_ig: e.target.value || null })
                    }
                  />
                </label>
              </div>
              <label className="block text-sm">
                Havi adókedvezmény (bruttó Ft)
                <input
                  type="number"
                  min={0}
                  className="field-input mt-1 w-full"
                  value={szerkesztett.havi_adokedvezmeny ?? ''}
                  onChange={(e) =>
                    setSzerkesztett({
                      ...szerkesztett,
                      havi_adokedvezmeny: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Megjegyzés
                <textarea
                  rows={2}
                  className="field-input mt-1 w-full"
                  value={szerkesztett.megjegyzes ?? ''}
                  onChange={(e) =>
                    setSzerkesztett({ ...szerkesztett, megjegyzes: e.target.value || null })
                  }
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUjNyitva(false);
                  setSzerkesztett(null);
                }}
                className="rounded-btn px-4 py-2 text-sm font-semibold text-text-muted"
              >
                Mégse
              </button>
              <button
                type="submit"
                className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
              >
                Mentés
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
