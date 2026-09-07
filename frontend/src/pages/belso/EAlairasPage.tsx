import { useCallback, useEffect, useState } from 'react';
import {
  getEAlairasKerelmek,
  getSzerzodesSablonok,
  mentEAlairasKerelem,
  ujEAlairasKerelem,
} from '../../api/coop';
import { SzerzodesSablonFeltolto } from '../../components/belso/SzerzodesSablonFeltolto';
import type { EAlairasKerelem, SzerzodesSablonMeta } from '@coop/shared';

const STATUSZOK = ['függőben', 'aláírva', 'elutasítva'];

type Sablonok = {
  keretszerzodes: SzerzodesSablonMeta | null;
  eseti_alap: SzerzodesSablonMeta | null;
};

export function EAlairasPage() {
  const [tab, setTab] = useState<'kerelmek' | 'sablonok'>('kerelmek');
  const [sorok, setSorok] = useState<EAlairasKerelem[]>([]);
  const [sablonok, setSablonok] = useState<Sablonok>({ keretszerzodes: null, eseti_alap: null });
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujDokumentum, setUjDokumentum] = useState('');

  const kerelmekBetolt = useCallback(async () => {
    const d = await getEAlairasKerelmek();
    setSorok(d.sorok);
  }, []);

  const sablonokBetolt = useCallback(async () => {
    const d = await getSzerzodesSablonok();
    setSablonok({
      keretszerzodes: d.sablonok.keretszerzodes,
      eseti_alap: d.sablonok.eseti_alap,
    });
  }, []);

  async function betolt() {
    setToltes(true);
    setHiba(null);
    try {
      if (tab === 'kerelmek') await kerelmekBetolt();
      else await sablonokBetolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => setToltes(false));
  }, [tab]);

  async function letrehoz(e: React.FormEvent) {
    e.preventDefault();
    if (!ujDokumentum.trim()) return;
    try {
      await ujEAlairasKerelem({ dokumentum_nev: ujDokumentum.trim() });
      setUjDokumentum('');
      await kerelmekBetolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function statuszValtas(id: number, statusz: string) {
    try {
      await mentEAlairasKerelem(id, { statusz });
      await kerelmekBetolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-navy">E-aláírás</h1>
      <p className="mt-1 text-sm text-text-muted">
        Digitális szerződés sablonok és aláírási kérelmek
      </p>

      <div className="mt-4 flex gap-2">
        {(
          [
            ['kerelmek', 'Aláírási kérelmek'],
            ['sablonok', 'Szerződés sablonok'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-btn px-3 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-navy text-white' : 'border border-border bg-card text-navy'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      {tab === 'sablonok' && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SzerzodesSablonFeltolto
            cim="Keretszerződés sablon"
            leiras="Globális tagsági / keretszerződés Word sablon — minden új felvételnél ezt kapja a diák aláírásra."
            tipus="keretszerzodes"
            sablon={sablonok.keretszerzodes}
            onFeltoltve={() => sablonokBetolt().catch(() => null)}
          />
          <SzerzodesSablonFeltolto
            cim="Eseti szerződés — alap sablon"
            leiras="Alapértelmezett eseti szerződés sablon, ha a projekthez nincs külön feltöltve."
            tipus="eseti_alap"
            sablon={sablonok.eseti_alap}
            onFeltoltve={() => sablonokBetolt().catch(() => null)}
          />
          <p className="lg:col-span-2 text-sm text-text-muted">
            Projekt-specifikus eseti sablon: Projekt részletek → <strong>Eseti szerződések</strong>{' '}
            fül.
          </p>
        </div>
      )}

      {tab === 'kerelmek' && (
        <>
          <form onSubmit={letrehoz} className="mt-4 flex gap-2">
            <input
              className="field-input flex-1"
              placeholder="Dokumentum neve…"
              value={ujDokumentum}
              onChange={(e) => setUjDokumentum(e.target.value)}
            />
            <button type="submit" className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white">
              + Kérelem
            </button>
          </form>

          {toltes ? (
            <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-card border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                  <tr>
                    <th className="px-3 py-2">Dokumentum</th>
                    <th className="px-3 py-2">Típus</th>
                    <th className="px-3 py-2">Tag</th>
                    <th className="px-3 py-2">Státusz</th>
                    <th className="px-3 py-2">Időbélyeg</th>
                    <th className="px-3 py-2">Dátum</th>
                  </tr>
                </thead>
                <tbody>
                  {sorok.map((k) => (
                    <tr key={k.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">
                        {k.blob_key ? (
                          <a
                            href={`/api/dokumentumok?key=${encodeURIComponent(k.blob_key)}`}
                            className="text-gold hover:underline"
                          >
                            {k.dokumentum_nev}
                          </a>
                        ) : (
                          k.dokumentum_nev
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-muted">{k.szerzodes_tipus ?? '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{k.tag_nev ?? '—'}</td>
                      <td className="px-3 py-2">
                        <select
                          className="field-input py-1 text-xs"
                          value={k.statusz}
                          onChange={(e) => statuszValtas(k.id, e.target.value)}
                        >
                          {STATUSZOK.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-text-muted">
                        {k.microsec_idobelyeg?.slice(0, 24) ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-muted">
                        {new Date(k.letrehozva).toLocaleDateString('hu-HU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
