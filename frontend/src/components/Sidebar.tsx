import { Link, NavLink } from 'react-router-dom';
import { useSzerep } from '../context/SzerepContext';
import { useAuth } from '../context/AuthContext';
import type { Ugycsoport } from '@coop/shared';

function hasJog(
  jogosultsagok: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }> | undefined,
  ugycsoport: Ugycsoport,
  belso: boolean,
): boolean {
  if (!belso) return false;
  if (!jogosultsagok?.length) return true;
  const admin = jogosultsagok.find((j) => j.ugycsoport === 'admin');
  if (admin?.iras) return true;
  const j = jogosultsagok.find((x) => x.ugycsoport === ugycsoport);
  return !!(j?.olvasas || j?.iras);
}

function eloNavClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors',
    isActive
      ? 'bg-gold/30 text-gold-light'
      : 'text-gold-light/80 hover:bg-navy-muted/60 hover:text-white',
  ].join(' ');
}

function subNavClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-2 rounded-md py-1.5 pl-6 pr-2.5 text-[12.5px] font-semibold transition-colors',
    isActive
      ? 'bg-navy-muted text-white'
      : 'text-[#9aa1b4] hover:text-white',
  ].join(' ');
}

export function Sidebar() {
  const { torol } = useSzerep();
  const { me } = useAuth();
  const jog = me?.jogosultsagok;
  const belso = me?.szerep === 'belso';

  const eloNav = [
    { to: '/belso/erdeklodok', label: 'Érdeklődő diákok', ugycsoport: 'erdeklodok' as const },
    { to: '/belso/tagok', label: 'Szövetkezeti tagok', ugycsoport: 'tagok' as const },
    { to: '/belso/partnerek', label: 'Partnerek', ugycsoport: 'partnerek' as const },
    { to: '/belso/projektek', label: 'Projektek', ugycsoport: 'projektek' as const },
    { to: '/belso/toborzas/hirdetesek', label: 'Hirdetések', ugycsoport: 'toborzas' as const },
    { to: '/belso/beosztas', label: 'Beosztáskezelő', ugycsoport: 'beosztas' as const },
    { to: '/belso/pv-munkaterulet', label: 'PV munkaterület', ugycsoport: 'beosztas' as const },
    { to: '/belso/folyamat-terkep', label: 'Folyamat-térkép', ugycsoport: 'beosztas' as const },
    { to: '/belso/berszamfejtes', label: 'Bérszámfejtés', ugycsoport: 'berszamfejtes' as const },
    { to: '/belso/nav-bevallasok', label: 'NAV bevallások', ugycsoport: 'berszamfejtes' as const },
    { to: '/belso/szja-kedvezmenyek', label: 'SZJA kedvezmények', ugycsoport: 'tagok' as const },
    { to: '/belso/penzugy', label: 'Pénzügy', ugycsoport: 'penzugy' as const },
    { to: '/belso/kereso', label: 'Részletes kereső', ugycsoport: 'erdeklodok' as const },
    { to: '/belso/partner-regisztraciok', label: 'Partner jelentkezések', ugycsoport: 'partnerek' as const },
    { to: '/belso/partner-meghivok', label: 'Partner meghívók', ugycsoport: 'partnerek' as const },
  ];

  const toborzasNav = [
    { to: '/belso/toborzas/jelentkezesek', label: 'Jelentkezések' },
  ];

  return (
    <aside className="flex w-[208px] shrink-0 flex-col bg-navy px-3.5 py-5 text-[#cbd0da]">
      <div className="mb-4 flex items-center gap-2 border-b border-navy-muted px-2 pb-5">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-gold-light text-[13px] font-extrabold text-navy">
          C
        </div>
        <span className="text-sm font-bold text-white">Coop</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        <p className="px-2.5 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-gold">
          Élő adatok
        </p>
        {eloNav
          .filter((item) => hasJog(jog, item.ugycsoport, belso))
          .map((item) => (
            <NavLink key={item.to} to={item.to} className={eloNavClass}>
              {item.label}
            </NavLink>
          ))}

        {hasJog(jog, 'toborzas', belso) && (
          <>
            <p className="mt-3 px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-gold">
              Toborzás
            </p>
            {toborzasNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={subNavClass}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/belso/blog" className={subNavClass}>
              Blog
            </NavLink>
          </>
        )}

        {hasJog(jog, 'erdeklodok', belso) && (
          <NavLink to="/belso/ugyfelszolgalat" className={subNavClass}>
            Ügyfélszolgálat
          </NavLink>
        )}

        {hasJog(jog, 'tagok', belso) && (
          <NavLink to="/belso/e-alairas" className={subNavClass}>
            E-aláírás
          </NavLink>
        )}

        {hasJog(jog, 'admin', belso) && (
          <NavLink to="/belso/admin/jogosultsagok" className={subNavClass}>
            Jogosultságok
          </NavLink>
        )}
      </nav>

      <Link
        to="/"
        onClick={() => torol()}
        className="mt-4 block rounded-lg px-2.5 py-2 text-[11px] font-semibold text-[#6e7690] hover:text-gold-light"
      >
        ← Portálváltás
      </Link>
    </aside>
  );
}
