import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  diakMuszakLemondas,
  getDiakBeosztasok,
  type DiakBeosztasSor,
} from '../../api/coop';

function statuszSzin(statusz: string) {
  if (statusz === 'lemondva' || statusz === 'lemondás_kérvényezve') {
    return 'text-danger';
  }
  if (statusz === 'beosztva') return 'text-success';
  return 'text-text-muted';
}

function formatAblak(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('hu-HU', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DiakBeosztasPage() {
  const { me } = useAuth();
  const [sorok, setSorok] = useState<DiakBeosztasSor[]>([]);
  const [lezarasOra, setLezarasOra] = useState(24);
  const [toltes, setToltes] = useState(true);
  const [lemondasId, setLemondasId] = useState<number | null>(null);
  const [mentesId, setMentesId] = useState<number | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);
  const [uzenet, setUzenet] = useState<string | null>(null);

  async function betolt() {
    setToltes(true);
    try {
      const d = await getDiakBeosztasok();
      setSorok(d.sorok ?? []);
      setLezarasOra(d.lezarasOra ?? 24);
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => setToltes(false));
  }, [me]);

  async function jelenletRogzit(beosztasId: number, tipus: 'erkezes' | 'tavozas') {
    setHiba(null);
    setUzenet(null);
    setMentesId(beosztasId);

    let gps_lat: string | undefined;
    let gps_lng: string | undefined;
    const sor = sorok.find((s) => s.beosztas.id === beosztasId);
    const gpsKotelezo = sor?.checkin?.gps_kotelezo;

    if (!navigator.geolocation) {
      if (gpsKotelezo) {
        setHiba('GPS kötelező ehhez a műszakhoz, de a böngésző nem támogatja a helyzetmeghatározást.');
        setMentesId(null);
        return;
      }
    } else {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12_000,
            maximumAge: 15_000,
          }),
        );
        gps_lat = String(pos.coords.latitude);
        gps_lng = String(pos.coords.longitude);
      } catch {
        if (gpsKotelezo) {
          setHiba(
            'GPS kötelező — engedd a helyzetmeghatározást, és légy a munkavégzés helyszínén.',
          );
          setMentesId(null);
          return;
        }
      }
    }

    try {
      const res = await fetch('/api/jelenlet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beosztas_id: beosztasId, tipus, gps_lat, gps_lng }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        hiba?: string;
        hibak?: string[];
        gps_tavolsag_m?: number | null;
      };
      if (!res.ok) {
        setHiba(json.hibak?.[0] ?? json.hiba ?? 'Jelenlét rögzítése sikertelen');
        return;
      }
      const tav = json.gps_tavolsag_m != null ? ` GPS távolság: ${json.gps_tavolsag_m} m.` : '';
      setUzenet((tipus === 'erkezes' ? 'Érkezés rögzítve.' : 'Távozás rögzítve.') + tav);
      await betolt();
    } finally {
      setMentesId(null);
    }
  }

  async function lemondas(beosztasId: number, kerelem: boolean) {
    const szoveg = kerelem
      ? 'Lemondási kérelmet küldünk a mentorodnak. Folytatod?'
      : 'Biztosan lemondod a műszakot?';
    if (!confirm(szoveg)) return;

    setLemondasId(beosztasId);
    setHiba(null);
    setUzenet(null);
    try {
      const r = await diakMuszakLemondas(beosztasId);
      setUzenet(r.uzenet);
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Lemondás sikertelen');
    } finally {
      setLemondasId(null);
    }
  }

  const aktivSorok = sorok.filter(
    (s) => !['lemondva', 'lemondás_kérvényezve'].includes(s.beosztas.statusz),
  );
  const lemondottSorok = sorok.filter((s) =>
    ['lemondva', 'lemondás_kérvényezve'].includes(s.beosztas.statusz),
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-bold text-navy">Beosztásaim</h1>
      <p className="mt-2 text-sm text-text-body">
        Jelenlét rögzítés időablakkal{gpsHint(aktivSorok)} — lemondás a kezdés előtt {lezarasOra}{' '}
        órával
      </p>

      {uzenet && (
        <p className="mt-4 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">{uzenet}</p>
      )}
      {hiba && (
        <p className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>
      )}

      {toltes ? (
        <p className="mt-6 text-sm text-text-muted">Betöltés…</p>
      ) : sorok.length === 0 ? (
        <p className="mt-6 rounded-card border border-border bg-card p-6 text-sm text-text-muted">
          Még nincs beosztásod.{' '}
          <Link to="/diak/munkak" className="font-semibold text-melodiak-blue">
            Munkák böngészése
          </Link>
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {aktivSorok.map((s) => {
            const c = s.checkin;
            const erkezesTiltva = c ? !c.erkezes_nyitva : false;
            const tavozasTiltva = c ? !c.tavozas_nyitva : false;
            return (
              <article key={s.beosztas.id} className="rounded-card border border-border bg-card p-5">
                <h2 className="font-bold text-navy">{s.muszak.cim}</h2>
                <p className="mt-1 text-sm text-text-muted">
                  {s.muszak.datum} · {s.muszak.kezdet}–{s.muszak.vege}
                  {s.muszak.hely && ` · ${s.muszak.hely}`}
                </p>
                <p className={`mt-2 text-xs font-semibold ${statuszSzin(s.beosztas.statusz)}`}>
                  Státusz: {s.beosztas.statusz}
                </p>

                {c && (
                  <div className="mt-3 space-y-1 rounded-lg bg-cream-muted px-3 py-2 text-xs text-text-body">
                    <p>
                      Érkezés ablak: {formatAblak(c.erkezes_ablak.nyitas)} –{' '}
                      {formatAblak(c.erkezes_ablak.zaras)}
                      {c.erkezes_nyitva ? (
                        <span className="ml-2 font-semibold text-success">nyitva</span>
                      ) : (
                        <span className="ml-2 font-semibold text-danger">zárva</span>
                      )}
                    </p>
                    <p>
                      Távozás ablak: {formatAblak(c.tavozas_ablak.nyitas)} –{' '}
                      {formatAblak(c.tavozas_ablak.zaras)}
                      {c.tavozas_nyitva ? (
                        <span className="ml-2 font-semibold text-success">nyitva</span>
                      ) : (
                        <span className="ml-2 font-semibold text-danger">zárva</span>
                      )}
                    </p>
                    <p>
                      GPS:{' '}
                      {c.gps_kotelezo
                        ? `kötelező (max. ${c.gps_sugar_m} m a helyszíntől)`
                        : 'opcionális (nincs koordináta a műszakhoz)'}
                    </p>
                    {!c.erkezes_nyitva && c.erkezes_uzenet && (
                      <p className="text-danger">{c.erkezes_uzenet}</p>
                    )}
                    {!c.tavozas_nyitva && c.tavozas_uzenet && (
                      <p className="text-danger">{c.tavozas_uzenet}</p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={erkezesTiltva || mentesId === s.beosztas.id}
                    onClick={() => jelenletRogzit(s.beosztas.id, 'erkezes')}
                    className="btn-melodiak text-xs disabled:opacity-50"
                  >
                    {mentesId === s.beosztas.id ? 'GPS…' : 'Érkezés'}
                  </button>
                  <button
                    type="button"
                    disabled={tavozasTiltva || mentesId === s.beosztas.id}
                    onClick={() => jelenletRogzit(s.beosztas.id, 'tavozas')}
                    className="rounded-btn border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    Távozás
                  </button>
                  {s.lemondhato ? (
                    <button
                      type="button"
                      disabled={lemondasId === s.beosztas.id}
                      onClick={() => lemondas(s.beosztas.id, !!s.lemondasKerelem)}
                      className="rounded-btn border border-danger px-4 py-2 text-xs font-semibold text-danger hover:bg-danger-bg disabled:opacity-60"
                    >
                      {lemondasId === s.beosztas.id
                        ? 'Feldolgozás…'
                        : s.lemondasKerelem
                          ? 'Lemondás kérése'
                          : 'Műszak lemondása'}
                    </button>
                  ) : (
                    s.lemondasIndok && (
                      <span className="self-center text-xs text-text-muted">{s.lemondasIndok}</span>
                    )
                  )}
                </div>
              </article>
            );
          })}

          {lemondottSorok.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-bold uppercase text-text-muted">Lemondott műszakok</h2>
              <div className="mt-3 space-y-2">
                {lemondottSorok.map((s) => (
                  <div
                    key={s.beosztas.id}
                    className="rounded-lg border border-border bg-cream-muted px-4 py-3 text-sm opacity-75"
                  >
                    <span className="font-medium text-navy">{s.muszak.cim}</span>
                    <span className="text-text-muted">
                      {' '}
                      · {s.muszak.datum} {s.muszak.kezdet}–{s.muszak.vege} · {s.beosztas.statusz}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function gpsHint(sorok: DiakBeosztasSor[]) {
  if (sorok.some((s) => s.checkin?.gps_kotelezo)) return ' és GPS ellenőrzéssel';
  return '';
}
