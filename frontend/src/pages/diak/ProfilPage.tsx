import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  getDiakProfil,
  mentDiakProfil,
  type MunkaJelentkezes,
} from '../../api/coop';
import { useAuth } from '../../context/AuthContext';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';
import { DiakAlairasPanel } from '../../components/diak/DiakAlairasPanel';
import { ProfilKeszultsegKartya } from '../../components/diak/profil/ProfilKeszultsegKartya';
import { DiakProfilKitoltes } from '../../components/diak/profil/DiakProfilKitoltes';
import {
  normalizaltDiakProfil,
  profilKeszultseg,
  type DiakProfilPayload,
  type HianyzoSzekcioId,
} from '@coop/shared';

function statuszSzin(statusz: string) {
  if (statusz === 'Felvéve') return 'bg-success-bg text-success';
  if (statusz === 'Elutasítva' || statusz === 'Visszamondta') return 'bg-danger-bg text-danger';
  if (statusz === 'Interjú' || statusz === 'Önéletrajzot várunk') return 'bg-warning-bg text-warning';
  return 'bg-cream-muted text-text-body';
}

const SZEKCIO_ANCHOR: Record<HianyzoSzekcioId, string> = {
  oneletrajz: 'szekcio-oneletrajz',
  bemutatkozas: 'szekcio-bemutatkozas',
  keszsegek: 'szekcio-keszsegek',
  tapasztalat: 'szekcio-tapasztalat',
  tanulmany: 'szekcio-tanulmany',
  social: 'szekcio-social',
  rareres: 'szekcio-rareres',
};

export function ProfilPage() {
  const { me, loading, kijelentkezes } = useAuth();
  const diak = me?.szerep === 'diak' ? me.diak ?? null : null;
  const bejelentkezve = !!diak;
  const [profil, setProfil] = useState<DiakProfilPayload | null>(null);
  const [jelentkezesek, setJelentkezesek] = useState<MunkaJelentkezes[]>([]);
  const [toltes, setToltes] = useState(true);
  const [mentes, setMentes] = useState(false);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);
  const [fuggobenAlairas, setFuggobenAlairas] = useState(0);
  const [alairasModal, setAlairasModal] = useState(false);

  const betolt = useCallback(async () => {
    if (!diak) return;
    setToltes(true);
    try {
      const d = await getDiakProfil(diak.id);
      setProfil(normalizaltDiakProfil(d.profil));
      setJelentkezesek(d.jelentkezesek);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Betöltés sikertelen');
    } finally {
      setToltes(false);
    }
  }, [diak]);

  useEffect(() => {
    betolt().catch(console.error);
  }, [betolt]);

  useEffect(() => {
    if (fuggobenAlairas > 0) setAlairasModal(true);
  }, [fuggobenAlairas]);

  useEffect(() => {
    if (window.location.hash === '#alairas') {
      setAlairasModal(true);
      document.getElementById('alairas')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const keszultseg = useMemo(
    () => (profil ? profilKeszultseg(profil) : { szazalek: 0, hianyzik: [] }),
    [profil],
  );

  const mentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function profilMentAzonnal(p: DiakProfilPayload) {
    setProfil(p);
    setMentes(true);
    setHiba(null);
    try {
      const d = await mentDiakProfil(p);
      setProfil(normalizaltDiakProfil(d.profil));
      setUzenet('Mentve.');
      setTimeout(() => setUzenet(null), 2000);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  const profilMent = useCallback(
    (p: DiakProfilPayload, azonnal = false) => {
      setProfil(p);
      if (mentTimer.current) clearTimeout(mentTimer.current);
      if (azonnal) {
        profilMentAzonnal(p).catch(console.error);
        return;
      }
      mentTimer.current = setTimeout(() => {
        profilMentAzonnal(p).catch(console.error);
      }, 700);
    },
    [diak],
  );

  function gorgetesHianyzohoz() {
    const elso = keszultseg.hianyzik[0];
    if (!elso) {
      document.getElementById('profil-szekciok')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    document.getElementById(SZEKCIO_ANCHOR[elso.id])?.scrollIntoView({ behavior: 'smooth' });
  }

  if (loading || toltes) {
    return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  }

  if (!bejelentkezve || !diak || !profil) {
    return <Navigate to="/diak/belepes" replace />;
  }

  const keresztnev = diak.nev.trim().split(/\s+/)[0] ?? diak.nev;

  return (
    <MelodiakPageShell
      title="Profil"
      subtitle={diak.email}
      eyebrow="Diákportál"
      heroSize="sm"
      maxWidth="3xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-text-muted">
          {uzenet && <span className="font-semibold text-success">{uzenet}</span>}
          {hiba && <span className="text-danger">{hiba}</span>}
        </div>
        <button
          type="button"
          onClick={() => kijelentkezes()}
          className="rounded-btn border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-cream-muted"
        >
          Kijelentkezés
        </button>
      </div>

      <div className="mt-6">
        <ProfilKeszultsegKartya
          nev={keresztnev}
          szazalek={keszultseg.szazalek}
          hianyzik={keszultseg.hianyzik}
          onKitoltes={gorgetesHianyzohoz}
        />
      </div>

      {fuggobenAlairas > 0 && (
        <div className="mt-6 rounded-card border border-warning bg-warning-bg px-4 py-3 text-sm text-warning">
          <strong>{fuggobenAlairas} szerződés</strong> vár digitális aláírásra — görgesd le az{' '}
          <a href="#alairas" className="font-semibold underline">
            Aláírás szekcióhoz
          </a>
          , vagy{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => setAlairasModal(true)}
          >
            nyisd meg itt
          </button>
          .
        </div>
      )}

      <div className="mt-8">
        <DiakAlairasPanel
          onValtozas={setFuggobenAlairas}
          modalNyitva={alairasModal}
          onModalBezar={() => setAlairasModal(false)}
        />
      </div>

      <div id="profil-szekciok" className="mt-8">
        <DiakProfilKitoltes diakId={diak.id} profil={profil} mentes={mentes} onMent={profilMent} />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Jelentkezéseim</h2>
          <Link to="/diak/munkak" className="text-sm font-semibold text-[#2C7BD6]">
            Munkák böngészése →
          </Link>
        </div>

        {jelentkezesek.length === 0 ? (
          <p className="mt-4 rounded-card border border-border bg-card p-6 text-sm text-text-muted">
            Még nem jelentkeztél munkára. Böngéssz a{' '}
            <Link to="/diak/munkak" className="font-semibold text-[#2C7BD6]">
              munkakeresőben
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {jelentkezesek.map((j) => (
              <article key={j.id} className="rounded-card border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/diak/munkak/${j.hirdetes_id}`}
                      className="font-bold text-navy hover:text-[#2C7BD6]"
                    >
                      {j.hirdetes_cim}
                    </Link>
                    <p className="mt-0.5 text-sm text-text-muted">
                      {j.hirdetes_varos} · {j.hirdetes_munkakor}
                    </p>
                    {j.statusz === 'Felvéve' && fuggobenAlairas > 0 && (
                      <p className="mt-2 text-xs font-semibold text-warning">
                        → Szerződés aláírás szükséges
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statuszSzin(j.statusz)}`}
                  >
                    {j.statusz}
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  Jelentkezés: {new Date(j.letrehozva).toLocaleString('hu-HU')}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </MelodiakPageShell>
  );
}
