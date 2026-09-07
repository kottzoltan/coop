import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MuveletekMenu } from '../../components/belso/MuveletekMenu';
import { letoltRiport } from '../../utils/riport';

type Hozzaferes = 'nincs' | 'olvasas' | 'iras';

type PartnerSor = {
  id: number;
  cegnev: string;
  adoszam: string;
  kapcsolat_nev: string | null;
  email: string;
  telefon: string | null;
  statusz: string;
  hozzaferes: Hozzaferes;
  portal_aktiv: boolean;
  ice_aktiv: boolean | null;
  letrehozva: string | null;
};

const STATUSZ_SZIN: Record<string, string> = {
  függőben: 'bg-warning-bg text-warning',
  jóváhagyva: 'bg-success-bg text-success',
  elutasitva: 'bg-danger-bg text-danger',
};

const HOZZAFERES_LABEL: Record<Hozzaferes, string> = {
  nincs: 'Nincs portál',
  olvasas: 'Olvasás',
  iras: 'Írás',
};

const SZUROK = [
  ['mind', 'Mind'],
  ['függőben', 'Függőben'],
  ['jóváhagyva', 'Jóváhagyva'],
  ['elutasitva', 'Elutasítva'],
] as const;

export function PartnerRegisztraciokPage() {
  const { loading } = useAuth();
  const [sorok, setSorok] = useState<PartnerSor[]>([]);
  const [szuro, setSzuro] = useState<(typeof SZUROK)[number][0]>('mind');
  const [hiba, setHiba] = useState<string | null>(null);
  const [toltes, setToltes] = useState(true);
  const [riportToltes, setRiportToltes] = useState(false);
  const [mentesId, setMentesId] = useState<number | null>(null);

  async function betolt() {
    setHiba(null);
    setToltes(true);
    try {
      const q = szuro !== 'mind' ? `?statusz=${encodeURIComponent(szuro)}` : '';
      const res = await fetch(`/api/belso-partner-regisztraciok${q}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { hiba?: string }).hiba ?? 'Betöltés sikertelen');
      }
      setSorok((json as { sorok?: PartnerSor[] }).sorok ?? []);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    betolt().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, szuro]);

  async function patch(id: number, data: Record<string, unknown>) {
    setMentesId(id);
    setHiba(null);
    const res = await fetch('/api/belso-partner-regisztraciok', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    const json = await res.json().catch(() => ({}));
    setMentesId(null);
    if (!res.ok) {
      setHiba((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
      return;
    }
    await betolt();
  }

  return (
    <div className="h-screen overflow-auto bg-page-bg p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Partner jelentkezések</h1>
          <p className="mt-1 text-sm text-text-muted">
            Önkiszolgáló regisztrációk és meghívott partnerek portál hozzáférése.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MuveletekMenu
            muveletek={[
              {
                label: 'Partner regisztrációk export (CSV)',
                onClick: async () => {
                  setRiportToltes(true);
                  try {
                    await letoltRiport('partner-regisztraciok');
                  } catch (e) {
                    setHiba(e instanceof Error ? e.message : 'Riport hiba');
                  } finally {
                    setRiportToltes(false);
                  }
                },
                disabled: riportToltes,
              },
            ]}
          />
          <Link
            to="/belso/partner-meghivok"
            className="text-sm font-semibold text-[#2C7BD6] hover:underline"
          >
            Meghívók →
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SZUROK.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSzuro(id)}
            className={`rounded-btn px-3 py-1.5 text-xs font-semibold ${
              szuro === id
                ? 'bg-navy text-white'
                : 'border border-border bg-card text-navy hover:bg-cream-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {hiba && <p className="mb-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}

      {toltes ? (
        <p className="mt-6 text-sm text-text-muted">Betöltés…</p>
      ) : sorok.length === 0 ? (
        <div className="mt-6 rounded-card border border-border bg-card p-8 text-center text-sm text-text-muted">
          Nincs megjeleníthető partner regisztráció ebben a szűrőben.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                <th className="px-4 py-3">Cégnév</th>
                <th className="px-4 py-3">Kapcsolat</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Státusz</th>
                <th className="px-4 py-3">Portál jog</th>
                <th className="px-4 py-3">Aktív</th>
                <th className="px-4 py-3">Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((s) => {
                const jovahagyott = s.statusz === 'jóváhagyva';
                const fuggoben = s.statusz === 'függőben';
                return (
                  <tr key={s.id} className="border-b border-border hover:bg-cream-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy">{s.cegnev}</div>
                      <div className="text-xs text-text-muted">{s.adoszam}</div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{s.kapcsolat_nev ?? '—'}</td>
                    <td className="px-4 py-3">{s.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUSZ_SZIN[s.statusz] ?? 'bg-cream-muted text-text-muted'
                        }`}
                      >
                        {s.statusz}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={s.hozzaferes}
                        disabled={!jovahagyott || mentesId === s.id}
                        onChange={(e) =>
                          patch(s.id, { hozzaferes: e.target.value as Hozzaferes })
                        }
                        className="rounded border border-border bg-card px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {(Object.keys(HOZZAFERES_LABEL) as Hozzaferes[]).map((k) => (
                          <option key={k} value={k}>
                            {HOZZAFERES_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {jovahagyott ? (
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={s.portal_aktiv}
                            disabled={s.hozzaferes === 'nincs' || mentesId === s.id}
                            onChange={(e) => patch(s.id, { portal_aktiv: e.target.checked })}
                          />
                          {s.portal_aktiv ? 'Aktív' : 'Inaktív'}
                        </label>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {fuggoben && (
                          <>
                            <button
                              type="button"
                              disabled={mentesId === s.id}
                              onClick={() => patch(s.id, { statusz: 'jóváhagyva', hozzaferes: 'iras' })}
                              className="rounded-btn bg-success-bg px-3 py-1.5 text-xs font-bold text-success disabled:opacity-50"
                            >
                              Jóváhagyás
                            </button>
                            <button
                              type="button"
                              disabled={mentesId === s.id}
                              onClick={() => patch(s.id, { statusz: 'elutasitva' })}
                              className="rounded-btn bg-danger-bg px-3 py-1.5 text-xs font-bold text-danger disabled:opacity-50"
                            >
                              Elutasítás
                            </button>
                          </>
                        )}
                        {jovahagyott && !s.portal_aktiv && s.hozzaferes !== 'nincs' && (
                          <button
                            type="button"
                            disabled={mentesId === s.id}
                            onClick={() => patch(s.id, { portal_aktiv: true })}
                            className="rounded-btn border border-border px-3 py-1.5 text-xs font-semibold text-navy"
                          >
                            Újraaktiválás
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
