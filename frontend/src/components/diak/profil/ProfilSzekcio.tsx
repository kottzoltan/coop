import type { ReactNode } from 'react';

type Props = {
  id?: string;
  cim: string;
  leiras?: string;
  szerkesztes?: () => void;
  children: ReactNode;
};

export function ProfilSzekcio({ id, cim, leiras, szerkesztes, children }: Props) {
  return (
    <section id={id} className="rounded-card border border-border bg-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy">{cim}</h2>
          {leiras && <p className="mt-1 text-sm text-text-muted">{leiras}</p>}
        </div>
        {szerkesztes && (
          <button
            type="button"
            onClick={szerkesztes}
            className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-cream-muted hover:text-navy"
            aria-label="Szerkesztés"
          >
            ✎
          </button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProfilUresAllapot({ szoveg }: { szoveg: string }) {
  return (
    <div className="rounded-lg border border-[#2C7BD6]/20 bg-[#2C7BD6]/5 px-4 py-3 text-sm text-[#1C4E7A]">
      {szoveg}
    </div>
  );
}
