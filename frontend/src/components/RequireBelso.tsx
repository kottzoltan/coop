import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireBelso({ children }: { children: ReactNode }) {
  const { loading, me, identityUser } = useAuth();

  if (loading) {
    return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  }

  if (!identityUser || me?.szerep !== 'belso') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="max-w-md rounded-card border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-navy">Belső belépés szükséges</h1>
          <p className="mt-2 text-sm text-text-body">
            A projektek és egyéb belső adatok csak munkatársi Identity fiókkal érhetők el.
          </p>
          <Link
            to="/belso/belepes"
            className="mt-5 inline-block rounded-btn bg-navy px-5 py-2.5 text-sm font-bold text-cream"
          >
            Belépés →
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
