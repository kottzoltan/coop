import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getJelentkezes,
  getMunkak,
  jelentkezesMent,
  JELENTKEZES_STATUSZOK,
  tagErdeklodobol,
  type MunkaJelentkezes,
} from '../../api/coop';
import { nemErtemElHatralevoOrak } from '@coop/shared';

function statuszBadge(statusz: string) {
  const map: Record<string, string> = {
    Felvéve: 'bg-success-bg text-success',
    Elutasítva: 'bg-danger-bg text-danger',
    Interjú: 'bg-warning-bg text-warning',
    'Önéletrajzot várunk': 'bg-warning-bg text-warning',
    Kezeletlen: 'bg-cream-muted text-text-muted',
  };
  return map[statusz] ?? 'bg-cream-muted text-text-muted';
}

export function JelentkezesReszletPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const [sor, setSor] = useState<MunkaJelentkezes | null>(null);
  const [statusz, setStatusz] = useState('');
  const [megjegyzes, setMegjegyzes] = useState('');
  const [masHirdetesId, setMasHirdetesId] = useState('');
  const [hirdetesek, setHirdetesek] = useState<Array<{ id: number; cim: string }>>([]);
  const [toltes, setToltes] = useState(true);
  const [mentes, setMentes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [uzenet, setUzenet] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setToltes(true);
    Promise.all([getJelentkezes(id), getMunkak({ belso: '1' })])
      .then(([j, m]) => {
        setSor(j.sor);
        setStatusz(j.sor.statusz);
        setMegjegyzes(j.sor.megjegyzes ?? '');
        setMasHirdetesId(j.sor.mas_hirdetes_id ? String(j.sor.mas_hirdetes_id) : '');
        setHirdetesek(m.sorok.map((h) => ({ id: h.id, cim: h.cim })));
      })
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [id]);

  async function ment() {
    if (!sor) return;
    setMentes(true);
    setHiba(null);
    try {
      const r = await jelentkezesMent(sor.id, {
        statusz,
        megjegyzes: megjegyzes || null,
        mas_hirdetes_id: masHirdetesId ? Number(masHirdetesId) : null,
      });
      setSor(r.sor);
      setUzenet('Mentve.');
      setTimeout(() => setUzenet(null), 2000);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  async function felvetelTagkent() {
    if (!sor?.regisztracio_id) return;
    const adoszam = prompt('Adószám a tag felvételhez:');
    if (!adoszam?.trim()) return;
    try {
      const r = await tagErdeklodobol(sor.regisztracio_id, adoszam.trim());
      await jelentkezesMent(sor.id, { statusz: 'Felvéve' });
      navigate(`/belso/tagok/${r.tag.id}`);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Felvétel sikertelen');
    }
  }

  if (toltes) return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  if (!sor) {
    return (
      <div className="p-6">
        <p className="text-danger">{hiba ?? 'Jelentkezés nem található'}</p>
        <Link to="/belso/toborzas/jelentkezesek" className="mt-2 inline-block text-sm text-gold">
          ← Vissza
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link to="/belso/toborzas/jelentkezesek" className="text-sm font-semibold text-gold hover:underline">
        ← Vissza a jelentkezésekhez
      </Link>

      {uzenet && <p className="mt-3 text-sm font-semibold text-success">{uzenet}</p>}
      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      <div className="mt-4 rounded-card border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-navy">{sor.nev}</h1>
            <p className="text-sm text-text-muted">
              {sor.email}
              {sor.telefon && (
                <>
                  {' · '}
                  <a href={`tel:${sor.telefon}`} className="text-gold hover:underline">
                    {sor.telefon}
                  </a>
                </>
              )}
              {!sor.telefon && ' · —'}
            </p>
            <p className="mt-2">
              <Link
                to={`/belso/toborzas/hirdetesek/${sor.hirdetes_id}`}
                className="text-sm font-semibold text-gold hover:underline"
              >
                {sor.hirdetes_cim ?? `Hirdetés #${sor.hirdetes_id}`}
              </Link>
              {sor.hirdetes_varos && (
                <span className="ml-2 text-sm text-text-muted">{sor.hirdetes_varos}</span>
              )}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statuszBadge(sor.statusz)}`}>
            {sor.statusz}
          </span>
          {sor.statusz === 'Nem elérhető' && sor.nem_ertem_el_at && (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning">
              Visszaállítás: {nemErtemElHatralevoOrak(sor.nem_ertem_el_at, sor.hirdetes_nem_ertem_el)} óra múlva
            </span>
          )}
        </div>

        {sor.regisztracio_id && (
          <p className="mt-3 text-sm">
            Érdeklődő:{' '}
            <Link to={`/belso/erdeklodok/${sor.regisztracio_id}`} className="font-semibold text-gold">
              #{sor.regisztracio_id}
            </Link>
            {sor.diak_iroda && <span className="text-text-muted"> · {sor.diak_iroda}</span>}
          </p>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase text-text-muted">Státusz</span>
            <select className="field-input mt-1 w-full" value={statusz} onChange={(e) => setStatusz(e.target.value)}>
              {JELENTKEZES_STATUSZOK.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase text-text-muted">Más munkára ajánlás</span>
            <select
              className="field-input mt-1 w-full"
              value={masHirdetesId}
              onChange={(e) => setMasHirdetesId(e.target.value)}
            >
              <option value="">— nincs —</option>
              {hirdetesek
                .filter((h) => h.id !== sor.hirdetes_id)
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.cim}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-xs font-bold uppercase text-text-muted">Megjegyzés (belső)</span>
            <textarea
              className="field-input mt-1 w-full"
              rows={3}
              value={megjegyzes}
              onChange={(e) => setMegjegyzes(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={mentes}
            onClick={ment}
            className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {mentes ? 'Mentés…' : 'Mentés'}
          </button>
          {sor.regisztracio_id && sor.statusz !== 'Felvéve' && (
            <button
              type="button"
              onClick={felvetelTagkent}
              className="rounded-btn border border-border px-4 py-2 text-sm font-semibold"
            >
              Felvétel tagként
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-text-muted">
          Jelentkezés ideje: {new Date(sor.letrehozva).toLocaleString('hu-HU')}
        </p>
      </div>
    </div>
  );
}
