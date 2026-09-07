import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  berFutasKorrekcio,
  berFutasLezaras,
  berFutasValidalas,
  generateNav08,
  getBerFutas,
  getBerFutasok,
  ujBerFutas,
  type BerFutasDetail,
  type BerFutasListaSor,
} from '../../api/coop';
import { BerszamfejtesNav, ft, FutasStatuszBadge } from '../../components/belso/berszamfejtes/BerszamfejtesNav';

function aktualisHonap(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function BerFutasListaPage() {
  const [sorok, setSorok] = useState<BerFutasListaSor[]>([]);
  const [period, setPeriod] = useState(aktualisHonap());
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [letrehozas, setLetrehozas] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setToltes(true);
    getBerFutasok(period || undefined)
      .then((d) => {
        setSorok(d.sorok);
        setHiba(null);
      })
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [period]);

  async function ujFutas() {
    setLetrehozas(true);
    try {
      const d = await ujBerFutas({ payroll_period: period });
      navigate(`/belso/berszamfejtes/futasok/${d.futas.id}`);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Létrehozás sikertelen');
    } finally {
      setLetrehozas(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <BerszamfejtesNav active="futasok" />
          <h1 className="mt-3 text-xl font-bold text-navy">Számfejtési futások</h1>
          <p className="text-sm text-text-muted">
            Havi batch — jóváhagyott munkalapokból adószámítás és lezárás
          </p>
        </div>
        <button
          type="button"
          disabled={letrehozas}
          onClick={ujFutas}
          className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535] disabled:opacity-50"
        >
          {letrehozas ? 'Létrehozás…' : '+ Új futás'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-navy">
          Szf. időszak
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="ml-2 rounded-btn border border-border bg-card px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      {hiba && (
        <div className="mb-4 rounded-btn border border-[#B4402C]/30 bg-[#B4402C]/10 px-4 py-3 text-sm text-[#B4402C]">
          {hiba}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-card border border-border bg-card">
        {toltes ? (
          <p className="p-6 text-sm text-text-muted">Betöltés…</p>
        ) : sorok.length === 0 ? (
          <p className="p-6 text-sm text-text-muted">
            Nincs futás ebben az időszakban. Hozz létre egyet — automatikusan összegyűjti a jóváhagyott
            munkalapokat.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-border bg-cream-muted text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Időszak</th>
                <th className="px-4 py-3">Státusz</th>
                <th className="px-4 py-3">Munkalap</th>
                <th className="px-4 py-3">Sorok</th>
                <th className="px-4 py-3">Hibák</th>
                <th className="px-4 py-3">Létrehozva</th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((f) => (
                <tr
                  key={f.id}
                  className="cursor-pointer border-b border-border/60 hover:bg-cream/80"
                  onClick={() => navigate(`/belso/berszamfejtes/futasok/${f.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-navy">{f.id}</td>
                  <td className="px-4 py-3">{f.payroll_period}</td>
                  <td className="px-4 py-3">
                    <FutasStatuszBadge status={f.status} />
                  </td>
                  <td className="px-4 py-3">{f.munkalap_count}</td>
                  <td className="px-4 py-3">{f.sor_count}</td>
                  <td className="px-4 py-3">
                    {f.error_count > 0 ? (
                      <span className="font-semibold text-[#B4402C]">{f.error_count} hiba</span>
                    ) : f.warn_count > 0 ? (
                      <span className="text-[#B8863F]">{f.warn_count} figyelmeztetés</span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(f.created_at).toLocaleString('hu-HU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function BerFutasReszletPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<BerFutasDetail | null>(null);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [muvelet, setMuvelet] = useState<string | null>(null);

  async function betolt() {
    if (!id) return;
    setToltes(true);
    try {
      const d = await getBerFutas(Number(id));
      setData(d);
      setHiba(null);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Betöltés sikertelen');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt();
  }, [id]);

  async function futtat(muveletNev: 'validate' | 'close' | 'korrekcio', fn: () => Promise<unknown>) {
    setMuvelet(muveletNev);
    try {
      await fn();
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Művelet sikertelen');
    } finally {
      setMuvelet(null);
    }
  }

  if (toltes && !data) {
    return (
      <div className="bg-cream p-6">
        <p className="text-sm text-text-muted">Betöltés…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-cream p-6">
        <p className="text-[#B4402C]">{hiba ?? 'Futás nem található.'}</p>
        <Link to="/belso/berszamfejtes/futasok" className="mt-2 inline-block text-sm text-gold">
          ← Vissza
        </Link>
      </div>
    );
  }

  const { futas, munkalapok, sorok, validacios_hibak, osszesito } = data;
  const errors = validacios_hibak.filter((h) => h.severity === 'ERROR');
  const warns = validacios_hibak.filter((h) => h.severity === 'WARN');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <Link
        to="/belso/berszamfejtes/futasok"
        className="text-sm font-semibold text-[#2C7BD6] hover:underline"
      >
        ← Számfejtési futások
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-navy">
              Futás #{futas.id} — {futas.payroll_period}
            </h1>
            <FutasStatuszBadge status={futas.status} />
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {munkalapok.length} munkalap · {sorok.length} sor
            {futas.closed_at ? ` · Lezárva: ${new Date(futas.closed_at).toLocaleString('hu-HU')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(futas.status === 'DRAFT' || futas.status === 'VALIDATED') && (
            <button
              type="button"
              disabled={!!muvelet}
              onClick={() => futtat('validate', () => berFutasValidalas(futas.id))}
              className="rounded-btn border border-border bg-card px-4 py-2 text-sm font-semibold text-navy hover:bg-cream"
            >
              {muvelet === 'validate' ? 'Validálás…' : 'Validálás'}
            </button>
          )}
          {futas.status === 'VALIDATED' && (
            <button
              type="button"
              disabled={!!muvelet}
              onClick={() => futtat('close', () => berFutasLezaras(futas.id))}
              className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
            >
              {muvelet === 'close' ? 'Lezárás…' : 'Lezárás + adószámítás'}
            </button>
          )}
          {(futas.status === 'CLOSED' || futas.status === 'DECLARED') && (
            <button
              type="button"
              disabled={!!muvelet}
              onClick={async () => {
                setMuvelet('nav08');
                try {
                  const d = await generateNav08({
                    period: futas.payroll_period,
                    payroll_run_ids: [futas.id],
                  });
                  navigate(`/belso/nav-bevallasok/${d.bevallas.id}`);
                } catch (e) {
                  setHiba(e instanceof Error ? e.message : 'NAV 08 generálás sikertelen');
                } finally {
                  setMuvelet(null);
                }
              }}
              className="rounded-btn border border-navy px-4 py-2 text-sm font-semibold text-navy"
            >
              {muvelet === 'nav08' ? 'NAV 08…' : 'NAV 08 generálás'}
            </button>
          )}
          {(futas.status === 'CLOSED' || futas.status === 'DECLARED') && (
            <button
              type="button"
              disabled={!!muvelet}
              onClick={() => futtat('korrekcio', () => berFutasKorrekcio(futas.id))}
              className="rounded-btn border border-[#B8863F] px-4 py-2 text-sm font-semibold text-[#B8863F]"
            >
              {muvelet === 'korrekcio' ? 'Indítás…' : 'Korrekció indítása'}
            </button>
          )}
        </div>
      </div>

      {hiba && (
        <div className="mt-4 rounded-btn border border-[#B4402C]/30 bg-[#B4402C]/10 px-4 py-3 text-sm text-[#B4402C]">
          {hiba}
        </div>
      )}

      {osszesito && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Bruttó', value: osszesito.bruttó },
            { label: 'SZJA', value: osszesito.szja },
            { label: 'TB', value: osszesito.tb },
            { label: 'Szocho', value: osszesito.szocho },
            { label: 'Nettó', value: osszesito.nettó },
          ].map((k) => (
            <div key={k.label} className="rounded-card border border-border bg-card p-3">
              <div className="text-xs text-text-muted">{k.label}</div>
              <div className="text-lg font-bold text-navy">{ft(k.value)}</div>
            </div>
          ))}
        </div>
      )}

      {(errors.length > 0 || warns.length > 0) && (
        <div className="mt-4 rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-bold text-navy">Validációs eredmény</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {errors.map((h) => (
              <li key={h.id} className="text-[#B4402C]">
                ✕ [{h.code}] {h.message}
              </li>
            ))}
            {warns.map((h) => (
              <li key={h.id} className="text-[#B8863F]">
                ⚠ [{h.code}] {h.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-border bg-cream-muted text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Bruttó</th>
              <th className="px-4 py-3">SZJA-alap</th>
              <th className="px-4 py-3">SZJA</th>
              <th className="px-4 py-3">TB</th>
              <th className="px-4 py-3">Nettó</th>
              <th className="px-4 py-3">Kód</th>
            </tr>
          </thead>
          <tbody>
            {sorok.map((s) => (
              <tr key={s.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-medium text-navy">{s.tag_nev}</td>
                <td className="px-4 py-3">{ft(s.gross_amount)}</td>
                <td className="px-4 py-3">
                  {s.snapshot ? ft(s.snapshot.final_szja_base) : '—'}
                </td>
                <td className="px-4 py-3">
                  {s.snapshot ? ft(s.snapshot.calculated_szja) : '—'}
                </td>
                <td className="px-4 py-3">
                  {s.snapshot ? ft(s.snapshot.tb_amount) : '—'}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {s.snapshot ? ft(s.snapshot.net_amount) : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-muted">{s.wage_code_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {munkalapok.length > 0 && (
        <div className="mt-4 rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-bold text-navy">Forrás munkalapok</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {munkalapok.map((ml) => (
              <Link
                key={ml.id}
                to={`/belso/berszamfejtes/${ml.id}`}
                className="rounded-btn border border-border bg-cream px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream-muted"
              >
                {ml.azonosito} ({ml.statusz})
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
