import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequirePartner({ children }: { children: ReactNode }) {
  const { loading, me, identityUser } = useAuth();

  if (loading) {
    return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  }

  if (!identityUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="max-w-md rounded-card border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-navy">Partner belépés szükséges</h1>
          <p className="mt-2 text-sm text-text-body">
            A partnerfelület csak meghívott vagy jóváhagyott partneri fiókkal érhető el.
          </p>
          <Link
            to="/partner/belepes"
            className="mt-5 inline-block rounded-btn bg-[#2C7BD6] px-5 py-2.5 text-sm font-bold text-white"
          >
            Belépés →
          </Link>
          <p className="mt-4 text-xs text-text-muted">
            <Link to="/partner/regisztracio" className="text-[#2C7BD6] underline">
              Regisztráció
            </Link>
            {' · '}
            <Link to="/" className="text-[#2C7BD6] underline">
              Portálválasztó
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (me?.szerep !== 'partner') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="max-w-md rounded-card border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-navy">Partner fiók szükséges</h1>
          <p className="mt-2 text-sm text-text-body">
            Ez a fiók nem partner szerepkörrel van regisztrálva.
          </p>
          <Link
            to="/partner/regisztracio"
            className="mt-5 inline-block rounded-btn border border-[#2C7BD6] px-5 py-2.5 text-sm font-semibold text-[#2C7BD6]"
          >
            Partner regisztráció
          </Link>
        </div>
      </div>
    );
  }

  if (me.partner?.statusz !== 'jóváhagyva') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="max-w-md rounded-card border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-navy">Jóváhagyásra vár</h1>
          <p className="mt-2 text-sm text-text-body">
            A partner regisztrációd ({me.partner?.cegnev ?? '—'}) még függőben van. Ha meghívót
            kaptál, használd a linket és állítsd be a jelszavad — a belső meghívó automatikusan
            jóváhagyja a hozzáférést.
          </p>
          <p className="mt-4 text-xs text-text-muted">Státusz: {me.partner?.statusz ?? 'függőben'}</p>
        </div>
      </div>
    );
  }

  if (me.partner?.hozzaferes === 'nincs') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="max-w-md rounded-card border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-navy">Nincs portál hozzáférés</h1>
          <p className="mt-2 text-sm text-text-body">
            A partnerfiókodhoz jelenleg nincs portál jogosultság rendelve. Kérd a Coop
            kapcsolattartódat.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
