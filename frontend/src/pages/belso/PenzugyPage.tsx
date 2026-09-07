import { useEffect, useState } from 'react';
import { getPenzugySzamlak, mentPenzugySzamla } from '../../api/coop';
import type { PenzugySzamla } from '@coop/shared';

function ft(n: number) {
  return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
}

const STATUSZOK = ['piszkozat', 'jóváhagyott', 'kiszámlázva', 'törölve'];

export function PenzugyPage() {
  const [sorok, setSorok] = useState<PenzugySzamla[]>([]);
  const [statuszSzuro, setStatuszSzuro] = useState('');
  const [folyoszamlaDb, setFolyoszamlaDb] = useState(0);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [mentesId, setMentesId] = useState<number | null>(null);

  async function betolt() {
    setToltes(true);
    try {
      const d = await getPenzugySzamlak(statuszSzuro || undefined);
      setSorok(d.sorok);
      setFolyoszamlaDb(d.folyoszamla_db);
      setHiba(null);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => setToltes(false));
  }, [statuszSzuro]);

  async function statuszValtas(id: number, statusz: string) {
    setMentesId(id);
    try {
      await mentPenzugySzamla(id, { statusz });
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentesId(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-navy">Pénzügy — számlázás</h1>
      <p className="mt-1 text-sm text-text-muted">
        Automatikus számlázás piszkozatok a jóváhagyott munkalapokból · folyószámlán: {folyoszamlaDb} munkalap
      </p>

      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatuszSzuro('')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!statuszSzuro ? 'bg-gold text-white' : 'bg-cream-muted text-text-muted'}`}
        >
          Mind
        </button>
        {STATUSZOK.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatuszSzuro(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statuszSzuro === s ? 'bg-gold text-white' : 'bg-cream-muted text-text-muted'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {toltes ? (
        <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
      ) : sorok.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
          Nincs számla piszkozat. Automatikus számlázás esetén a jóváhagyott munkalapok itt jelennek meg.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream-muted text-left text-[11px] uppercase text-text-muted">
              <tr>
                <th className="px-3 py-2">Munkalap</th>
                <th className="px-3 py-2">Projekt</th>
                <th className="px-3 py-2">Összeg</th>
                <th className="px-3 py-2">Státusz</th>
                <th className="px-3 py-2">Megjegyzés</th>
                <th className="px-3 py-2">Létrehozva</th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold text-navy">{s.munkalap_azonosito}</td>
                  <td className="px-3 py-2">
                    {s.projekt_azonosito} — {s.projekt_nev}
                  </td>
                  <td className="px-3 py-2">{ft(s.osszeg)}</td>
                  <td className="px-3 py-2">
                    <select
                      className="field-input py-1 text-xs"
                      value={s.statusz}
                      disabled={mentesId === s.id}
                      onChange={(e) => statuszValtas(s.id, e.target.value)}
                    >
                      {STATUSZOK.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">{s.megjegyzes ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {new Date(s.letrehozva).toLocaleDateString('hu-HU')}
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
