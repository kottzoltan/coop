import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getReszletesKereso } from '../../api/coop';

const MODULOK = [
  ['mind', 'Minden'],
  ['tagok', 'Tagok'],
  ['erdeklodok', 'Érdeklődők'],
  ['partnerek', 'Partnerek'],
  ['projektek', 'Projektek'],
  ['hirdetesek', 'Hirdetések'],
  ['jelentkezesek', 'Jelentkezések'],
  ['munkalapok', 'Munkalapok'],
] as const;

const LINK: Record<string, (r: Record<string, unknown>) => string> = {
  tagok: (r) => `/belso/tagok/${r.id}`,
  erdeklodok: (r) => `/belso/erdeklodok/${r.id}`,
  partnerek: (r) => `/belso/partnerek/${r.id}`,
  projektek: (r) => `/belso/projektek/${r.id}`,
  hirdetesek: (r) => `/belso/toborzas/hirdetesek/${r.id}`,
  jelentkezesek: (r) => `/belso/toborzas/jelentkezesek/${r.id}`,
  munkalapok: (r) => `/belso/berszamfejtes/${r.id}`,
};

const CIMKE: Record<string, string> = {
  tagok: 'Tag',
  erdeklodok: 'Érdeklődő',
  partnerek: 'Partner',
  projektek: 'Projekt',
  hirdetesek: 'Hirdetés',
  jelentkezesek: 'Jelentkezés',
  munkalapok: 'Munkalap',
};

function sorCimke(kulcs: string, r: Record<string, unknown>) {
  if (kulcs === 'tagok' || kulcs === 'erdeklodok' || kulcs === 'partnerek') return String(r.nev ?? '—');
  if (kulcs === 'projektek') return `${r.azonosito} — ${r.nev}`;
  if (kulcs === 'hirdetesek') return String(r.cim ?? '—');
  if (kulcs === 'jelentkezesek') return `${r.nev} (${r.hirdetes_cim ?? ''})`;
  if (kulcs === 'munkalapok') return `${r.azonosito} — ${r.szf_idoszak}`;
  return '—';
}

export function ReszletesKeresoPage() {
  const [q, setQ] = useState('');
  const [modul, setModul] = useState<string>('mind');
  const [eredmeny, setEredmeny] = useState<Record<string, Array<Record<string, unknown>>> | null>(null);
  const [osszes, setOsszes] = useState(0);
  const [toltes, setToltes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  async function keres(e?: React.FormEvent) {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setToltes(true);
    setHiba(null);
    try {
      const d = await getReszletesKereso(q.trim(), modul);
      setEredmeny(d.eredmeny);
      setOsszes(d.osszes);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Keresés sikertelen');
      setEredmeny(null);
    } finally {
      setToltes(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-auto bg-cream p-6">
      <h1 className="text-xl font-bold text-navy">Részletes kereső</h1>
      <p className="mt-1 text-sm text-text-muted">
        Keresés tagok, érdeklődők, partnerek, projektek, hirdetések, jelentkezések és munkalapok között (SAM #08).
      </p>

      <form onSubmit={keres} className="mt-4 flex flex-wrap gap-2 rounded-card border border-border bg-card p-4">
        <input
          className="field-input min-w-[200px] flex-1"
          placeholder="Név, e-mail, azonosító, cím…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field-input w-auto" value={modul} onChange={(e) => setModul(e.target.value)}>
          {MODULOK.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={toltes || q.trim().length < 2}
          className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {toltes ? 'Keresés…' : 'Keresés'}
        </button>
      </form>

      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      {eredmeny && (
        <p className="mt-4 text-sm text-text-muted">{osszes} találat</p>
      )}

      <div className="mt-4 space-y-6">
        {eredmeny &&
          Object.entries(eredmeny).map(([kulcs, sorok]) =>
            sorok.length === 0 ? null : (
              <section key={kulcs}>
                <h2 className="text-sm font-bold uppercase text-text-muted">{CIMKE[kulcs] ?? kulcs}</h2>
                <ul className="mt-2 space-y-1 rounded-card border border-border bg-card">
                  {sorok.map((r) => (
                    <li key={String(r.id)} className="border-b border-border last:border-0">
                      <Link
                        to={LINK[kulcs]?.(r) ?? '#'}
                        className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-cream-muted"
                      >
                        {sorCimke(kulcs, r)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
      </div>
    </div>
  );
}
