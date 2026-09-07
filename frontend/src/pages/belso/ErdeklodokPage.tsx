import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRegisztraciok, type DiakRegisztracio } from '../../api/coop';
import { MuveletekMenu } from '../../components/belso/MuveletekMenu';
import { letoltRiport } from '../../utils/riport';

export function ErdeklodokPage() {
  const [sorok, setSorok] = useState<DiakRegisztracio[]>([]);
  const [hiba, setHiba] = useState<string | null>(null);
  const [toltes, setToltes] = useState(true);
  const [riportToltes, setRiportToltes] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getRegisztraciok()
      .then((d) => setSorok(d.sorok))
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Érdeklődő diákok</h1>
          <p className="text-sm text-text-muted">
            Diákportálról érkező regisztrációk — élő adatbázisból
          </p>
        </div>
        <MuveletekMenu
          muveletek={[
            {
              label: 'Érdeklődők export (CSV)',
              onClick: async () => {
                setRiportToltes(true);
                try {
                  await letoltRiport('erdeklodok');
                } catch (e) {
                  setHiba(e instanceof Error ? e.message : 'Riport hiba');
                } finally {
                  setRiportToltes(false);
                }
              },
              disabled: riportToltes,
            },
          ]}
        />
      </div>

      {toltes && <p className="text-sm text-text-muted">Betöltés…</p>}
      {hiba && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          {hiba}
        </p>
      )}

      {!toltes && !hiba && sorok.length === 0 && (
        <div className="rounded-card border border-border bg-card p-8 text-center text-sm text-text-muted">
          Még nincs regisztráció. Próbáld ki a{' '}
          <a href="/diak/regisztracio" className="text-gold underline">
            diákportál regisztrációt
          </a>
          .
        </div>
      )}

      {sorok.length > 0 && (
        <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-cream-muted">
              <tr>
                {['Név', 'E-mail', 'Telefon', 'Iroda', 'Iskola', 'Státusz', 'Regisztrálva'].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-border px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-text-muted"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sorok.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer border-b border-border hover:bg-cream-muted/50"
                  onClick={() => navigate(`/belso/erdeklodok/${s.id}`)}
                >
                  <td className="px-3 py-2.5 font-semibold text-navy">{s.nev}</td>
                  <td className="px-3 py-2.5">{s.email}</td>
                  <td className="px-3 py-2.5">{s.telefon}</td>
                  <td className="px-3 py-2.5">{s.iroda}</td>
                  <td className="px-3 py-2.5">{s.iskola ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                      {s.statusz}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">
                    {new Date(s.letrehozva).toLocaleString('hu-HU')}
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
