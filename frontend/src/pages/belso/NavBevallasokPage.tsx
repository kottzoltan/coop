import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  exportNavBevallas,
  generateM30,
  generateNav08,
  getNavBevallas,
  getNavBevallasok,
  type NavBevallasDetail,
  type NavBevallasListaSor,
} from '../../api/coop';
import { getBerFutasok, type BerFutasListaSor } from '../../api/coop';
import { ft } from '../../components/belso/berszamfejtes/BerszamfejtesNav';

type BevallasType = 'NAV_08' | 'M30' | 'NAV_08E';

const BEV_TYPES: { id: BevallasType; label: string; desc: string }[] = [
  { id: 'NAV_08', label: '08-as', desc: 'Havi adóbevallás lezárt futásokból' },
  { id: 'M30', label: 'M30', desc: 'Éves kifizetési igazolás' },
  { id: 'NAV_08E', label: '08E', desc: 'Biztosítotti bejelentés (jogviszony alapján)' },
];

function aktualisHonap(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const BEV_STATUSZ: Record<string, string> = {
  DRAFT: 'Piszkozat',
  VALIDATED: 'Validált',
  EXPORTED: 'Exportálva',
  SUBMITTED: 'Beküldve',
  CORRECTED: 'Korrigálva',
};

const TYPE_LABEL: Record<string, string> = {
  NAV_08: 'NAV 08',
  M30: 'M30',
  NAV_08E: 'NAV 08E',
};

export function NavBevallasokListaPage() {
  const [bevallasType, setBevallasType] = useState<BevallasType>('NAV_08');
  const [sorok, setSorok] = useState<NavBevallasListaSor[]>([]);
  const [period, setPeriod] = useState(aktualisHonap());
  const [taxYear, setTaxYear] = useState(new Date().getFullYear() - 1);
  const [closedFutasok, setClosedFutasok] = useState<BerFutasListaSor[]>([]);
  const [selectedFutas, setSelectedFutas] = useState<number[]>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [generalas, setGeneralas] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setToltes(true);
    const tasks: Promise<unknown>[] = [
      getNavBevallasok(
        bevallasType === 'M30'
          ? { type: 'M30', tax_year: taxYear }
          : { type: bevallasType, period: bevallasType === 'NAV_08' ? period : undefined },
      ).then((nav) => setSorok(nav.sorok)),
    ];
    if (bevallasType === 'NAV_08') {
      tasks.push(
        getBerFutasok(period).then((futas) => {
          setClosedFutasok(futas.sorok.filter((f) => f.status === 'CLOSED' || f.status === 'DECLARED'));
          setSelectedFutas(futas.sorok.filter((f) => f.status === 'CLOSED').map((f) => f.id));
        }),
      );
    }
    Promise.all(tasks)
      .then(() => setHiba(null))
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [bevallasType, period, taxYear]);

  async function general() {
    setGeneralas(true);
    try {
      if (bevallasType === 'NAV_08') {
        if (!selectedFutas.length) {
          setHiba('Válassz legalább egy lezárt bérszámfejtési futást.');
          return;
        }
        const d = await generateNav08({ period, payroll_run_ids: selectedFutas });
        navigate(`/belso/nav-bevallasok/${d.bevallas.id}`);
      } else if (bevallasType === 'M30') {
        const d = await generateM30({ tax_year: taxYear });
        navigate(`/belso/nav-bevallasok/${d.bevallas.id}`);
      }
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Generálás sikertelen');
    } finally {
      setGeneralas(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-navy">NAV bevallások</h1>
        <p className="text-sm text-text-muted">08-as havi bevallás, M30 éves igazolás, 08E biztosítotti bejelentés</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {BEV_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setBevallasType(t.id)}
            className={`rounded-btn px-4 py-2 text-sm font-semibold ${
              bevallasType === t.id
                ? 'bg-navy text-white'
                : 'border border-border bg-card text-navy hover:bg-cream-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-text-muted">{BEV_TYPES.find((t) => t.id === bevallasType)?.desc}</p>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        {bevallasType === 'NAV_08' && (
          <label className="text-sm font-medium text-navy">
            Időszak
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="ml-2 rounded-btn border border-border bg-card px-3 py-1.5 text-sm"
            />
          </label>
        )}
        {bevallasType === 'M30' && (
          <label className="text-sm font-medium text-navy">
            Adóév
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value))}
              className="ml-2 rounded-btn border border-border bg-card px-3 py-1.5 text-sm"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
        )}
        {bevallasType !== 'NAV_08E' && (
          <button
            type="button"
            disabled={generalas}
            onClick={general}
            className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535] disabled:opacity-50"
          >
            {generalas ? 'Generálás…' : `${TYPE_LABEL[bevallasType]} generálás`}
          </button>
        )}
      </div>

      {bevallasType === 'NAV_08' && closedFutasok.length > 0 && (
        <div className="mb-4 rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-bold text-navy">Lezárt bérszámfejtési futások</h2>
          <div className="mt-2 flex flex-wrap gap-3">
            {closedFutasok.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedFutas.includes(f.id)}
                  onChange={(e) => {
                    setSelectedFutas((prev) =>
                      e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id),
                    );
                  }}
                />
                #{f.id} ({f.sor_count} sor)
              </label>
            ))}
          </div>
        </div>
      )}

      {bevallasType === 'NAV_08E' && (
        <div className="mb-4 rounded-card border border-border bg-card p-4 text-sm text-text-muted">
          08E generálás a tag adatlap <strong className="text-navy">Munkavégzési adatok</strong> fülén, jogviszonyonként indítható.
        </div>
      )}

      {hiba && (
        <div className="mb-4 rounded-btn border border-[#B4402C]/30 bg-[#B4402C]/10 px-4 py-3 text-sm text-[#B4402C]">
          {hiba}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-card border border-border bg-card">
        {toltes ? (
          <p className="p-6 text-sm text-text-muted">Betöltés…</p>
        ) : sorok.length === 0 ? (
          <p className="p-6 text-sm text-text-muted">Nincs bevallás a kiválasztott szűrővel.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-border bg-cream-muted text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Típus</th>
                <th className="px-4 py-3">Időszak / év</th>
                <th className="px-4 py-3">Státusz</th>
                <th className="px-4 py-3">Generálva</th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((b) => (
                <tr
                  key={b.id}
                  className="cursor-pointer border-b border-border/60 hover:bg-cream/80"
                  onClick={() => navigate(`/belso/nav-bevallasok/${b.id}`)}
                >
                  <td className="px-4 py-3 font-mono">{b.id}</td>
                  <td className="px-4 py-3">{TYPE_LABEL[b.type] ?? b.type}</td>
                  <td className="px-4 py-3">{b.period ?? b.tax_year}</td>
                  <td className="px-4 py-3">{BEV_STATUSZ[b.status] ?? b.status}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {b.generated_at ? new Date(b.generated_at).toLocaleString('hu-HU') : '—'}
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

function exportGombLabel(type: string): string {
  if (type === 'M30') return 'Igazolás export (HTML)';
  if (type === 'NAV_08E') return '08E XML export';
  return 'XML + kontroll export';
}

export function NavBevallasReszletPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<NavBevallasDetail | null>(null);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [muvelet, setMuvelet] = useState(false);

  async function betolt() {
    if (!id) return;
    setToltes(true);
    try {
      setData(await getNavBevallas(Number(id)));
      setHiba(null);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt();
  }, [id]);

  async function exportal() {
    if (!id) return;
    setMuvelet(true);
    try {
      const d = await exportNavBevallas(Number(id));
      setData(d);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Export sikertelen');
    } finally {
      setMuvelet(false);
    }
  }

  if (toltes && !data) return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  if (!data) return <p className="p-6 text-[#B4402C]">{hiba ?? 'Nem található'}</p>;

  const errors = data.validacios_hibak.filter((h) => h.severity === 'ERROR');
  const type = data.bevallas.type;
  const cim = TYPE_LABEL[type] ?? type;
  const idoszak = data.bevallas.period ?? String(data.bevallas.tax_year);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <Link to="/belso/nav-bevallasok" className="text-sm font-semibold text-[#2C7BD6] hover:underline">
        ← NAV bevallások
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">
            {cim} — {idoszak} (#{data.bevallas.id})
          </h1>
          <p className="text-sm text-text-muted">
            Státusz: {BEV_STATUSZ[data.bevallas.status] ?? data.bevallas.status}
          </p>
        </div>
        {(data.bevallas.status === 'VALIDATED' || data.bevallas.status === 'EXPORTED') && (
          <button
            type="button"
            disabled={muvelet || errors.length > 0}
            onClick={exportal}
            className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {muvelet ? 'Export…' : exportGombLabel(type)}
          </button>
        )}
      </div>

      {hiba && <p className="mt-3 text-sm text-[#B4402C]">{hiba}</p>}

      {data.osszesito && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: 'Személyek', v: String(data.osszesito.person_count) },
            { l: 'Bruttó', v: ft(data.osszesito.total_gross) },
            { l: 'SZJA', v: ft(data.osszesito.total_szja) },
            { l: 'TB', v: ft(data.osszesito.total_tb) },
          ].map((k) => (
            <div key={k.l} className="rounded-card border border-border bg-card p-3">
              <div className="text-xs text-text-muted">{k.l}</div>
              <div className="text-lg font-bold text-navy">{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {data.validacios_hibak.length > 0 && (
        <div className="mt-4 rounded-card border border-border bg-card p-4 text-sm">
          {data.validacios_hibak.map((h) => (
            <div key={h.id} className={h.severity === 'ERROR' ? 'text-[#B4402C]' : 'text-[#B8863F]'}>
              [{h.code}] {h.message}
            </div>
          ))}
        </div>
      )}

      {data.export_fajlok.length > 0 && (
        <div className="mt-4 rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-bold text-navy">Export fájlok</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.export_fajlok.map((f) => (
              <li key={f.id}>
                <a
                  href={`/api/nav-bevallasok?id=${data.bevallas.id}&export_id=${f.id}`}
                  className="font-semibold text-[#2C7BD6] hover:underline"
                >
                  {f.file_name}
                </a>
                <span className="ml-2 text-xs text-text-muted">{f.file_type} · {f.file_hash.slice(0, 12)}…</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-border bg-cream-muted text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Név</th>
              <th className="px-4 py-3">Adóazonosító</th>
              {type === 'NAV_08E' && <th className="px-4 py-3">Jogviszony</th>}
              <th className="px-4 py-3">Bruttó</th>
              <th className="px-4 py-3">SZJA</th>
              {type !== 'NAV_08E' && <th className="px-4 py-3">TB</th>}
            </tr>
          </thead>
          <tbody>
            {data.szemelyi_sorok.map((s) => (
              <tr key={s.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.tax_identification_number}</td>
                {type === 'NAV_08E' && (
                  <td className="px-4 py-3 text-xs">{s.relation_type ?? '—'}</td>
                )}
                <td className="px-4 py-3">{ft(s.gross_amount)}</td>
                <td className="px-4 py-3">{ft(s.calculated_szja)}</td>
                {type !== 'NAV_08E' && <td className="px-4 py-3">{ft(s.tb_amount)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.audit.length > 0 && (
        <div className="mt-4 rounded-card border border-border bg-card p-4 text-xs text-text-muted">
          <h2 className="text-sm font-bold text-navy">Audit napló</h2>
          {data.audit.map((a) => (
            <div key={a.id}>
              {new Date(a.created_at).toLocaleString('hu-HU')} — {a.action} ({a.actor_id})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
