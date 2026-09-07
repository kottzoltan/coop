import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type IceSzerep = 'diak' | 'partner' | 'belso' | null;

const STORAGE_KEY = 'ice-szerep';

interface SzerepContextValue {
  szerep: IceSzerep;
  beallit(szerep: IceSzerep): void;
  torol(): void;
}

const SzerepContext = createContext<SzerepContextValue | null>(null);

function readStored(): IceSzerep {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === 'diak' || v === 'partner' || v === 'belso') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function SzerepProvider({ children }: { children: ReactNode }) {
  const [szerep, setSzerep] = useState<IceSzerep>(readStored);

  const value = useMemo(
    () => ({
      szerep,
      beallit(next: IceSzerep) {
        setSzerep(next);
        if (next) sessionStorage.setItem(STORAGE_KEY, next);
        else sessionStorage.removeItem(STORAGE_KEY);
      },
      torol() {
        setSzerep(null);
        sessionStorage.removeItem(STORAGE_KEY);
      },
    }),
    [szerep],
  );

  return (
    <SzerepContext.Provider value={value}>{children}</SzerepContext.Provider>
  );
}

export function useSzerep() {
  const ctx = useContext(SzerepContext);
  if (!ctx) throw new Error('useSzerep csak SzerepProvider alatt használható');
  return ctx;
}
