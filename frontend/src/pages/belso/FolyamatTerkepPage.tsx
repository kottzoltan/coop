import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FOLYAMAT_SAV_LABEL,
  type FolyamatSav,
} from '@coop/shared';
import {
  getFolyamatTerkep,
  getFolyamatTerkepReszlet,
  type FolyamatTerkepCsomo,
  type FolyamatTerkepEl,
  type FolyamatTerkepTeendo,
} from '../../api/coop';

const SAV_REND: FolyamatSav[] = ['partner', 'diak', 'pv', 'toborzas'];

function sorCimke(sor: Record<string, unknown>): string {
  const nev =
    (sor.diak_nev as string) ||
    (sor.nev as string) ||
    (sor.cim as string) ||
    (sor.muszak_cim as string) ||
    `#${sor.id}`;
  const extra =
    (sor.partner_cegnev as string) ||
    (sor.projekt_azonosito as string) ||
    (sor.hirdetes_cim as string) ||
    (sor.varos as string) ||
    '';
  return extra ? `${nev} · ${extra}` : String(nev);
}

export function FolyamatTerkepPage() {
  const [csomok, setCsomok] = useState<FolyamatTerkepCsomo[]>([]);
  const [elek, setElek] = useState<FolyamatTerkepEl[]>([]);
  const [teendok, setTeendok] = useState<FolyamatTerkepTeendo[]>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [kivalasztott, setKivalasztott] = useState<string | null>(null);
  const [reszletToltes, setReszletToltes] = useState(false);
  const [reszletHiba, setReszletHiba] = useState<string | null>(null);
  const [reszletSorok, setReszletSorok] = useState<Array<Record<string, unknown>>>([]);
  const [reszletMeta, setReszletMeta] = useState<FolyamatTerkepCsomo | null>(null);

  useEffect(() => {
    setToltes(true);
    getFolyamatTerkep()
      .then((d) => {
        setCsomok(d.csomok);
        setElek(d.elek);
        setTeendok(d.teendok);
      })
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Betöltés sikertelen'))
      .finally(() => setToltes(false));
  }, []);

  const csomoById = useMemo(() => {
    const m = new Map<string, FolyamatTerkepCsomo>();
    for (const c of csomok) m.set(c.id, c);
    return m;
  }, [csomok]);

  const savCsoportok = useMemo(() => {
    return SAV_REND.map((sav) => ({
      sav,
      label: FOLYAMAT_SAV_LABEL[sav],
      csomok: csomok.filter((c) => c.sav === sav),
    })).filter((g) => g.csomok.length > 0);
  }, [csomok]);

  const kivalasztottElek = useMemo(() => {
    if (!kivalasztott) return [];
    return elek.filter((e) => e.from === kivalasztott || e.to === kivalasztott);
  }, [elek, kivalasztott]);

  async function csomoKatt(id: string) {
    setKivalasztott(id);
    setReszletToltes(true);
    setReszletHiba(null);
    try {
      const d = await getFolyamatTerkepReszlet(id);
      setReszletMeta(d.csomopont);
      setReszletSorok(d.sorok);
    } catch (e) {
      setReszletMeta(csomoById.get(id) ?? null);
      setReszletSorok([]);
      setReszletHiba(e instanceof Error ? e.message : 'Részlet betöltése sikertelen');
    } finally {
      setReszletToltes(false);
    }
  }

  return (
    <div className="min-h-screen overflow-auto bg-page-bg p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Folyamat-térkép</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            A Coop által kezelt use case-ek, döntési pontok és élő státuszszámok. Kattints egy
            csomópontra a jelenlegi sorokhoz.
          </p>
        </div>
        <Link
          to="/belso/pv-munkaterulet"
          className="rounded-btn border border-border bg-card px-3 py-2 text-xs font-semibold text-navy hover:bg-cream-muted"
        >
          PV munkaterület →
        </Link>
      </div>

      {teendok.length > 0 && (
        <div className="mb-5 rounded-card border border-gold/40 bg-card p-4">
          <h2 className="text-sm font-bold text-navy">Teendőid (PV scope)</h2>
          <ul className="mt-3 space-y-2">
            {teendok.map((t) => (
              <li key={t.id}>
                <Link
                  to={t.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:border-gold"
                >
                  <span className="font-semibold text-navy">{t.cim}</span>
                  <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-xs font-bold text-navy">
                    {t.db}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hiba && <p className="mb-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}
      {toltes && <p className="text-sm text-text-muted">Betöltés…</p>}

      {!toltes && !hiba && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {savCsoportok.map((g) => (
              <section key={g.sav} className="rounded-card border border-border bg-card p-4">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gold">
                  {g.label}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {g.csomok.map((c) => {
                    const aktiv = kivalasztott === c.id;
                    const van = c.count > 0;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => csomoKatt(c.id)}
                        className={[
                          'min-w-[160px] max-w-[220px] flex-1 rounded-lg border px-3 py-3 text-left transition',
                          aktiv
                            ? 'border-navy bg-navy text-white'
                            : van
                              ? 'border-gold/50 bg-[#FBF8F1] hover:border-gold'
                              : 'border-border bg-cream-muted/40 text-text-muted hover:border-border-input',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-bold ${aktiv ? 'text-white' : 'text-navy'}`}>
                            {c.label}
                          </span>
                          <span
                            className={[
                              'rounded-full px-2 py-0.5 text-[11px] font-bold',
                              aktiv
                                ? 'bg-white/20 text-white'
                                : van
                                  ? 'bg-gold/30 text-navy'
                                  : 'bg-cream-muted text-text-muted',
                            ].join(' ')}
                          >
                            {c.count}
                          </span>
                        </div>
                        <p className={`mt-1.5 text-[11px] leading-snug ${aktiv ? 'text-white/75' : 'text-text-muted'}`}>
                          {c.leiras}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            <section className="rounded-card border border-border bg-card p-4">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gold">
                Döntési pontok / átmenetek
              </h2>
              <ul className="space-y-2">
                {elek.map((e, i) => {
                  const from = csomoById.get(e.from);
                  const to = csomoById.get(e.to);
                  const kiemelt =
                    kivalasztott && (e.from === kivalasztott || e.to === kivalasztott);
                  return (
                    <li
                      key={`${e.from}-${e.to}-${i}`}
                      className={[
                        'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                        kiemelt ? 'border-gold bg-[#FBF8F1]' : 'border-border',
                      ].join(' ')}
                    >
                      <span className="font-semibold text-navy">{from?.label ?? e.from}</span>
                      <span className="text-text-muted">→</span>
                      <span className="font-semibold text-navy">{to?.label ?? e.to}</span>
                      <span
                        className={[
                          'rounded px-1.5 py-0.5',
                          e.dontes ? 'bg-warning-bg text-warning' : 'bg-cream-muted text-text-muted',
                        ].join(' ')}
                      >
                        {e.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <aside className="rounded-card border border-border bg-card p-4 lg:sticky lg:top-6 lg:self-start">
            {!kivalasztott && (
              <p className="text-sm text-text-muted">
                Válassz egy csomópontot a bal oldalon — megjelennek az élő sorok és a kapcsolódó
                döntések.
              </p>
            )}
            {kivalasztott && (
              <>
                <h2 className="text-sm font-bold text-navy">
                  {reszletMeta?.label ?? csomoById.get(kivalasztott)?.label}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {reszletMeta?.leiras ?? csomoById.get(kivalasztott)?.leiras}
                </p>
                {(reszletMeta?.href || csomoById.get(kivalasztott)?.href) && (
                  <Link
                    to={reszletMeta?.href ?? csomoById.get(kivalasztott)!.href}
                    className="mt-3 inline-flex rounded-btn border border-navy bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Ugrás a felületre →
                  </Link>
                )}

                {kivalasztottElek.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Kapcsolódó döntések
                    </p>
                    <ul className="mt-2 space-y-1">
                      {kivalasztottElek.map((e, i) => (
                        <li key={i} className="text-xs text-text-body">
                          {e.dontes ? '• ' : '· '}
                          {e.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Élő sorok
                  </p>
                  {reszletToltes && <p className="mt-2 text-xs text-text-muted">Betöltés…</p>}
                  {reszletHiba && (
                    <p className="mt-2 text-xs text-danger">{reszletHiba}</p>
                  )}
                  {!reszletToltes && !reszletHiba && reszletSorok.length === 0 && (
                    <p className="mt-2 text-xs text-text-muted">Nincs sor ebben az állapotban.</p>
                  )}
                  <ul className="mt-2 max-h-[420px] space-y-2 overflow-y-auto">
                    {reszletSorok.map((sor, i) => {
                      const href = typeof sor.href === 'string' ? sor.href : null;
                      const body = (
                        <>
                          <span className="font-semibold text-navy">{sorCimke(sor)}</span>
                          {sor.statusz != null && (
                            <span className="mt-0.5 block text-[11px] text-text-muted">
                              {String(sor.statusz)}
                              {sor.muszak_datum != null ? ` · ${String(sor.muszak_datum).slice(0, 10)}` : ''}
                            </span>
                          )}
                        </>
                      );
                      return (
                        <li key={String(sor.id ?? i)}>
                          {href ? (
                            <Link
                              to={href}
                              className="block rounded-lg border border-border px-2.5 py-2 text-xs hover:border-gold"
                            >
                              {body}
                            </Link>
                          ) : (
                            <div className="rounded-lg border border-border px-2.5 py-2 text-xs">
                              {body}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
