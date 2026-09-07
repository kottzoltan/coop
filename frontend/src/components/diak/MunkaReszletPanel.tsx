import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jelentkezes, type MunkaHirdetes } from '../../api/coop';
import { KapcsolatKartya, toborzoEmail } from './KapcsolatKartya';
import { IrodaKartya } from './IrodaKartya';
import { Napkorok } from './Napkorok';
import { RegisztracioForm } from './RegisztracioForm';
import { useAuth } from '../../context/AuthContext';
import { irodaVarosra } from '../../data/irodak';
import { berSzoveg, cimkekTomb, sorokbol } from './munka-utils';

const RESZLET_SZEKCIOK = [
  { id: 'allasrol', cim: 'Az állásról', mezo: 'eloszo_torzs' as const },
  { id: 'feladatok', cim: 'Feladatok', mezo: 'fobb_feladatok' as const },
  { id: 'jelolte', cim: 'Az ideális jelentkező', mezo: 'elvarasok' as const },
  { id: 'kinalunk', cim: 'Amit kínálunk', mezo: 'amit_kinalunk' as const },
  { id: 'elony', cim: 'Előnyt jelent', mezo: 'elonyt_jelent' as const },
];

function Szekcio({
  cim,
  sorok,
  szoveg,
}: {
  cim: string;
  sorok?: string[];
  szoveg?: string | null;
}) {
  const lista = sorok ?? sorokbol(szoveg);
  if (lista.length === 0 && !szoveg?.trim()) return null;

  return (
    <section className="scroll-mt-36">
      <h3 className="text-base font-bold text-navy">{cim}</h3>
      {lista.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-body">
          {lista.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-body">{szoveg}</p>
      )}
    </section>
  );
}

interface Props {
  munka: MunkaHirdetes;
  compact?: boolean;
}

