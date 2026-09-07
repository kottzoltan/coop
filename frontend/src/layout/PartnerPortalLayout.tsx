import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSzerep } from '../context/SzerepContext';

const nav: { to: string; label: string; end?: boolean }[] = [
  { to: '/partner', label: 'Áttekintés', end: true },
  { to: '/partner/beosztas', label: 'Beosztások' },
  { to: '/partner/jelenletek', label: 'Jelenléti ívek' },
  { to: '/partner/igeny', label: 'Megrendelés' },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
    isActive
      ? 'bg-[#2C7BD6] text-white'
      : 'text-[#cbd0da] hover:bg-[#2C7BD6]/15 hover:text-white',
  ].join(' ');
}

export function PartnerPortalLayout() {
  const { torol } = useSzerep();

  return (
    <div className="flex min-h-screen bg-page-bg">
      <aside className="flex w-[220px] shrink-0 flex-col bg-navy px-3.5 py-5 text-[#cbd0da]">
        <div className="mb-4 border-b border-navy-muted px-2 pb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C7BD6] text-xs font-extrabold text-white">
              P
            </div>
            <div>
              <p className="text-sm font-bold text-white">Partnerfelület</p>
              <p className="text-[10px] text-[#6e7690]">Coop</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/partner/regisztracio" className={linkClass}>
            Partner regisztráció
          </NavLink>
        </nav>

        <Link
          to="/"
          onClick={() => torol()}
          className="mt-4 block rounded-lg px-3 py-2 text-[11px] font-semibold text-[#6e7690] hover:text-gold-light"
        >
          ← Portálváltás
        </Link>
      </aside>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
