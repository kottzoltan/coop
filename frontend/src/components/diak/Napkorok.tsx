const NAPOK = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'] as const;

export function Napkorok({ aktiv }: { aktiv: string }) {
  const set = new Set(aktiv.split(',').map((s) => s.trim()));
  return (
    <div className="flex gap-1">
      {NAPOK.map((nap, i) => (
        <span
          key={`${nap}-${i}`}
          className={[
            'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold',
            set.has(nap)
              ? 'bg-[#2C7BD6] text-white'
              : 'border border-border text-text-muted',
          ].join(' ')}
        >
          {nap}
        </span>
      ))}
    </div>
  );
}
