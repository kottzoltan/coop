import { useEffect, useMemo, useState } from 'react';
import {
  alkalmazSzurok,
  CIMKEK,
  MIN_BER_OPCIOK,
  MUNKAKOROK,
  type MunkaSzuroAllapot,
  URES_SZURO,
} from './munka-szurok';
import type { MunkaHirdetes } from '../../api/coop';

interface Props {
  nyitva: boolean;
  aktiv: MunkaSzuroAllapot;
  munkak: MunkaHirdetes[];
  agazat: string;
  onBezar: () => void;
  onAlkalmaz: (szuro: MunkaSzuroAllapot) => void;
}

function SzuroIkon({ gyerek }: { gyerek: React.ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF3E6] text-sm text-gold">
      {gyerek}
    </span>
  );
}

export function MunkaSzuroModal({ nyitva, aktiv, munkak, agazat, onBezar, onAlkalmaz }: Props) {
  const [piszkos, setPiszkos] = useState<MunkaSzuroAllapot>(aktiv);
  const [munkakorNyitva, setMunkakorNyitva] = useState(false);

  const elonezet = useMemo(
    () => alkalmazSzurok(munkak, piszkos, agazat).length,
    [munkak, piszkos, agazat],
  );

  useEffect(() => {
    if (nyitva) setPiszkos(aktiv);
  }, [nyitva, aktiv]);

  useEffect(() => {
    if (!nyitva) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBezar();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [nyitva, onBezar]);

  if (!nyitva) return null;

  function cimkeValtas(cimke: string) {
    setPiszkos((prev) => {
      const van = prev.cimkek.includes(cimke);
      return {
        ...prev,
        cimkek: van ? prev.cimkek.filter((c) => c !== cimke) : [...prev.cimkek, cimke],
      };
    });
  }

  function torles() {
    setPiszkos(URES_SZURO);
    onAlkalmaz(URES_SZURO);
    onBezar();
  }

  const lathatoMunkakorok = munkakorNyitva ? MUNKAKOROK : MUNKAKOROK.slice(0, 5);
  const rejtettMunkakor = MUNKAKOROK.length - lathatoMunkakorok.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-4"
      onClick={onBezar}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="munka-szuro-cim"
      >
        {/* Fejléc */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="munka-szuro-cim" className="text-lg font-bold text-navy">
            Szűrők
          </h2>
          <button
            type="button"
            onClick={onBezar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-text-muted hover:bg-cream-muted"
            aria-label="Bezárás"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Címkék */}
          <section className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <SzuroIkon gyerek="🏷️" />
              <h3 className="text-sm font-bold text-navy">Címkék</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {CIMKEK.map((c) => {
                const aktivCimke = piszkos.cimkek.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => cimkeValtas(c)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      aktivCimke
                        ? 'border-[#2C7BD6] bg-[#EAF1F7] text-[#2C7BD6]'
                        : 'border-border bg-card text-text-body hover:border-[#2C7BD6]/40',
                    ].join(' ')}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Munkakör */}
          <section className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <SzuroIkon gyerek="📋" />
              <h3 className="text-sm font-bold text-navy">Munkakör</h3>
            </div>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-cream-muted">
                <input
                  type="radio"
                  name="munkakor"
                  checked={!piszkos.munkakor}
                  onChange={() => setPiszkos((p) => ({ ...p, munkakor: '' }))}
                  className="mt-0.5 accent-[#2C7BD6]"
                />
                <span className="text-text-body">Összes munkakör</span>
              </label>
              {lathatoMunkakorok.map((m) => (
                <label
                  key={m}
                  className={[
                    'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                    piszkos.munkakor === m
                      ? 'border-[#2C7BD6] bg-[#EAF1F7]'
                      : 'border-border hover:bg-cream-muted',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="munkakor"
                    checked={piszkos.munkakor === m}
                    onChange={() => setPiszkos((p) => ({ ...p, munkakor: m }))}
                    className="mt-0.5 accent-[#2C7BD6]"
                  />
                  <span className="text-text-body">{m}</span>
                </label>
              ))}
            </div>
            {rejtettMunkakor > 0 && (
              <button
                type="button"
                onClick={() => setMunkakorNyitva((v) => !v)}
                className="mt-2 text-xs font-semibold text-gold hover:underline"
              >
                {munkakorNyitva
                  ? 'Kevesebb munkakör'
                  : `További munkakörök (${rejtettMunkakor})`}
              </button>
            )}
          </section>

          {/* Minimum órabér */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <SzuroIkon gyerek="💰" />
              <h3 className="text-sm font-bold text-navy">Minimum órabér</h3>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                💵
              </span>
              <input
                type="number"
                min={0}
                step={50}
                value={piszkos.minBer ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setPiszkos((p) => ({
                    ...p,
                    minBer: v ? Number(v) : null,
                  }));
                }}
                placeholder="pl. 2000"
                className="w-full rounded-lg border border-border-input py-2.5 pl-9 pr-16 text-sm text-navy outline-none focus:border-[#2C7BD6] focus:ring-2 focus:ring-[#2C7BD6]/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                Ft/óra
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {MIN_BER_OPCIOK.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() =>
                    setPiszkos((p) => ({
                      ...p,
                      minBer: p.minBer === b ? null : b,
                    }))
                  }
                  className={[
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    piszkos.minBer === b
                      ? 'bg-[#2C7BD6] text-white'
                      : 'bg-cream-muted text-text-body hover:bg-[#EAF1F7]',
                  ].join(' ')}
                >
                  {b}+
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Lábléc */}
        <div className="border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onAlkalmaz(piszkos);
              onBezar();
            }}
            className="w-full rounded-xl bg-gold py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#a67535]"
          >
            Találatok mutatása ({elonezet})
          </button>
          <button
            type="button"
            onClick={torles}
            className="mt-3 w-full text-center text-sm font-semibold text-text-muted hover:text-navy hover:underline"
          >
            Szűrők törlése
          </button>
        </div>
      </div>
    </div>
  );
}
