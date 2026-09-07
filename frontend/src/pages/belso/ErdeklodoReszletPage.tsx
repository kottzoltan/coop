import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDiakProfil, tagErdeklodobol, type MunkaJelentkezes } from '../../api/coop';
import type { DiakRegisztracio } from '../../api/coop';

function statuszSzin(statusz: string) {
  if (statusz === 'Felvéve') return 'bg-success-bg text-success';
  if (statusz === 'Elutasítva' || statusz === 'Visszamondta') return 'bg-danger-bg text-danger';
  if (statusz === 'Interjú' || statusz === 'Önéletrajzot várunk') return 'bg-warning-bg text-warning';
  return 'bg-cream-muted text-text-body';
}

export function ErdeklodoReszletPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [diak, setDiak] = useState<DiakRegisztracio | null>(null);
  const [jelentkezesek, setJelentkezesek] = useState<MunkaJelentkezes[]>([]);
  const [toltes, setToltes] = useState(true);
  const [felvetelNyitva, setFelvetelNyitva] = useState(false);
  const [adoszam, setAdoszam] = useState('');
  const [felvetelKuldes, setFelvetelKuldes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setToltes(true);
    setHiba(null);
    getDiakProfil(Number(id), true)
      .then((d) => {
        setDiak(d.diak);
        setJelentkezesek(d.jelentkezesek);
      })
      .catch((e) => {
        setDiak(null);
        setHiba(e instanceof Error ? e.message : 'Betöltés sikertelen');
      })
      .finally(() => setToltes(false));
  }, [id]);

  async function felvetelTagkent(e: React.FormEvent) {
    e.preventDefault();
    if (!diak) return;
    setFelvetelKuldes(true);
    setHiba(null);
    try {
      const r = await tagErdeklodobol(diak.id, adoszam.trim());
      navigate(`/belso/tagok/${r.tag.id}`);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Felvétel sikertelen');
    } finally {
      setFelvetelKuldes(false);
    }
  }

  if (toltes) {
    return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  }

  if (!diak) {
    return (
      <div className="p-6">
        <p className="text-text-muted">{hiba ?? 'Diák nem található.'}</p>
        <Link to="/belso/erdeklodok" className="mt-2 inline-block text-sm text-gold">
          ← Vissza
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-auto bg-cream p-6">
      <Link to="/belso/erdeklodok" className="text-sm font-semibold text-gold hover:underline">
        ← Vissza az érdeklődőkhöz
      </Link>

      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-navy">{diak.nev}</h1>
            {diak.statusz !== 'tag' && (
              <button
                type="button"
                onClick={() => setFelvetelNyitva(true)}
                className="shrink-0 rounded-btn bg-gold px-3 py-1.5 text-xs font-bold text-white hover:bg-[#a67535]"
              >
                Felvétel tagként
              </button>
            )}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">E-mail</dt>
              <dd>{diak.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Telefon</dt>
              <dd>{diak.telefon}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Születési dátum</dt>
              <dd>{diak.szuldat}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Iroda</dt>
              <dd>{diak.iroda}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Iskola</dt>
              <dd>{diak.iskola ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-text-muted">Státusz</dt>
              <dd>
                <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                  {diak.statusz}
                </span>
              </dd>
            </div>
            {diak.megjegyzes && (
              <div>
                <dt className="text-xs font-semibold uppercase text-text-muted">Megjegyzés</dt>
                <dd className="text-text-body">{diak.megjegyzes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-card border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-lg font-bold text-navy">Jelentkezései</h2>
          <p className="mt-1 text-sm text-text-muted">
            {jelentkezesek.length} jelentkezés a diákportálról
          </p>

          {jelentkezesek.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">Még nem jelentkezett munkára.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {jelentkezesek.map((j) => (
                <article
                  key={j.id}
                  className="rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/belso/toborzas/hirdetesek/${j.hirdetes_id}`}
                        className="font-semibold text-navy hover:text-gold"
                      >
                        {j.hirdetes_cim}
                      </Link>
                      <p className="text-xs text-text-muted">
                        {j.hirdetes_varos} · {j.hirdetes_munkakor}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statuszSzin(j.statusz)}`}
                    >
                      {j.statusz}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    {new Date(j.letrehozva).toLocaleString('hu-HU')}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {felvetelNyitva && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setFelvetelNyitva(false)}
          role="presentation"
        >
          <form
            className="w-full max-w-md rounded-card bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={felvetelTagkent}
          >
            <h3 className="font-bold text-navy">Felvétel szövetkezeti tagként</h3>
            <p className="mt-1 text-sm text-text-muted">
              {diak.nev} — az érdeklődő adatai átkerülnek a tag nyilvántartásba.
            </p>
            <label className="mt-4 block text-sm">
              Adószám *
              <input
                className="field-input mt-1"
                value={adoszam}
                onChange={(e) => setAdoszam(e.target.value)}
                placeholder="12345678-1-23"
                required
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={felvetelKuldes}
                className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {felvetelKuldes ? 'Felvétel…' : 'Tag létrehozása'}
              </button>
              <button
                type="button"
                onClick={() => setFelvetelNyitva(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Mégse
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
