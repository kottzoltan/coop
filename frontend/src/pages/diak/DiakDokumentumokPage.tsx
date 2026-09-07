import { useEffect, useState } from 'react';
import { getDiakM30 } from '../../api/coop';

export function DiakDokumentumokPage() {
  const ev = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(ev - 1);
  const [m30, setM30] = useState<Awaited<ReturnType<typeof getDiakM30>> | null>(null);
  const [toltes, setToltes] = useState(true);

  useEffect(() => {
    setToltes(true);
    getDiakM30(taxYear)
      .then(setM30)
      .finally(() => setToltes(false));
  }, [taxYear]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-navy">Dokumentumok</h1>
      <p className="mt-1 text-sm text-text-muted">M30 igazolás letöltése</p>

      <label className="mt-4 block text-sm font-medium text-navy">
        Adóév
        <select
          value={taxYear}
          onChange={(e) => setTaxYear(Number(e.target.value))}
          className="ml-2 rounded border border-border px-3 py-1.5"
        >
          {[ev, ev - 1, ev - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>

      {toltes ? (
        <p className="mt-6 text-sm text-text-muted">Betöltés…</p>
      ) : m30?.elerheto && m30.m30 ? (
        <div className="mt-6 rounded-card border border-border bg-white p-4">
          <h2 className="font-bold text-navy">M30 igazolás — {taxYear}</h2>
          <p className="mt-2 text-sm text-text-muted">
            Bruttó: {m30.m30.gross?.toLocaleString('hu-HU')} Ft · Levont SZJA: {m30.m30.szja?.toLocaleString('hu-HU')} Ft
          </p>
          {m30.m30.export_id && (
            <a
              href={`/api/diak-m30?tax_year=${taxYear}&bevallas_id=${m30.m30.bevallas_id}&export_id=${m30.m30.export_id}`}
              className="mt-4 inline-block rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
            >
              Letöltés (HTML)
            </a>
          )}
        </div>
      ) : (
        <p className="mt-6 text-sm text-text-muted">
          Ehhez az adóévre még nincs elérhető M30 igazolás. A szövetkezet az éves lezárás után generálja.
        </p>
      )}
    </div>
  );
}
