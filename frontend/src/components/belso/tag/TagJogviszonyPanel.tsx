import { useEffect, useState } from 'react';
import { generateNav08e, getJogviszonyok, ujJogviszony } from '../../../api/coop';

type Jogviszony = {
  id: number;
  relation_type: string;
  nav_declaration_required: boolean;
  start_date: string;
  end_date: string | null;
  status: string;
};

const RELATION_LABELS: Record<string, string> = {
  SCHOOL_COOP_MEMBER_WORK: 'Iskolaszövetkezeti tagi munka',
  EMPLOYMENT: 'Munkaviszony',
  ASSIGNMENT: 'Megbízás',
  SIMPLIFIED_EMPLOYMENT: 'Egyszerűsített foglalkoztatás',
  OTHER: 'Egyéb',
};

type Props = {
  tagId: number;
  szerkeszt?: boolean;
};

export function TagJogviszonyPanel({ tagId, szerkeszt }: Props) {
  const [sorok, setSorok] = useState<Jogviszony[]>([]);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujNyitva, setUjNyitva] = useState(false);
  const [relationType, setRelationType] = useState('EMPLOYMENT');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [navRequired, setNavRequired] = useState(true);
  const [generalas, setGeneralas] = useState<number | null>(null);

  async function betolt() {
    try {
      const d = await getJogviszonyok(tagId);
      setSorok(d.sorok);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  useEffect(() => {
    betolt();
  }, [tagId]);

  async function uj() {
    try {
      await ujJogviszony({
        tag_id: tagId,
        relation_type: relationType,
        nav_declaration_required: navRequired,
        start_date: startDate,
      });
      setUjNyitva(false);
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function gen08e(jv: Jogviszony) {
    setGeneralas(jv.id);
    try {
      const d = await generateNav08e({ tag_id: tagId, jogviszony_id: jv.id });
      window.location.href = `/belso/nav-bevallasok/${d.bevallas.id}`;
    } catch (e) {
      setHiba(e instanceof Error ? e.message : '08E generálás sikertelen');
    } finally {
      setGeneralas(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-navy">Jogviszonyok (08E / T1041)</h3>
        {szerkeszt && (
          <button
            type="button"
            onClick={() => setUjNyitva(!ujNyitva)}
            className="text-xs font-semibold text-gold hover:underline"
          >
            + Új jogviszony
          </button>
        )}
      </div>

      {hiba && <p className="text-xs text-[#B4402C]">{hiba}</p>}

      {ujNyitva && (
        <div className="rounded-lg border border-border bg-cream p-3 text-sm space-y-2">
          <select
            value={relationType}
            onChange={(e) => {
              setRelationType(e.target.value);
              setNavRequired(e.target.value !== 'SCHOOL_COOP_MEMBER_WORK');
            }}
            className="w-full rounded border border-border px-2 py-1"
          >
            {Object.entries(RELATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded border border-border px-2 py-1" />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={navRequired} onChange={(e) => setNavRequired(e.target.checked)} />
            NAV bejelentés kötelező (08E)
          </label>
          <button type="button" onClick={uj} className="rounded bg-gold px-3 py-1 text-xs font-bold text-white">Mentés</button>
        </div>
      )}

      {sorok.length === 0 ? (
        <p className="text-xs text-text-muted">Nincs rögzített jogviszony.</p>
      ) : (
        <ul className="space-y-2">
          {sorok.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-card px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{RELATION_LABELS[j.relation_type] ?? j.relation_type}</span>
                <span className="ml-2 text-xs text-text-muted">{j.start_date} — {j.status}</span>
                {j.nav_declaration_required && (
                  <span className="ml-2 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-navy">08E</span>
                )}
              </div>
              {j.nav_declaration_required && j.relation_type !== 'SCHOOL_COOP_MEMBER_WORK' && (
                <button
                  type="button"
                  disabled={generalas === j.id}
                  onClick={() => gen08e(j)}
                  className="text-xs font-semibold text-[#2C7BD6] hover:underline"
                >
                  {generalas === j.id ? 'Generálás…' : '08E generálás'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-text-muted">
        Iskolaszövetkezeti nappali tagi munkára alapértelmezetten nem kell biztosítotti bejelentés.
      </p>
    </div>
  );
}
