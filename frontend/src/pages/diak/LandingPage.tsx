import { Link, Navigate } from 'react-router-dom';
import { MelodiakHero } from '../../components/diak/MelodiakHero';
import { InspiracioSav } from '../../components/diak/InspiracioSav';
import { useAuth } from '../../context/AuthContext';

const elonyok = [
  {
    cim: 'Diákmunka egyszerűen',
    leiras:
      'Regisztrálj, és csatlakozz a Coop diákmunka-szövetkezethez — rugalmas munkalehetőségek országszerte.',
  },
  {
    cim: 'Online ügyintézés',
    leiras:
      'Szerződéskötés, dokumentumok és bérinformációk egy helyen — papírmentesen.',
  },
  {
    cim: 'Biztonságos kifizetés',
    leiras:
      'Hivatalos foglalkoztatás, rendezett bérszámfejtés és bankszámlára utalás.',
  },
];

export function LandingPage() {
  const { me } = useAuth();
  const diak = me?.szerep === 'diak' ? me.diak ?? null : null;
  const bejelentkezve = !!diak;

  if (bejelentkezve) {
    return <Navigate to="/diak/munkak" replace />;
  }

  return (
    <main className="min-h-screen bg-page-bg">
      <MelodiakHero
        title="Csatlakozz a Coophoz — dolgozz diákként, biztonságosan"
        subtitle="Regisztrálj érdeklődőként, böngéssz a munkák között, és jelentkezz egy kattintással."
        eyebrow="Coop Diákportál"
        imagePosition="center_35%"
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/diak/munkak" className="btn-melodiak">
            Munkák böngészése
          </Link>
          <Link to="/diak/regisztracio" className="btn-melodiak-outline">
            Regisztráció
          </Link>
          <Link
            to="/diak/belepes"
            className="rounded-btn border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            Belépés
          </Link>
        </div>
      </MelodiakHero>

      <section id="elonyok" className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="mb-8 text-center text-xl font-bold text-navy">Miért a Coop?</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {elonyok.map((e) => (
            <div
              key={e.cim}
              className="rounded-card border border-border bg-card p-6 shadow-sm"
            >
              <h3 className="font-bold text-navy">{e.cim}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-body">{e.leiras}</p>
            </div>
          ))}
        </div>
      </section>

      <InspiracioSav
        title="Készen állsz?"
        leiras="Töltsd ki a regisztrációs űrlapot — kb. 2 perc. Csapatunk hamarosan felveszi veled a kapcsolatot."
        ctaLabel="Regisztrálok diákként"
        ctaTo="/diak/regisztracio"
      />
    </main>
  );
}
