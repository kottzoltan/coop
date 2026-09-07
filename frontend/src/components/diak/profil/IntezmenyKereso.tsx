import { useEffect, useId, useRef, useState } from 'react';
import type { IntezmenyTipus, MagyarIntezmeny } from '../../../data/intezmeny-kereses';
import { keresIntezmenyek } from '../../../data/intezmeny-kereses';
import { MAGYAR_EGYETEMEK } from '../../../data/egyetemek';
import { MAGYAR_KOZEPISKOLAK } from '../../../data/kozepiskolak';

type Props = {
  value: string;
  tipus: IntezmenyTipus;
  onValaszt: (nev: string, intezmeny?: MagyarIntezmeny) => void;
  placeholder?: string;
  required?: boolean;
};

const LISTAK: Record<IntezmenyTipus, MagyarIntezmeny[]> = {
  egyetem: MAGYAR_EGYETEMEK,
  kozepiskola: MAGYAR_KOZEPISKOLAK,
};

export function IntezmenyKereso({ value, tipus, onValaszt, placeholder, required }: Props) {
  const inputId = useId();
  const listaId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [kereso, setKereso] = useState(value);
  const [nyitva, setNyitva] = useState(false);
  const [kiemelt, setKiemelt] = useState(0);

  useEffect(() => {
    setKereso(value);
  }, [value]);

  const talalatok = keresIntezmenyek(LISTAK[tipus], kereso, tipus, 10);
  const egyedi =
    kereso.trim().length >= 2 &&
    !talalatok.some((t) => t.nev.toLowerCase() === kereso.trim().toLowerCase());

  useEffect(() => {
    function klikkKivul(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setNyitva(false);
      }
    }
    document.addEventListener('mousedown', klikkKivul);
    return () => document.removeEventListener('mousedown', klikkKivul);
  }, []);

  function valaszt(intezmeny: MagyarIntezmeny) {
    setKereso(intezmeny.nev);
    onValaszt(intezmeny.nev, intezmeny);
    setNyitva(false);
  }

  function egyediMent() {
    const nev = kereso.trim();
    if (!nev) return;
    onValaszt(nev);
    setNyitva(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={inputId}
        className="field-input w-full"
        value={kereso}
        required={required}
        placeholder={placeholder ?? 'Kezdd el gépelni az iskola nevét…'}
        autoComplete="off"
        role="combobox"
        aria-expanded={nyitva}
        aria-controls={listaId}
        aria-autocomplete="list"
        onFocus={() => setNyitva(true)}
        onChange={(e) => {
          setKereso(e.target.value);
          onValaszt(e.target.value);
          setNyitva(true);
          setKiemelt(0);
        }}
        onKeyDown={(e) => {
          const max = talalatok.length + (egyedi ? 1 : 0);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setNyitva(true);
            setKiemelt((i) => (max ? (i + 1) % max : 0));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setKiemelt((i) => (max ? (i - 1 + max) % max : 0));
          } else if (e.key === 'Enter' && nyitva && max > 0) {
            e.preventDefault();
            if (kiemelt < talalatok.length) valaszt(talalatok[kiemelt]);
            else egyediMent();
          } else if (e.key === 'Escape') {
            setNyitva(false);
          }
        }}
      />

      {nyitva && kereso.trim().length >= 2 && (talalatok.length > 0 || egyedi) && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {talalatok.map((t, idx) => (
            <li key={t.id} role="option" aria-selected={kiemelt === idx}>
              <button
                type="button"
                className={[
                  'flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[#EAF1F7]',
                  kiemelt === idx ? 'bg-[#EAF1F7]' : '',
                ].join(' ')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => valaszt(t)}
              >
                <span className="font-medium text-navy">{t.nev}</span>
                <span className="text-xs text-text-muted">{t.varos}</span>
              </button>
            </li>
          ))}
          {egyedi && (
            <li role="option" aria-selected={kiemelt === talalatok.length}>
              <button
                type="button"
                className={[
                  'w-full px-3 py-2 text-left text-sm text-text-muted hover:bg-cream-muted',
                  kiemelt === talalatok.length ? 'bg-cream-muted' : '',
                ].join(' ')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={egyediMent}
              >
                „{kereso.trim()}” mentése egyedi intézményként
              </button>
            </li>
          )}
        </ul>
      )}

      {kereso.trim().length > 0 && kereso.trim().length < 2 && (
        <p className="mt-1 text-xs text-text-muted">Legalább 2 karakter a kereséshez.</p>
      )}
    </div>
  );
}