export function MunkaReszletPanel({ munka, compact }: Props) {
  const { me, frissit } = useAuth();
  const diak = me?.szerep === 'diak' ? me.diak ?? null : null;
  const bejelentkezve = !!diak;

  const [aktivSzekcio, setAktivSzekcio] = useState('allasrol');
  const [regisztracioNyitva, setRegisztracioNyitva] = useState(false);
  const [jelentkezesNyitva, setJelentkezesNyitva] = useState(false);
  const [kuldes, setKuldes] = useState(false);
  const [kesz, setKesz] = useState(false);
  const [telefon, setTelefon] = useState('');

  useEffect(() => {
    setAktivSzekcio('allasrol');
    setRegisztracioNyitva(false);
    setJelentkezesNyitva(false);
    setKesz(false);
  }, [munka.id]);

  useEffect(() => {
    setTelefon(diak?.telefon ?? '');
  }, [diak?.telefon]);

  useEffect(() => {
    function hashAlapjan() {
      if (window.location.hash !== '#jelentkezes') return;
      document.getElementById('jelentkezes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!bejelentkezve) {
        setRegisztracioNyitva(true);
      } else if (!kesz) {
        setJelentkezesNyitva(true);
      }
    }
    hashAlapjan();
    window.addEventListener('hashchange', hashAlapjan);
    return () => window.removeEventListener('hashchange', hashAlapjan);
  }, [munka.id, bejelentkezve, kesz]);

  const iroda = irodaVarosra(munka.varos);
  const kapcsolatNev = munka.felelos ?? munka.toborzo ?? iroda.kapcsolat;
  const kapcsolatEmail = toborzoEmail(kapcsolatNev, iroda);
  const befejezo =
    munka.befejezo_szoveg?.trim() ||
    (munka.oneletrajz
      ? `Jelentkezni a ${kapcsolatEmail} címre lehet önéletrajzzal.`
      : null);

  const elerhetoSzekciok = RESZLET_SZEKCIOK.filter((s) => {
    const v = munka[s.mezo] ?? (s.mezo === 'amit_kinalunk' ? munka.leiras : null);
    return v?.trim();
  });

  async function handleJelentkezes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!diak) return;
    setKuldes(true);
    try {
      await jelentkezes({
        hirdetes_id: munka.id,
        nev: diak.nev,
        email: diak.email,
        telefon: munka.telefonszam ? telefon || diak.telefon : diak.telefon,
        regisztracio_id: diak.id,
      });
      setKesz(true);
    } finally {
      setKuldes(false);
    }
  }

  function jelentkezesCta() {
    if (!bejelentkezve) {
      if (regisztracioNyitva) {
        return (
          <div className="max-w-lg space-y-3">
            <RegisztracioForm
              mod="jelentkezes"
              onSuccess={async () => {
                await frissit();
                setRegisztracioNyitva(false);
                setJelentkezesNyitva(true);
              }}
            />
            <button
              type="button"
              onClick={() => setRegisztracioNyitva(false)}
              className="text-xs text-text-muted hover:underline"
            >
              Mégse
            </button>
            <p className="text-xs text-text-muted">
              Már van fiókod?{' '}
              <Link
                to="/diak/belepes"
                state={{ from: `/diak/munkak/${munka.id}#jelentkezes` }}
                className="font-semibold text-[#2C7BD6]"
              >
                Belépés
              </Link>
            </p>
          </div>
        );
      }

      return (
        <button
          type="button"
          onClick={() => setRegisztracioNyitva(true)}
          className="rounded-full bg-[#2C7BD6] px-8 py-3 text-sm font-bold text-white hover:bg-[#1a5fad]"
        >
          Jelentkezem erre a munkára
        </button>
      );
    }

    if (kesz) {
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-success-bg px-4 py-3 text-sm font-semibold text-success">
            Jelentkezésed rögzítve!
          </p>
          <Link to="/diak/profil" className="text-sm font-semibold text-[#2C7BD6] hover:underline">
            Jelentkezéseim →
          </Link>
        </div>
      );
    }

    if (jelentkezesNyitva) {
      return (
        <form onSubmit={handleJelentkezes} className="max-w-md space-y-3">
          <p className="text-sm text-text-body">
            Jelentkezés <strong>{diak?.nev}</strong> néven
          </p>
          {munka.oneletrajz && (
            <p className="text-xs text-text-muted">Önéletrajz csatolása szükséges a toborzótól.</p>
          )}
          {munka.telefonszam && (
            <label className="block text-sm">
              <span className="text-xs font-semibold text-text-muted">Telefonszám *</span>
              <input
                className="field-input mt-1 w-full"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                required
                placeholder="+36…"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={kuldes}
            className="rounded-full bg-[#2C7BD6] px-8 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {kuldes ? 'Küldés…' : 'Jelentkezem'}
          </button>
          <button
            type="button"
            onClick={() => setJelentkezesNyitva(false)}
            className="block text-xs text-text-muted hover:underline"
          >
            Mégse
          </button>
        </form>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setJelentkezesNyitva(true)}
        className="rounded-full bg-[#2C7BD6] px-8 py-3 text-sm font-bold text-white hover:bg-[#1a5fad]"
      >
        Jelentkezem erre a munkára
      </button>
    );
  }

  const cimkek = cimkekTomb(munka);

  return (
    <div className={compact ? 'flex h-full flex-col' : ''}>
      {/* Fejléc */}
      <div className="border-b border-border bg-card px-5 py-4 lg:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {munka.munkakor}
        </p>
        <h2 className="mt-1 text-xl font-bold text-navy md:text-2xl">{munka.cim}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-text-body">
            <span className="text-[#2C7BD6]">📍</span>
            {munka.varos}
          </span>
          <span className="font-bold text-navy">{berSzoveg(munka)}</span>
          {munka.munkaido && (
            <span className="text-text-muted">{munka.munkaido}</span>
          )}
        </div>
        {cimkek.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cimkek.map((c) => (
              <span
                key={c}
                className="rounded-md bg-[#EAF1F7] px-2 py-0.5 text-[11px] font-medium text-[#2C7BD6]"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Szekció tabok */}
      {elerhetoSzekciok.length > 1 && (
        <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 scrollbar-none">
          {elerhetoSzekciok.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setAktivSzekcio(s.id);
                document.getElementById(`munka-szekcio-${s.id}`)?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
              className={[
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                aktivSzekcio === s.id
                  ? 'bg-[#2C7BD6] text-white'
                  : 'bg-[#EAF1F7] text-[#2C7BD6] hover:bg-[#d9e8f5]',
              ].join(' ')}
            >
              {s.cim}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
          <div className="min-w-0 space-y-8">
            {munka.eloszo_fejlec && (
              <p className="text-sm font-semibold text-text-muted">{munka.eloszo_fejlec}</p>
            )}

            {elerhetoSzekciok.map((s) => {
              const szoveg =
                munka[s.mezo] ?? (s.mezo === 'amit_kinalunk' ? munka.leiras : null);
              return (
                <div key={s.id} id={`munka-szekcio-${s.id}`}>
                  <Szekcio cim={s.cim} szoveg={szoveg} />
                </div>
              );
            })}

            <Szekcio cim="Munkavégzés helye" szoveg={munka.munkavegzes_helye} />
            <Szekcio cim="Munkavégzés időpontja" szoveg={munka.munkavegzes_idopontja} />

            {munka.eloszo_lablec && (
              <p className="text-sm text-text-muted">{munka.eloszo_lablec}</p>
            )}

            <div id="jelentkezes" className="scroll-mt-36 border-t border-border pt-6">
              {befejezo && (
                <p className="mb-4 text-sm leading-relaxed text-text-body">{befejezo}</p>
              )}
              {jelentkezesCta()}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-border bg-[#fafbfc] p-4 text-sm">
              <Napkorok aktiv={munka.munkanapok} />
              {(munka.munkaido_leiras || munka.munkaido) && (
                <p className="mt-2 text-xs text-text-muted">
                  {munka.munkaido_leiras || munka.munkaido}
                </p>
              )}
              <p className="mt-3 font-semibold text-navy">{berSzoveg(munka)}</p>
              {munka.min_korhatar && (
                <p className="mt-1 text-xs text-text-muted">
                  Minimum korhatár: {munka.min_korhatar} év
                </p>
              )}
            </div>
            <IrodaKartya iroda={iroda} />
            <KapcsolatKartya nev={kapcsolatNev} email={kapcsolatEmail} />
          </aside>
        </div>
      </div>
    </div>
  );
}
