import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  signup,
} from '@netlify/identity';
import type { DiakRegisztracio } from '../api/coop';
import type { Ugycsoport } from '@coop/shared';

type Szerep = 'diak' | 'partner' | 'belso' | string;

export interface AuthMe {
  szerep: Szerep;
  email?: string;
  diak?: DiakRegisztracio | null;
  partner?: { id: number; cegnev: string; statusz: string; hozzaferes?: string } | null;
  jogosultsagok?: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }>;
}

interface AuthContextValue {
  loading: boolean;
  identityUser: { id: string; email: string } | null;
  me: AuthMe | null;
  bejelentkezes(email: string, password: string): Promise<void>;
  regisztracio(email: string, password: string, nev: string): Promise<void>;
  kijelentkezes(): Promise<void>;
  frissit(): Promise<void>;
  hasJog(ugycsoport: Ugycsoport, szint?: 'olvasas' | 'iras'): boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [identityUser, setIdentityUser] = useState<{ id: string; email: string } | null>(null);
  const [me, setMe] = useState<AuthMe | null>(null);

  async function frissitAll() {
    const u = await getUser();
    if (!u) {
      setIdentityUser(null);
      setMe(null);
      return;
    }

    setIdentityUser({ id: u.id, email: u.email ?? '' });

    const res = await fetch('/api/auth/me');
    const json = (await res.json().catch(() => null)) as { me?: AuthMe | null } | null;
    setMe(json?.me ?? null);
  }

  useEffect(() => {
    let unsub: null | (() => void) = null;

    (async () => {
      try {
        await handleAuthCallback();
      } catch {
        // callback feldolgozás hibája esetén maradunk a normál flow-n
      }

      await frissitAll();
      setLoading(false);

      unsub = onAuthChange((_event, user) => {
        // Login/logout esetén gyors állapotfrissítés
        setIdentityUser(
          user ? { id: user.id, email: user.email ?? '' } : null,
        );
        // me-t külön endpointból töltjük, hogy DB mapping legyen az igazságforrás
        frissitAll().catch(() => null);
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  async function bejelentkezes(email: string, password: string) {
    await login(email, password);
    await frissitAll();
  }

  async function regisztracio(email: string, password: string, nev: string) {
    await signup(email, password, { full_name: nev });
    await frissitAll();
  }

  async function kijelentkezes() {
    await logout();
    setIdentityUser(null);
    setMe(null);
  }

  function hasJog(ugycsoport: Ugycsoport, szint: 'olvasas' | 'iras' = 'olvasas'): boolean {
    const jog = me?.jogosultsagok;
    if (!jog?.length) return me?.szerep === 'belso';
    const admin = jog.find((j) => j.ugycsoport === 'admin');
    if (admin?.iras) return true;
    const row = jog.find((j) => j.ugycsoport === ugycsoport);
    if (szint === 'iras') return !!row?.iras;
    return !!(row?.olvasas || row?.iras);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      identityUser,
      me,
      bejelentkezes,
      regisztracio,
      kijelentkezes,
      frissit: frissitAll,
      hasJog,
    }),
    [loading, identityUser, me],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth csak AuthProvider alatt használható');
  return ctx;
}

