import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireDiak({ children }: { children: ReactNode }) {
  const { loading, me } = useAuth();

  if (loading) {
    return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  }

  const diak = me?.szerep === 'diak' ? me.diak ?? null : null;
  if (!diak) {
    return <Navigate to="/diak/belepes" replace />;
  }

  return <>{children}</>;
}

