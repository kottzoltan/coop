import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getKampany,
  getKampanyok,
  getMunkak,
  kampanyResztvevoHozzaad,
  kampanyResztvevoMent,
  mentKampany,
  ujKampany,
  type Kampany,
  type KampanyResztvevo,
} from '../../api/coop';

const STATUSZOK = ['aktív', 'lezárt', 'piszkozat'];

export function KampanyokListaPage() {
  const [sorok, setSorok] = useState<Kampany[]>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujNyitva, setUjNyitva] = useState(false);
  const [ujNev, setUjNev] = useState('');
  const navigate = useNavigate();

  async function betolt() {
    setToltes(true);
    try {
      const d = await getKampanyok();
      setSorok(d.sorok);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => setToltes(false));
  }, []);

  async function letrehoz(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await ujKampany({ nev: ujNev.trim(), statusz: 'aktív' });
      setUjNyitva(false);
      setUjNev('');
      navigate(`/belso/toborzas/kampanyok/${r.kampany.id}`);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">Kampányok</h2>
          <p className="text-sm text-text-muted">{sorok.length} kampány</p>
        </div>
        <button
          type="button"
          onClick={() => setUjNyitva(true)}
          className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white"
        >
          + Új kampány
        </button>
      </div>

      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      {toltes ? (
        <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
      ) : sorok.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
          Még nincs kampány.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream-muted text-left text-[11px] uppercase text-text-muted">
              <tr>
                <th className="px-3 py-2">Név</th>
                <th className="px-3 py-2">Státusz</th>
                <th className="px-3 py-2">Időszak</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sorok.map((k) => (
                <tr key={k.id} className="border-t border-border hover:bg-cream-muted/40">
                  <td className="px-3 py-2 font-semibold text-navy">{k.nev}</td>
                  <td className="px-3 py-2">{k.statusz}</td>
                  <td className="px-3 py-2 text-text-muted">
                    {k.kezdet ?? '—'} — {k.vege ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/belso/toborzas/kampanyok/${k.id}`}
                      className="text-xs font-semibold text-gold hover:underline"
                    >
                      Részlet
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ujNyitva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <form
            className="w-full max-w-md rounded-card bg-card p-6 shadow-xl"
            onSubmit={letrehoz}
          >
            <h3 className="font-bold text-navy">Új kampány</h3>
            <input
              className="field-input mt-3 w-full"
              value={ujNev}
              onChange={(e) => setUjNev(e.target.value)}
              placeholder="Kampány neve"
              required
            />
            <div className="mt-4 flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-white">
                Létrehozás
              </button>
              <button type="button" onClick={() => setUjNyitva(false)} className="rounded-lg border px-4 py-2 text-sm">
                Mégse
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function KampanyReszletPage() {
  const { id: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const id = Number(idParam);
  const [kampany, setKampany] = useState<Kampany | null>(null);
  const [resztvevok, setResztvevok] = useState<KampanyResztvevo[]>([]);
  const [nev, setNev] = useState('');
  const [leiras, setLeiras] = useState('');
  const [statusz, setStatusz] = useState('aktív');
  const [kezdet, setKezdet] = useState('');
  const [vege, setVege] = useState('');
  const [hirdetesId, setHirdetesId] = useState('');
  const [hirdetesek, setHirdetesek] = useState<Array<{ id: number; cim: string }>>([]);
  const [ujResztvevoNev, setUjResztvevoNev] = useState('');
  const [ujResztvevoEmail, setUjResztvevoEmail] = useState('');
  const [toltes, setToltes] = useState(true);
  const [mentes, setMentes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  async function betolt() {
    setToltes(true);
    try {
      const d = await getKampany(id);
      setKampany(d.kampany);
      setResztvevok(d.resztvevok);
      setNev(d.kampany.nev);
      setLeiras(d.kampany.leiras ?? '');
      setStatusz(d.kampany.statusz);
      setKezdet(d.kampany.kezdet ?? '');
      setVege(d.kampany.vege ?? '');
      setHirdetesId(d.kampany.hirdetes_id ? String(d.kampany.hirdetes_id) : '');
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    betolt().catch(() => setToltes(false));
    getMunkak({ belso: '1' })
      .then((d) => setHirdetesek(d.sorok.map((h) => ({ id: h.id, cim: h.cim }))))
      .catch(() => setHirdetesek([]));
  }, [id]);

  useEffect(() => {
    const jelentkezesId = searchParams.get('jelentkezes');
    if (jelentkezesId && kampany) {
      setUjResztvevoNev(searchParams.get('nev') ?? '');
      setUjResztvevoEmail(searchParams.get('email') ?? '');
    }
  }, [searchParams, kampany]);

  async function ment() {
    if (!kampany) return;
    setMentes(true);
    try {
      const r = await mentKampany(kampany.id, {
        nev,
        leiras,
        statusz,
        kezdet: kezdet || undefined,
        vege: vege || undefined,
        hirdetes_id: hirdetesId ? Number(hirdetesId) : null,
      });
      setKampany(r.kampany);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  async function resztvevoHozzaad(e: React.FormEvent) {
    e.preventDefault();
    if (!kampany || !ujResztvevoNev.trim()) return;
    try {
      await kampanyResztvevoHozzaad({
        kampany_id: kampany.id,
        nev: ujResztvevoNev.trim(),
        email: ujResztvevoEmail || undefined,
        jelentkezes_id: searchParams.get('jelentkezes')
          ? Number(searchParams.get('jelentkezes'))
          : undefined,
      });
      setUjResztvevoNev('');
      setUjResztvevoEmail('');
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  if (toltes) return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  if (!kampany) {
    return (
      <div className="p-6">
        <p className="text-danger">{hiba ?? 'Kampány nem található'}</p>
        <Link to="/belso/toborzas/kampanyok" className="mt-2 inline-block text-sm text-gold">
          ← Vissza
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link to="/belso/toborzas/kampanyok" className="text-sm font-semibold text-gold hover:underline">
        ← Kampányok
      </Link>
      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      <div className="mt-4 rounded-card border border-border bg-card p-5">
        <h1 className="text-lg font-bold text-navy">Kampány részletei</h1>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Név
            <input className="field-input mt-1 w-full" value={nev} onChange={(e) => setNev(e.target.value)} />
          </label>
          <label className="block text-sm">
            Státusz
            <select className="field-input mt-1 w-full" value={statusz} onChange={(e) => setStatusz(e.target.value)}>
              {STATUSZOK.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Kezdet
            <input type="date" className="field-input mt-1 w-full" value={kezdet} onChange={(e) => setKezdet(e.target.value)} />
          </label>
          <label className="block text-sm">
            Vég
            <input type="date" className="field-input mt-1 w-full" value={vege} onChange={(e) => setVege(e.target.value)} />
          </label>
          <label className="block text-sm md:col-span-2">
            Kapcsolt hirdetés
            <select className="field-input mt-1 w-full" value={hirdetesId} onChange={(e) => setHirdetesId(e.target.value)}>
              <option value="">— nincs —</option>
              {hirdetesek.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.cim}
                </option>
              ))}
            </select>
            {kampany.hirdetes_cim && (
              <Link to={`/belso/toborzas/hirdetesek/${kampany.hirdetes_id}`} className="mt-1 inline-block text-xs text-gold hover:underline">
                Megnyitás: {kampany.hirdetes_cim}
              </Link>
            )}
          </label>
          <label className="block text-sm md:col-span-2">
            Leírás
            <textarea className="field-input mt-1 w-full" rows={2} value={leiras} onChange={(e) => setLeiras(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          disabled={mentes}
          onClick={ment}
          className="mt-3 rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {mentes ? 'Mentés…' : 'Mentés'}
        </button>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-navy">Kampány résztvevők</h2>
        <form onSubmit={resztvevoHozzaad} className="mt-3 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
          <input
            className="field-input min-w-[140px] flex-1"
            placeholder="Név"
            value={ujResztvevoNev}
            onChange={(e) => setUjResztvevoNev(e.target.value)}
            required
          />
          <input
            className="field-input min-w-[140px] flex-1"
            placeholder="E-mail"
            value={ujResztvevoEmail}
            onChange={(e) => setUjResztvevoEmail(e.target.value)}
          />
          <button type="submit" className="rounded-btn border border-border px-3 py-2 text-sm font-semibold">
            + Résztvevő
          </button>
        </form>
        {resztvevok.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Nincs résztvevő.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {resztvevok.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold text-navy">{r.nev}</span>
                  {r.email && <span className="ml-2 text-text-muted">{r.email}</span>}
                </div>
                <select
                  className="field-input py-1 text-xs"
                  value={r.statusz}
                  onChange={async (e) => {
                    await kampanyResztvevoMent(r.id, { statusz: e.target.value });
                    await betolt();
                  }}
                >
                  {['aktív', 'kilépett', 'jelölt'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
