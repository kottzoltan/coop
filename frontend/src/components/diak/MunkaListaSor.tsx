import type { MunkaHirdetes } from '../../api/coop';
import { berSzoveg, cimkekTomb } from './munka-utils';

interface Props {
  munka: MunkaHirdetes;
  aktiv: boolean;
  onValaszt: () => void;
}

export function MunkaListaSor({ munka, aktiv, onValaszt }: Props) {
  const cimkek = cimkekTomb(munka).slice(0, 3);

  return (
    <button
      type="button"
      onClick={onValaszt}
      className={[
        'w-full border-b border-border px-4 py-3.5 text-left transition-colors',
        aktiv
          ? 'border-l-[3px] border-l-[#2C7BD6] bg-[#EAF1F7]'
          : 'border-l-[3px] border-l-transparent bg-card hover:bg-[#f8fafc]',
      ].join(' ')}
    >
      <p className="text-sm font-bold leading-snug text-navy">{munka.cim}</p>
      <p className="mt-0.5 text-xs text-text-muted">{munka.varos}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-semibold text-navy">{berSzoveg(munka)}</span>
        {munka.munkaido && (
          <span className="text-text-muted">{munka.munkaido}</span>
        )}
      </div>
      {cimkek.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {cimkek.map((c) => (
            <span
              key={c}
              className="rounded bg-[#EAF1F7] px-1.5 py-0.5 text-[10px] font-medium text-[#2C7BD6]"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
