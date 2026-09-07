import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPvMunkaterulet,
  pvJelenletElutasitas,
  pvJelenletVeglegesites,
  pvMegrendelesVisszaigazolas,
  type PvFolyamatPartner,
  type PvJelenletSor,
  type PvMegrendelesSor,
} from '../../api/coop';
import { JELENLET_STATUSZ_LABEL, JELENLET_STATUSZ_SZIN } from '@coop/shared';

type Tab = 'folyamat' | 'megrendelesek' | 'jelenletek' | 'veglegesitett';

function fazisSzin(fazis: string) {
  if (fazis.includes('PV')) return 'bg-gold/20 text-navy';
  if (fazis.includes('Partner')) return 'bg-warning-bg text-warning';
  if (fazis.includes('Beosztás')) return 'bg-success-bg text-success';
  if (fazis.includes('nélküli')) return 'bg-cream-muted text-text-body';
  return 'bg-cream-muted text-text-muted';
}

function formatIdo(iso: string | Date | null | undefined) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('hu-HU', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function KpiKartya({
  label,
  ertek,
  hint,
  accent,
}: {
  label: string;
  ertek: number;
  hint: string;
  accent: string;
}) {
  return (
    <div className={`rounded-card border border-border bg-card p-4 shadow-sm ${accent}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-3xl font-bold text-navy">{ertek}</div>
      <div className="mt-1 text-xs text-text-muted">{hint}</div>
    </div>
  );
}

export function PvMunkateruletPage() {
  const [tab, setTab] = useState<Tab>('folyamat');
  const [szamok, setSzamok] = useState<Record<string, number>>({});
  const [megrendelesek, setMegrendelesek] = useState<PvMegrendelesSor[]>([]);
  const [jelenletek, setJelenletek] = useState<PvJelenletSor[]>([]);
  const [veglegesitett, setVeglegesitett] = useState<PvJelenletSor[]>([]);
  const [folyamat, setFolyamat] = useState<PvFolyamatPartner[]>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [mentesId, setMentesId] = useState<number | null>(null);
  const [kereses, setKereses] = useState('');
  const [kivalasztott, setKivalasztott] = useState<Set<number>>(new Set());

  async function betolt() {
    setToltes(true);
    setHiba(null);
    try {
      const settled = await Promise.allSettled([
        getPvMunkaterulet('osszesito'),
        getPvMunkaterulet('megrendelesek'),
        getPvMunkaterulet('jelenletek', { statusz: 'partner_jóváhagyva' }),
        getPvMunkaterulet('jelenletek', { statusz: 'pv_véglegesített' }),
        getPvMunkaterulet('folyamat'),
      ]);

      const [o, m, j, v, f] = settled;
      const hibak: string[] = [];

      if (o.status === 'fulfilled') setSzamok(o.value.szamok ?? {});
      else hibak.push(`Összesítő: ${o.reason instanceof Error ? o.reason.message : 'hiba'}`);

      if (m.status === 'fulfilled') setMegrendelesek((m.value.sorok ?? []) as PvMegrendelesSor[]);
      else hibak.push(`Megrendelések: ${m.reason instanceof Error ? m.reason.message : 'hiba'}`);

      if (j.status === 'fulfilled') setJelenletek((j.value.sorok ?? []) as PvJelenletSor[]);
      else hibak.push(`Jelenlétek: ${j.reason instanceof Error ? j.reason.message : 'hiba'}`);

      if (v.status === 'fulfilled') setVeglegesitett((v.value.sorok ?? []) as PvJelenletSor[]);
      else hibak.push(`Véglegesítettek: ${v.reason instanceof Error ? v.reason.message : 'hiba'}`);

      if (f.status === 'fulfilled') setFolyamat(f.value.partnerek ?? []);
      else hibak.push(`Folyamat: ${f.reason instanceof Error ? f.reason.message : 'hiba'}`);

      if (hibak.length) setHiba(hibak.join(' · '));
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Betöltés sikertelen');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => null);
  }, []);

  const lista = tab === 'megrendelesek' ? null : tab === 'jelenletek' ? jelenletek : veglegesitett;

  const teendok = useMemo(
    () =>
      (
        [
          {
            cim: 'Megrendelés visszaigazolása',
            db: szamok.megrendeles_piszkozat ?? 0,
            tab: 'megrendelesek' as Tab,
            leiras: 'Piszkozat műszak vár publikálásra',
          },
          {
            cim: 'Jelenlét véglegesítése',
            db: szamok.jelenlet_partner_jovahagyva ?? 0,
            tab: 'jelenletek' as Tab,
            leiras: 'Partner által jóváhagyott sorok',
          },
          {
            cim: 'Rögzített jelenlét bírálata',
            db: szamok.jelenlet_rogzitett ?? 0,
            tab: 'folyamat' as Tab,
            leiras: 'Partner még nem bírálta — közvetlenül is véglegesíthető',
          },
        ] as const
      ).filter((t) => t.db > 0),
    [szamok],
  );

  const szurtJelenletek = useMemo(() => {
    if (!lista) return [];
    const q = kereses.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (s) =>
        s.diak_nev.toLowerCase().includes(q) ||
        (s.projekt_azonosito ?? '').toLowerCase().includes(q) ||
        (s.partner_cegnev ?? '').toLowerCase().includes(q),
    );
  }, [lista, kereses]);

  async function megrendelesOk(muszakId: number) {
    setMentesId(muszakId);
    try {
      await pvMegrendelesVisszaigazolas(muszakId);
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentesId(null);
    }
  }

  async function veglegesit(id: number) {
    setMentesId(id);
    try {
      await pvJelenletVeglegesites(id);
      setKivalasztott((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentesId(null);
    }
  }

  async function elutasit(id: number) {
    setMentesId(id);
    try {
      await pvJelenletElutasitas(id, 'PV elutasította');
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentesId(null);
    }
  }

  async function tomegesVeglegesites() {
    const ids = [...kivalasztott];
    for (const id of ids) {
      await veglegesit(id);
    }
  }

  function toggleMind() {
    if (kivalasztott.size === szurtJelenletek.length) {
      setKivalasztott(new Set());
      return;
    }
    setKivalasztott(new Set(szurtJelenletek.map((s) => s.jelenlet.id)));
  }

  return (
    <div className="h-screen overflow-auto bg-page-bg p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Projektvezetői munkaterület</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Megrendelések visszaigazolása, partner által jóváhagyott jelenlétek véglegesítése. A
            véglegesített sorok a bérszámfejtéshez kerülnek.
          </p>
        </div>
        <Link
          to="/belso/berszamfejtes/jelenletek"
          className="rounded-btn border border-border bg-card px-3 py-2 text-xs font-semibold text-navy hover:bg-cream-muted"
        >
          Bérszámfejtés → Jelenlétek
        </Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiKartya
          label="Piszkozat megrendelés"
          ertek={szamok.megrendeles_piszkozat ?? 0}
          hint="Visszaigazolásra vár"
          accent="border-l-4 border-l-warning"
        />
        <KpiKartya
          label="Rögzített jelenlét"
          ertek={szamok.jelenlet_rogzitett ?? 0}
          hint="Partner még nem bírálta"
          accent="border-l-4 border-l-[#E9C989]"
        />
        <KpiKartya
          label="Partner jóváhagyta"
          ertek={szamok.jelenlet_partner_jovahagyva ?? 0}
          hint="PV véglegesítésre vár"
          accent="border-l-4 border-l-[#2C7BD6]"
        />
        <KpiKartya
          label="PV véglegesített"
          ertek={szamok.jelenlet_pv_veglegesitett ?? 0}
          hint="Számfejthető"
          accent="border-l-4 border-l-success"
        />
      </div>

      {teendok.length > 0 && (
        <div className="mb-5 rounded-card border border-gold/40 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-navy">Teendőid</h2>
            <Link
              to="/belso/folyamat-terkep"
              className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
            >
              Folyamat-térkép →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {teendok.map((t) => (
              <li key={t.cim}>
                <button
                  type="button"
                  onClick={() => setTab(t.tab)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:border-gold"
                >
                  <div>
                    <p className="font-semibold text-navy">{t.cim}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{t.leiras}</p>
                  </div>
                  <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-xs font-bold text-navy">
                    {t.db}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hiba && <p className="mb-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['folyamat', 'Folyamat kontroll', folyamat.length],
            ['megrendelesek', 'Megrendelések', szamok.megrendeles_piszkozat ?? 0],
            ['jelenletek', 'Jelenlétek (PV-re vár)', szamok.jelenlet_partner_jovahagyva ?? 0],
            ['veglegesitett', 'Véglegesítettek', szamok.jelenlet_pv_veglegesitett ?? 0],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-btn px-3 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-navy text-white' : 'border border-border bg-card text-navy hover:bg-cream-muted'
            }`}
          >
            {label}
            <span className="ml-1.5 opacity-70">({count})</span>
          </button>
        ))}
      </div>

      {toltes ? (
        <p className="text-sm text-text-muted">Betöltés…</p>
      ) : tab === 'folyamat' ? (
        folyamat.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
            Nincs partner–projekt folyamat a hatókörödben.
          </div>
        ) : (
          <div className="space-y-4">
            {folyamat.map((p) => (
              <article key={p.partner_id} className="rounded-card border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-bold text-navy">{p.partner_cegnev}</h2>
                  <span className="text-xs text-text-muted">{p.partner_email}</span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase text-text-muted">
                        <th className="py-2 pr-3">Projekt</th>
                        <th className="py-2 pr-3">Fázis</th>
                        <th className="py-2 pr-3">Beosztott</th>
                        <th className="py-2 pr-3">Rögzített</th>
                        <th className="py-2 pr-3">Partner OK</th>
                        <th className="py-2 pr-3">PV kész</th>
                        <th className="py-2">Szabad / piszkozat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.projektek.map((pr) => (
                        <tr key={pr.projekt_id} className="border-b border-border/60">
                          <td className="py-2.5 pr-3">
                            <div className="font-semibold text-navy">{pr.projekt_azonosito}</div>
                            <div className="text-xs text-text-muted">{pr.projekt_nev}</div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${fazisSzin(pr.fazis)}`}>
                              {pr.fazis}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3">{Number(pr.beosztott_7nap ?? 0)}</td>
                          <td className="py-2.5 pr-3">{Number(pr.jelenlet_rogzitett ?? 0)}</td>
                          <td className="py-2.5 pr-3">{Number(pr.jelenlet_partner ?? 0)}</td>
                          <td className="py-2.5 pr-3">{Number(pr.jelenlet_pv ?? 0)}</td>
                          <td className="py-2.5 text-xs text-text-muted">
                            szabad: {Number(pr.szabad_jelenlet_14nap ?? 0)} · piszkozat:{' '}
                            {Number(pr.muszak_piszkozat ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )
      ) : tab === 'megrendelesek' ? (
        megrendelesek.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
            Nincs visszaigazolásra váró megrendelés.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-card">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                  <th className="px-4 py-3">Dátum</th>
                  <th className="px-4 py-3">Műszak</th>
                  <th className="px-4 py-3">Projekt</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Létszám</th>
                  <th className="px-4 py-3">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {megrendelesek.map((s) => (
                  <tr key={s.muszak.id} className="border-b border-border hover:bg-cream-muted/30">
                    <td className="whitespace-nowrap px-4 py-3">{String(s.muszak.datum).slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy">{s.muszak.cim}</div>
                      <div className="text-xs text-text-muted">
                        {s.muszak.kezdet}–{s.muszak.vege}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {s.projekt_azonosito}
                      <div className="text-text-muted">{s.projekt_nev}</div>
                    </td>
                    <td className="px-4 py-3">{s.partner_cegnev ?? '—'}</td>
                    <td className="px-4 py-3">{s.muszak.letszam_megrendelt ?? 1}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={mentesId === s.muszak.id}
                        onClick={() => megrendelesOk(s.muszak.id)}
                        className="rounded-btn bg-success-bg px-3 py-1.5 text-xs font-bold text-success disabled:opacity-50"
                      >
                        Visszaigazolás
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={kereses}
              onChange={(e) => setKereses(e.target.value)}
              placeholder="Keresés: diák, projekt, partner…"
              className="field-input max-w-sm text-sm"
            />
            {tab === 'jelenletek' && (
              <>
                <button
                  type="button"
                  onClick={toggleMind}
                  className="rounded-btn border border-border px-3 py-1.5 text-xs font-semibold text-navy"
                >
                  {kivalasztott.size === szurtJelenletek.length ? 'Kijelölés törlése' : 'Összes kijelölése'}
                </button>
                <button
                  type="button"
                  disabled={kivalasztott.size === 0}
                  onClick={() => tomegesVeglegesites().catch(() => null)}
                  className="rounded-btn bg-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  Tömeges véglegesítés ({kivalasztott.size})
                </button>
              </>
            )}
          </div>

          {szurtJelenletek.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
              Nincs megjelenítendő jelenlét.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-card border border-border bg-card">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                    {tab === 'jelenletek' && <th className="w-8 px-3 py-3" />}
                    <th className="px-4 py-3">Diák</th>
                    <th className="px-4 py-3">Projekt / partner</th>
                    <th className="px-4 py-3">Nap</th>
                    <th className="px-4 py-3">Érkezés</th>
                    <th className="px-4 py-3">Távozás</th>
                    <th className="px-4 py-3">Forrás</th>
                    <th className="px-4 py-3">Státusz</th>
                    <th className="px-4 py-3">Változások</th>
                    {tab === 'jelenletek' && <th className="px-4 py-3">Műveletek</th>}
                  </tr>
                </thead>
                <tbody>
                  {szurtJelenletek.map((s) => {
                    const st = s.jelenlet.statusz as keyof typeof JELENLET_STATUSZ_LABEL;
                    const valtozasok = (s.naplo ?? []).filter((n) => n.mezo !== 'statusz' || n.regiErtek);
                    return (
                      <tr key={s.jelenlet.id} className="border-b border-border hover:bg-cream-muted/30">
                        {tab === 'jelenletek' && (
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={kivalasztott.has(s.jelenlet.id)}
                              onChange={(e) => {
                                setKivalasztott((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(s.jelenlet.id);
                                  else next.delete(s.jelenlet.id);
                                  return next;
                                });
                              }}
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 font-semibold text-navy">{s.diak_nev}</td>
                        <td className="px-4 py-3 text-xs">
                          <div>{s.projekt_azonosito ?? '—'}</div>
                          <div className="text-text-muted">{s.partner_cegnev ?? '—'}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          {String(s.muszak_datum ?? s.jelenlet.muszakDatum ?? '').slice(0, 10) || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">{formatIdo(s.jelenlet.erkezes)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">{formatIdo(s.jelenlet.tavozas)}</td>
                        <td className="px-4 py-3 text-xs">
                          {s.jelenlet.forras ?? '—'}
                          <div className="text-text-muted">{s.jelenlet.rogzitesMod ?? ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              JELENLET_STATUSZ_SZIN[st] ?? 'bg-cream-muted text-text-muted'
                            }`}
                          >
                            {JELENLET_STATUSZ_LABEL[st] ?? s.jelenlet.statusz}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          {valtozasok.length === 0 ? (
                            '—'
                          ) : (
                            <ul className="space-y-0.5">
                              {valtozasok.slice(0, 3).map((n) => (
                                <li key={n.id}>
                                  <span className="font-medium text-navy">{n.mezo}</span>:{' '}
                                  {n.regiErtek ?? '∅'} → {n.ujErtek ?? '∅'}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        {tab === 'jelenletek' && (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={mentesId === s.jelenlet.id}
                                onClick={() => veglegesit(s.jelenlet.id)}
                                className="rounded-btn bg-success-bg px-2.5 py-1 text-xs font-bold text-success disabled:opacity-50"
                              >
                                Véglegesít
                              </button>
                              <button
                                type="button"
                                disabled={mentesId === s.jelenlet.id}
                                onClick={() => elutasit(s.jelenlet.id)}
                                className="rounded-btn bg-danger-bg px-2.5 py-1 text-xs font-bold text-danger disabled:opacity-50"
                              >
                                Elutasít
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
