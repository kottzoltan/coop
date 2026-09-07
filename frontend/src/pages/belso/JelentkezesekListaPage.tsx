import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getJelentkezesek,
  getMunka,
  jelentkezesStatusz,
  JELENTKEZES_STATUSZOK,
  type MunkaJelentkezes,
} from '../../api/coop';
import { nemErtemElHatralevoOrak } from '@coop/shared';
import { MuveletekMenu } from '../../components/belso/MuveletekMenu';
import { letoltRiport } from '../../utils/riport';

export function JelentkezesekListaPage() {
  const [params] = useSearchParams();
  const hirdetesFilter = params.get('hirdetes');
  const [sorok, setSorok] = useState<MunkaJelentkezes[]>([]);
  const [hirdetesCim, setHirdetesCim] = useState<string | null>(null);
  const [statuszSzuro, setStatuszSzuro] = useState('');
  const [keres, setKeres] = useState('');
  const [kijelolt, setKijelolt] = useState<Set<number>>(new Set());
  const [bulkStatusz, setBulkStatusz] = useState<string>(JELENTKEZES_STATUSZOK[0]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [riportToltes, setRiportToltes] = useState(false);

  async function betolt() {
    setToltes(true);
    setHiba(null);
    try {
      const d = await getJelentkezesek({
        hirdetes_id: hirdetesFilter ? Number(hirdetesFilter) : undefined,
        statusz: statuszSzuro || undefined,
        keres: keres || undefined,
      });
      setSorok(d.sorok ?? []);
      if (hirdetesFilter) {
        try {
          const h = await getMunka(Number(hirdetesFilter), true);
          setHirdetesCim(h.sor.cim);
        } catch {
          setHirdetesCim(null);
        }
      } else {
        setHirdetesCim(null);
      }
    } catch (e) {
      setSorok([]);
      setHiba(e instanceof Error ? e.message : 'Jelentkezések betöltése sikertelen');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    setKijelolt(new Set());
    betolt();
  }, [hirdetesFilter, statuszSzuro, keres]);

  async function statuszValtas(id: number, statusz: string) {
    await jelentkezesStatusz(id, statusz);
    await betolt();
  }

  async function tomegesStatusz() {
    if (kijelolt.size === 0) return;
    await Promise.all([...kijelolt].map((id) => jelentkezesStatusz(id, bulkStatusz)));
    setKijelolt(new Set());
    await betolt();
  }

  function toggleKijelolt(id: number) {
    setKijelolt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {hirdetesFilter ? (
            <>
              <Link
                to="/belso/toborzas/hirdetesek"
                className="text-sm font-semibold text-gold hover:underline"
              >
                ← Vissza a hirdetésekhez
              </Link>
              <h2 className="mt-2 text-lg font-bold text-navy">Jelentkezők</h2>
              <p className="mt-1 text-sm text-text-muted">
                {hirdetesCim ?? `Hirdetés #${hirdetesFilter}`} — {sorok.length} jelentkezés
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-navy">Összes jelentkezés</h2>
              <p className="mt-1 text-sm text-text-muted">{sorok.length} jelentkezés</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MuveletekMenu
            muveletek={[
              {
                label: 'Jelentkezések export (CSV)',
                onClick: async () => {
                  setRiportToltes(true);
                  try {
                    await letoltRiport(
                      'jelentkezesek',
                      hirdetesFilter ? { hirdetes_id: hirdetesFilter } : {},
                    );
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setRiportToltes(false);
                  }
                },
                disabled: riportToltes,
              },
            ]}
          />
          {hirdetesFilter && (
            <Link
              to={`/belso/toborzas/hirdetesek/${hirdetesFilter}`}
              className="rounded-btn border border-border px-3 py-2 text-sm font-semibold hover:bg-card"
            >
              Hirdetés szerkesztése
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="field-input min-w-[180px] flex-1"
          placeholder="Keresés név, e-mail, hirdetés…"
          value={keres}
          onChange={(e) => setKeres(e.target.value)}
        />
        <select
          className="field-input w-auto"
          value={statuszSzuro}
          onChange={(e) => setStatuszSzuro(e.target.value)}
        >
          <option value="">Minden státusz</option>
          {JELENTKEZES_STATUSZOK.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {sorok.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm">
          <span className="text-text-muted">Tömeges állapotváltozás:</span>
          <select
            className="field-input w-auto py-1"
            value={bulkStatusz}
            onChange={(e) => setBulkStatusz(e.target.value)}
          >
            {JELENTKEZES_STATUSZOK.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={tomegesStatusz}
            disabled={kijelolt.size === 0}
            className="rounded-btn border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          >
            Alkalmaz ({kijelolt.size})
          </button>
        </div>
      )}

      {hiba && (
        <p className="mt-4 rounded-card border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          {hiba}
        </p>
      )}

      {toltes ? (
        <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
      ) : !hiba && sorok.length === 0 ? (
        <p className="mt-4 rounded-card border border-border bg-card p-8 text-center text-sm text-text-muted">
          {hirdetesFilter
            ? 'Ehhez a hirdetéshez még nincs jelentkezés.'
            : 'Még nincs jelentkezés. Próbáld ki a diákportál munkakeresőjét.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                <th className="w-8 px-2 py-2" />
                <th className="px-3 py-2">Név</th>
                <th className="px-3 py-2">E-mail</th>
                <th className="px-3 py-2">Telefon</th>
                {!hirdetesFilter && <th className="px-3 py-2">Hirdetés</th>}
                <th className="px-3 py-2">Dátum</th>
                <th className="px-3 py-2">Státusz</th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((s) => (
                <tr key={s.id} className="border-b border-border hover:bg-cream-muted/40">
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={kijelolt.has(s.id)}
                      onChange={() => toggleKijelolt(s.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/belso/toborzas/jelentkezesek/${s.id}`}
                      className="font-semibold text-navy hover:text-gold"
                    >
                      {s.nev}
                    </Link>
                    {s.regisztracio_id && (
                      <Link
                        to={`/belso/erdeklodok/${s.regisztracio_id}`}
                        className="text-xs text-gold hover:underline"
                      >
                        Diák #{s.regisztracio_id}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-2">{s.email}</td>
                  <td className="px-3 py-2 text-text-muted">{s.telefon ?? '—'}</td>
                  {!hirdetesFilter && (
                    <td className="px-3 py-2">
                      <Link
                        to={`/belso/toborzas/jelentkezesek?hirdetes=${s.hirdetes_id}`}
                        className="font-medium text-navy hover:text-gold"
                      >
                        {s.hirdetes_cim ?? `#${s.hirdetes_id}`}
                      </Link>
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {new Date(s.letrehozva).toLocaleString('hu-HU')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="field-input py-1 text-xs"
                        value={s.statusz}
                        onChange={(e) => statuszValtas(s.id, e.target.value)}
                      >
                        {JELENTKEZES_STATUSZOK.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      {s.statusz === 'Nem elérhető' && s.nem_ertem_el_at && (
                        <span className="rounded-md bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning">
                          {nemErtemElHatralevoOrak(s.nem_ertem_el_at, s.hirdetes_nem_ertem_el)} óra
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
