import { useEffect, useState } from 'react';
import {
  getBlogBejegyzesek,
  mentBlogBejegyzes,
  ujBlogBejegyzes,
} from '../../api/coop';
import type { BlogBejegyzes } from '@coop/shared';

export function BlogPage() {
  const [sorok, setSorok] = useState<BlogBejegyzes[]>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujCim, setUjCim] = useState('');

  async function betolt() {
    setToltes(true);
    try {
      const d = await getBlogBejegyzesek();
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
    if (!ujCim.trim()) return;
    try {
      await ujBlogBejegyzes({ cim: ujCim.trim() });
      setUjCim('');
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function publikal(id: number) {
    try {
      await mentBlogBejegyzes(id, { statusz: 'publikált' });
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-navy">Blog / hírek</h1>
      <p className="mt-1 text-sm text-text-muted">Belső tartalomkezelés — diákportál hírek alapja</p>
      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      <form onSubmit={letrehoz} className="mt-4 flex gap-2">
        <input
          className="field-input flex-1"
          placeholder="Új bejegyzés címe…"
          value={ujCim}
          onChange={(e) => setUjCim(e.target.value)}
        />
        <button type="submit" className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white">
          + Piszkozat
        </button>
      </form>

      {toltes ? (
        <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {sorok.map((b) => (
            <li key={b.id} className="rounded-card border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-navy">{b.cim}</p>
                  <p className="text-xs text-text-muted">
                    {b.statusz} · {b.szerzo ?? '—'} · {new Date(b.letrehozva).toLocaleDateString('hu-HU')}
                  </p>
                </div>
                {b.statusz !== 'publikált' && (
                  <button
                    type="button"
                    onClick={() => publikal(b.id)}
                    className="text-xs font-semibold text-gold hover:underline"
                  >
                    Publikálás
                  </button>
                )}
              </div>
              {b.tartalom && <p className="mt-2 text-sm text-text-body line-clamp-3">{b.tartalom}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
