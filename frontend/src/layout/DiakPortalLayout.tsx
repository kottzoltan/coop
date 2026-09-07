import { Link, Outlet } from 'react-router-dom';
import { useSzerep } from '../context/SzerepContext';
import { useAuth } from '../context/AuthContext';

export function DiakPortalLayout() {
  const { torol } = useSzerep();
  const { me } = useAuth();

  const diak = me?.szerep === 'diak' ? me.diak ?? null : null;
  const bejelentkezve = !!diak;

  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/diak" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-light text-sm font-extrabold text-navy">
              M
            </div>
            <div>
              <p className="text-sm font-bold text-navy">Coop</p>
              <p className="text-[11px] font-medium text-text-muted">
                Diákportál
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/diak/munkak"
              className="rounded-btn border border-border-input px-4 py-2 text-sm font-semibold text-navy hover:bg-cream-muted"
            >
              Munkák
            </Link>
            {bejelentkezve ? (
              <>
                <Link
                  to="/diak/dokumentumok"
                  className="rounded-btn border border-border-input px-4 py-2 text-sm font-semibold text-navy hover:bg-cream-muted"
                >
                  Dokumentumok
                </Link>
                <Link
                  to="/diak/beosztas"
                  className="rounded-btn border border-border-input px-4 py-2 text-sm font-semibold text-navy hover:bg-cream-muted"
                >
                  Beosztás
                </Link>
                <Link
                  to="/diak/profil"
                  className="rounded-btn border border-[#2C7BD6] bg-[#EAF1F7] px-4 py-2 text-sm font-semibold text-[#2C7BD6]"
                >
                  {diak?.nev.split(' ')[0] ?? 'Profil'}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/diak/belepes"
                  className="rounded-btn border border-border-input px-4 py-2 text-sm font-semibold text-navy hover:bg-cream-muted"
                >
                  Belépés
                </Link>
                <Link
                  to="/diak/regisztracio"
                  className="rounded-btn border border-navy bg-navy px-4 py-2 text-sm font-semibold text-cream hover:bg-navy-hover"
                >
                  Regisztráció
                </Link>
              </>
            )}
            <Link
              to="/"
              onClick={() => torol()}
              className="hidden rounded-btn border border-border-input px-3 py-2 text-xs font-semibold text-text-muted hover:bg-cream-muted sm:inline-block"
            >
              Portálváltás
            </Link>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="mt-auto border-t border-border bg-navy px-5 py-6 text-center text-sm text-[#9aa1b4]">
        <p>© Coop</p>
        {!bejelentkezve && (
          <p className="mt-1 text-xs">
            Regisztrációd és jelentkezéseid az adatbázisba kerülnek — tesztkörnyezet.
          </p>
        )}
      </footer>
    </div>
  );
}
