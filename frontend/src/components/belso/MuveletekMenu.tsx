import { useEffect, useRef, useState, type ReactNode } from 'react';

type Muvelet = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type Props = {
  label?: string;
  muveletek: Muvelet[];
  children?: ReactNode;
};

export function MuveletekMenu({ label = 'Műveletek', muveletek, children }: Props) {
  const [nyitva, setNyitva] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nyitva) return;
    function bezar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setNyitva(false);
    }
    document.addEventListener('mousedown', bezar);
    return () => document.removeEventListener('mousedown', bezar);
  }, [nyitva]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={() => setNyitva((v) => !v)}
          className="rounded-btn border border-border-input bg-card px-3 py-2 text-sm font-semibold text-text-body hover:bg-cream-muted"
        >
          {label} ▾
        </button>
      </div>
      {nyitva && (
        <div className="absolute right-0 z-20 mt-1 min-w-[240px] rounded-card border border-border bg-card py-1 shadow-lg">
          {muveletek.map((m) => (
            <button
              key={m.label}
              type="button"
              disabled={m.disabled}
              onClick={() => {
                m.onClick();
                setNyitva(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-text-body hover:bg-cream-muted disabled:opacity-50"
            >
              ⬇ {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
