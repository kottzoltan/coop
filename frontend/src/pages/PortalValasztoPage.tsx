import { useNavigate } from 'react-router-dom';
import { useSzerep, type IceSzerep } from '../context/SzerepContext';
import { MelodiakHero } from '../components/diak/MelodiakHero';

const portálok: {
  szerep: IceSzerep;
  cim: string;
  leiras: string;
  utvonal: string;
  ikon: string;
  border: string;
}[] = [
  {
    szerep: 'diak',
    cim: 'Diákportál',
    leiras:
      'Regisztráció, álláshirdetések, jelenlét rögzítése, bérinformációk és dokumentumok.',
    utvonal: '/diak',
    ikon: '🎓',
    border: 'border-[#E9C989]/45',
  },
  {
    szerep: 'partner',
    cim: 'Partnerfelület',
    leiras:
      'Munkaerőigény leadása, beosztások, jelenléti ívek jóváhagyása, számlák és teljesítés igazolások.',
    utvonal: '/partner',
    ikon: '🤝',
    border: 'border-[#2C7BD6]/45',
  },
  {
    szerep: 'belso',
    cim: 'Belső Coop rendszer',
    leiras:
      'Teljes ügyvitel: tagok, partnerek, projektek, toborzás, bérszámfejtés — munkatársaknak.',
    utvonal: '/belso/belepes',
    ikon: '🏢',
    border: 'border-[#2C3750]/55',
  },
];

export function PortalValasztoPage() {
  const navigate = useNavigate();
  const { beallit } = useSzerep();

  function valaszt(szerep: IceSzerep, utvonal: string) {
    beallit(szerep);
    navigate(utvonal);
  }

  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <MelodiakHero
        title="Coop"
        subtitle="Digitális szövetkezet menedzsment"
        eyebrow="Coop"
        size="md"
        imagePosition="center_40%"
        align="center"
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          {portálok.map((p) => (
            <button
              key={p.szerep}
              type="button"
              onClick={() => valaszt(p.szerep, p.utvonal)}
              className={`flex flex-col rounded-card border-2 bg-white/10 p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white/20 ${p.border}`}
            >
              <span className="text-3xl">{p.ikon}</span>
              <h2 className="mt-4 text-lg font-bold text-white">{p.cim}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-white/80">{p.leiras}</p>
              <span className="mt-5 text-sm font-bold text-gold-light">Belépés →</span>
            </button>
          ))}
        </div>
      </MelodiakHero>
      <footer className="border-t border-border py-4 text-center text-xs text-text-muted">
        Digitális szövetkezet menedzsment
      </footer>
    </div>
  );
}
