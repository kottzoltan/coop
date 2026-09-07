import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMunkak, type MunkaHirdetes } from '../../api/coop';
import { useAuth } from '../../context/AuthContext';
import { MunkaListaSor } from '../../components/diak/MunkaListaSor';
import { MunkaReszletPanel } from '../../components/diak/MunkaReszletPanel';
import { MunkaSzuroModal } from '../../components/diak/MunkaSzuroModal';
import {
  alkalmazSzurok,
  GYORS_KATEGORIAK,
  szurokSzama,
  URES_SZURO,
  type MunkaSzuroAllapot,
} from '../../components/diak/munka-szurok';

const VAROSOK = ['Budapest', 'Székesfehérvár', 'Pécs', 'Sopron', 'Debrecen', 'Győr'];

export function MunkakPage() {
  const { id: idParam } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { me } = useAuth();
  const bejelentkezve = !!(me?.szerep === 'diak' && me.diak);

  const [munkak, setMunkak] = useState<MunkaHirdetes[]>([]);
  const [keres, setKeres] = useState('');
  const [varos, setVaros] = useState('');
  const [agazat, setAgazat] = useState('');
  const [szuro, setSzuro] = useState<MunkaSzuroAllapot>(URES_SZURO);
  const [szuroNyitva, setSzuroNyitva] = useState(false);
  const [rendezes, setRendezes] = useState<'uj' | 'ber'>('uj');
  const [toltes, setToltes] = useState(true);
  const [kompakt, setKompakt] = useState(false);
  const [mobilReszlet, setMobilReszlet] = useState(false);

  useEffect(() => {
    setToltes(true);
    const params: Record<string, string> = { rendezes };
    if (keres) params.keres = keres;
    if (varos) params.varos = varos;
    getMunkak(params)
      .then((d) => setMunkak(d.sorok))
      .finally(() => setToltes(false));
  }, [keres, varos, rendezes]);

  const szurt = useMemo(
    () => alkalmazSzurok(munkak, szuro, agazat),
    [munkak, szuro, agazat],
  );

  const aktivSzurok = szurokSzama(szuro, varos, agazat);

  const kivalasztottId = idParam ? Number(idParam) : null;
  const kivalasztott = useMemo(
    () => szurt.find((m) => m.id === kivalasztottId) ?? null,
    [szurt, kivalasztottId],
  );

  const valaszt = useCallback(
    (munka: MunkaHirdetes) => {
      navigate(`/diak/munkak/${munka.id}`, { replace: idParam === String(munka.id) });
      setMobilReszlet(true);
    },
    [navigate, idParam],
  );

  // Mobil: közvetlen link esetén részlet nézet
  useEffect(() => {
    if (idParam && window.matchMedia('(max-width: 1023px)').matches) {
      setMobilReszlet(true);
    }
  }, [idParam]);
  useEffect(() => {
    if (toltes || szurt.length === 0) return;
    const id = kivalasztottId;
    const benneVan = id != null && szurt.some((m) => m.id === id);
    if (!benneVan) {
      navigate(`/diak/munkak/${szurt[0].id}`, { replace: true });
    }
  }, [szurt, kivalasztottId, toltes, navigate]);

  // Görgetés → kompakt sticky keresősáv
  useEffect(() => {
    const onScroll = () => {
      const heroAlja = heroRef.current?.offsetHeight ?? 200;
      setKompakt(window.scrollY > heroAlja - 80);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function szurokTorlese() {
    setKeres('');
    setVaros('');
    setAgazat('');
    setSzuro(URES_SZURO);
  }

  const keresoSav = (suru: boolean) => (
    <div
      className={[
        'transition-all duration-300',
        suru ? 'py-2' : 'py-4',
      ].join(' ')}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <input
            value={keres}
            onChange={(e) => setKeres(e.target.value)}
            placeholder="Milyen munkát keresel?"
            className={[
              'min-w-0 flex-1 rounded-lg border border-border-input bg-card px-4 text-navy outline-none focus:border-[#2C7BD6] focus:ring-2 focus:ring-[#2C7BD6]/20',
              suru ? 'py-2 text-sm' : 'py-3 text-sm shadow-sm',
            ].join(' ')}
          />
          <button
            type="button"
            onClick={() => setSzuroNyitva(true)}
            className={[
              'relative shrink-0 rounded-lg border border-border-input bg-card text-navy transition-colors hover:border-[#2C7BD6] hover:bg-[#EAF1F7]',
              suru ? 'p-2' : 'p-2.5',
            ].join(' ')}
            aria-label="Részletes szűrők"
            title="Részletes szűrők"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={suru ? 'h-4 w-4' : 'h-5 w-5'}
              aria-hidden
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            {aktivSzurok > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">
                {aktivSzurok}
              </span>
            )}
          </button>
        </div>
        <select
          value={varos}
          onChange={(e) => setVaros(e.target.value)}
          className={[
            'rounded-lg border border-border-input bg-card px-3 text-sm text-navy sm:w-44',
            suru ? 'py-2' : 'py-3',
          ].join(' ')}
        >
          <option value="">Minden város</option>
          {VAROSOK.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        {(keres || varos || agazat || aktivSzurok > 0) && (
          <button
            type="button"
            onClick={szurokTorlese}
            className="shrink-0 text-xs font-semibold text-[#2C7BD6] hover:underline"
          >
            Törlés
          </button>
        )}
      </div>

      <div
        className={[
          'mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none',
          suru ? 'mt-1.5' : 'mt-3',
        ].join(' ')}
      >
        {GYORS_KATEGORIAK.map((a) => (
          <button
            key={a.id || 'osszes'}
            type="button"
            onClick={() => setAgazat(a.id)}
            className={[
              'shrink-0 rounded-full px-3 font-semibold transition-colors',
              suru ? 'py-1 text-[11px]' : 'py-1.5 text-xs',
              agazat === a.id
                ? 'bg-[#2C7BD6] text-white'
                : 'bg-[#EAF1F7] text-[#2C7BD6] hover:bg-[#d9e8f5]',
            ].join(' ')}
          >
            {a.label}
          </button>
        ))}
      </div>

      {(szuro.munkakor || szuro.cimkek.length > 0 || szuro.minBer != null) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {szuro.munkakor && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1F7] px-2.5 py-0.5 text-[11px] font-medium text-[#2C7BD6]">
              {szuro.munkakor.split(',')[0]}
              <button
                type="button"
                onClick={() => setSzuro((s) => ({ ...s, munkakor: '' }))}
                className="hover:text-navy"
                aria-label="Munkakör szűrő törlése"
              >
                ×
              </button>
            </span>
          )}
          {szuro.cimkek.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-[#EAF1F7] px-2.5 py-0.5 text-[11px] font-medium text-[#2C7BD6]"
            >
              {c}
              <button
                type="button"
                onClick={() =>
                  setSzuro((s) => ({ ...s, cimkek: s.cimkek.filter((x) => x !== c) }))
                }
                className="hover:text-navy"
                aria-label={`${c} szűrő törlése`}
              >
                ×
              </button>
            </span>
          ))}
          {szuro.minBer != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1F7] px-2.5 py-0.5 text-[11px] font-medium text-[#2C7BD6]">
              min. {szuro.minBer} Ft/óra
              <button
                type="button"
                onClick={() => setSzuro((s) => ({ ...s, minBer: null }))}
                className="hover:text-navy"
                aria-label="Minimum bér szűrő törlése"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-page-bg">
      {/* Hero — görgetéskor összecsukódik */}
      <div
        ref={heroRef}
        className={[
          'overflow-hidden bg-gradient-to-br from-[#0d2d5c] via-[#1a4a8a] to-[#2C7BD6] text-white transition-all duration-300',
          kompakt ? 'max-h-0 opacity-0' : 'max-h-[280px] opacity-100',
        ].join(' ')}
      >
        <div className="mx-auto max-w-6xl px-4 py-10 text-center md:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            Coop állásportál
          </p>
          <h1 className="mt-2 text-2xl font-bold md:text-4xl">
            Több száz rugalmas diákmunka — neked!
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/80">
            Válassz a listából — a leírás azonnal megjelenik mellette.
          </p>
        </div>
      </div>

      {/* Keresősáv — kompakttá válik és sticky lesz */}
      <div
        className={[
          'z-30 border-b border-border bg-card transition-shadow duration-300',
          kompakt ? 'sticky top-0 shadow-md' : '',
        ].join(' ')}
      >
        <div className="mx-auto max-w-6xl px-4">
          {kompakt && (
            <div className="flex items-center justify-between border-b border-border py-2">
              <p className="text-sm font-bold text-navy">
                {szurt.length} állás
                {kivalasztott && (
                  <span className="ml-2 hidden font-normal text-text-muted sm:inline">
                    — {kivalasztott.cim}
                  </span>
                )}
              </p>
              <div className="flex rounded-full border border-border p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRendezes('uj')}
                  className={[
                    'rounded-full px-2.5 py-1 font-semibold',
                    rendezes === 'uj' ? 'bg-[#EAF1F7] text-[#2C7BD6]' : 'text-text-muted',
                  ].join(' ')}
                >
                  Legfrissebb
                </button>
                <button
                  type="button"
                  onClick={() => setRendezes('ber')}
                  className={[
                    'rounded-full px-2.5 py-1 font-semibold',
                    rendezes === 'ber' ? 'bg-[#EAF1F7] text-[#2C7BD6]' : 'text-text-muted',
                  ].join(' ')}
                >
                  Legjobb bér
                </button>
              </div>
            </div>
          )}
          {keresoSav(kompakt)}
        </div>
      </div>

      {/* Lista fejléc — csak nem kompakt módban */}
      {!kompakt && (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h2 className="text-base font-bold text-navy">{szurt.length} elérhető állás</h2>
          <div className="flex rounded-full border border-border bg-card p-1 text-sm">
            <button
              type="button"
              onClick={() => setRendezes('uj')}
              className={[
                'rounded-full px-4 py-1.5 font-semibold',
                rendezes === 'uj' ? 'bg-[#EAF1F7] text-[#2C7BD6]' : 'text-text-muted',
              ].join(' ')}
            >
              Legfrissebb
            </button>
            <button
              type="button"
              onClick={() => setRendezes('ber')}
              className={[
                'rounded-full px-4 py-1.5 font-semibold',
                rendezes === 'ber' ? 'bg-[#EAF1F7] text-[#2C7BD6]' : 'text-text-muted',
              ].join(' ')}
            >
              Legjobban fizetők
            </button>
          </div>
        </div>
      )}

      {/* Master–detail */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        {toltes ? (
          <p className="py-12 text-center text-sm text-text-muted">Munkák betöltése…</p>
        ) : szurt.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">
            Nincs találat — próbálj más szűrőt.
          </p>
        ) : (
          <div
            className={[
              'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
              'lg:grid lg:grid-cols-[minmax(280px,340px)_1fr]',
              kompakt ? 'lg:h-[calc(100vh-140px)]' : 'lg:h-[calc(100vh-320px)] lg:min-h-[520px]',
            ].join(' ')}
          >
            {/* Bal: görgethető lista */}
            <div
              className={[
                'border-border lg:border-r lg:overflow-y-auto',
                mobilReszlet ? 'hidden lg:block' : 'block',
              ].join(' ')}
            >
              {szurt.map((m) => (
                <MunkaListaSor
                  key={m.id}
                  munka={m}
                  aktiv={m.id === kivalasztottId}
                  onValaszt={() => valaszt(m)}
                />
              ))}
            </div>

            {/* Jobb: részletek */}
            <div
              className={[
                'bg-[#fafbfc] lg:overflow-y-auto',
                mobilReszlet ? 'block' : 'hidden lg:block',
              ].join(' ')}
            >
              {kivalasztott ? (
                <>
                  <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setMobilReszlet(false)}
                      className="text-sm font-semibold text-[#2C7BD6]"
                    >
                      ← Lista
                    </button>
                  </div>
                  <MunkaReszletPanel munka={kivalasztott} compact />
                </>
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center p-8 text-sm text-text-muted">
                  Válassz egy állást a listából.
                </div>
              )}
            </div>
          </div>
        )}

        {!bejelentkezve && (
          <p className="mt-6 text-center text-sm text-text-muted">
            Még nem vagy tag?{' '}
            <Link to="/diak/regisztracio" className="font-semibold text-[#2C7BD6]">
              Regisztrálj itt
            </Link>
          </p>
        )}
      </div>

      <MunkaSzuroModal
        nyitva={szuroNyitva}
        aktiv={szuro}
        munkak={munkak}
        agazat={agazat}
        onBezar={() => setSzuroNyitva(false)}
        onAlkalmaz={setSzuro}
      />
    </div>
  );
}
