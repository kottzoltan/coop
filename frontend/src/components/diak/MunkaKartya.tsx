import { Link } from 'react-router-dom';
import { Napkorok } from './Napkorok';
import type { MunkaHirdetes } from '../../api/coop';

interface MunkaKartyaProps {
  munka: MunkaHirdetes;
}

export function MunkaKartya({ munka }: MunkaKartyaProps) {
  const cimkek = munka.cimkek?.split(',').filter(Boolean) ?? [];
  const reszletekUrl = `/diak/munkak/${munka.id}`;

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <Link to={reszletekUrl} className="group block">
        <h3 className="text-base font-bold leading-snug text-navy group-hover:text-[#2C7BD6]">
          {munka.cim}
        </h3>
        <p className="mt-1 text-sm text-text-muted">{munka.munkakor}</p>
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-text-body">
        <span className="flex items-center gap-1.5">
          <span className="text-[#2C7BD6]">📍</span>
          {munka.varos}
        </span>
        <span className="flex items-center gap-1.5 font-semibold">
          <span>💰</span>
          {munka.ber.toLocaleString('hu-HU')} Ft/óra
        </span>
      </div>

      <div className="mt-3">
        <Napkorok aktiv={munka.munkanapok} />
        {munka.munkaido && (
          <p className="mt-1.5 text-xs text-text-muted">{munka.munkaido}</p>
        )}
      </div>

      {cimkek.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cimkek.map((c) => (
            <span
              key={c}
              className="rounded-md bg-[#EAF1F7] px-2 py-0.5 text-[11px] font-medium text-[#2C7BD6]"
            >
              {c.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Link
          to={`${reszletekUrl}#jelentkezes`}
          className="text-sm font-bold text-[#2C7BD6] hover:underline"
        >
          → Érdekel
        </Link>
      </div>
    </article>
  );
}
