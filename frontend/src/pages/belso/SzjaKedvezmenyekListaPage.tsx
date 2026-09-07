import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSzjaKedvezmenyLista, type SzjaKedvezmenyListaSor } from '../../api/coop';
import { SZJA_KEDVEZMENY_LABEL } from '@coop/shared';

export function SzjaKedvezmenyekListaPage() {
  const [sorok, setSorok] = useState<SzjaKedvezmenyListaSor[]>([]);
  const [toltes, setToltes] = useState(true);

  useEffect(() => {
    getSzjaKedvezmenyLista()
      .then((d) => setSorok(d.sorok))
      .finally(() => setToltes(false));
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <h1 className="text-xl font-bold text-navy">SZJA kedvezmények</h1>
      <p className="mt-1 text-sm text-text-muted">
        Aktív kedvezmény nyilatkozatok — FK #05. Szerkesztés a tag adatlapon.
      </p>

      <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-card border border-border bg-card">
        {toltes ? (
          <p className="p-6 text-sm text-text-muted">Betöltés…</p>
        ) : sorok.length === 0 ? (
          <p className="p-6 text-sm text-text-muted">Nincs aktív kedvezmény.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-border bg-cream-muted text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Típus</th>
                <th className="px-4 py-3">Érvényes</th>
                <th className="px-4 py-3">Havi összeg</th>
                <th className="px-4 py-3">Státusz</th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((k) => (
                <tr key={`${k.tag_id}-${k.id}`} className="border-b border-border/60 hover:bg-cream/80">
                  <td className="px-4 py-3">
                    <Link to={`/belso/tagok/${k.tag_id}`} className="font-medium text-[#2C7BD6] hover:underline">
                      {k.tag_nev}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{SZJA_KEDVEZMENY_LABEL[k.tipus] ?? k.tipus}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {k.ervenyes_tol}{k.ervenyes_ig ? ` → ${k.ervenyes_ig}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {k.havi_adokedvezmeny != null ? `${k.havi_adokedvezmeny.toLocaleString('hu-HU')} Ft` : '—'}
                  </td>
                  <td className="px-4 py-3">{k.statusz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
