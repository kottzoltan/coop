import { NavLink, Outlet } from 'react-router-dom';

function tabClass({ isActive }: { isActive: boolean }) {
  return [
    'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-navy text-cream'
      : 'text-text-muted hover:bg-cream-muted hover:text-navy',
  ].join(' ');
}

export function ToborzasLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream">
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h1 className="text-lg font-bold text-navy">Toborzás</h1>
        <p className="text-sm text-text-muted">
          Élő hirdetések és jelentkezések — a diákportálon megjelenő munkák
        </p>
        <nav className="mt-3 flex gap-2">
          <NavLink to="/belso/toborzas/hirdetesek" className={tabClass}>
            Hirdetések
          </NavLink>
          <NavLink to="/belso/toborzas/jelentkezesek" className={tabClass} end>
            Jelentkezések
          </NavLink>
          <NavLink to="/belso/toborzas/kampanyok" className={tabClass}>
            Kampányok
          </NavLink>
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
