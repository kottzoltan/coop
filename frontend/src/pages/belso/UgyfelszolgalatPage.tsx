import { useEffect, useState } from 'react';
import {
  getUgyTicketek,
  mentUgyTicket,
  ujUgyTicket,
} from '../../api/coop';
import type { UgyTicket } from '@coop/shared';

const STATUSZOK = ['nyitott', 'folyamatban', 'lezárva'];

export function UgyfelszolgalatPage() {
  const [sorok, setSorok] = useState<UgyTicket[]>([]);
  const [nyitott, setNyitott] = useState(0);
  const [statuszSzuro, setStatuszSzuro] = useState('');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujTargy, setUjTargy] = useState('');
  const [ujLeiras, setUjLeiras] = useState('');

  async function betolt() {
    setToltes(true);
    try {
      const d = await getUgyTicketek(statuszSzuro || undefined);
      setSorok(d.sorok);
      setNyitott(d.nyitott);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => setToltes(false));
  }, [statuszSzuro]);

  async function letrehoz(e: React.FormEvent) {
    e.preventDefault();
    if (!ujTargy.trim()) return;
    try {
      await ujUgyTicket({ targy: ujTargy.trim(), leiras: ujLeiras || undefined });
      setUjTargy('');
      setUjLeiras('');
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function statuszValtas(id: number, statusz: string) {
    try {
      await mentUgyTicket(id, { statusz });
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-navy">Ügyfélszolgálat</h1>
      <p className="mt-1 text-sm text-text-muted">
        {nyitott} nyitott / folyamatban ticket
      </p>
      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      <form onSubmit={letrehoz} className="mt-4 rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-navy">Új ticket</h2>
        <input
          className="field-input mt-2 w-full"
          placeholder="Tárgy"
          value={ujTargy}
          onChange={(e) => setUjTargy(e.target.value)}
          required
        />
        <textarea
          className="field-input mt-2 w-full"
          rows={2}
          placeholder="Leírás"
          value={ujLeiras}
          onChange={(e) => setUjLeiras(e.target.value)}
        />
        <button type="submit" className="mt-2 rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white">
          Rögzítés
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatuszSzuro('')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!statuszSzuro ? 'bg-gold text-white' : 'bg-cream-muted'}`}
        >
          Mind
        </button>
        {STATUSZOK.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatuszSzuro(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statuszSzuro === s ? 'bg-gold text-white' : 'bg-cream-muted'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {toltes ? (
        <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {sorok.map((t) => (
            <li key={t.id} className="rounded-card border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-navy">{t.targy}</p>
                  <p className="text-xs text-text-muted">
                    #{t.id} · {t.prioritas} · {t.hozzarendelt ?? '—'}
                  </p>
                </div>
                <select
                  className="field-input py-1 text-xs"
                  value={t.statusz}
                  onChange={(e) => statuszValtas(t.id, e.target.value)}
                >
                  {STATUSZOK.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {t.leiras && <p className="mt-2 text-text-body">{t.leiras}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
