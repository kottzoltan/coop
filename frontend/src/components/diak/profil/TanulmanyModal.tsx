import { useEffect, useState } from 'react';
import type { DiakTanulmany } from '@coop/shared';
import { ujTanulmanyId } from '@coop/shared';
import type { IntezmenyTipus } from '../../../data/intezmeny-kereses';
import { IntezmenyKereso } from './IntezmenyKereso';

type Props = {
  nyitva: boolean;
  szerkesztett?: DiakTanulmany | null;
  onBezar: () => void;
  onMent: (t: DiakTanulmany) => void;
};

const URES: DiakTanulmany = {
  id: '',
  intezmeny: '',
  szak: '',
  aktualis: false,
  elso_felev: '',
  utolso_felev: '',
  specializacio: '',
  tipus: 'egyetem',
};

export function TanulmanyModal({ nyitva, szerkesztett, onBezar, onMent }: Props) {
  const [form, setForm] = useState<DiakTanulmany>(URES);

  useEffect(() => {
    if (nyitva) {
      setForm(
        szerkesztett
          ? { ...URES, ...szerkesztett, tipus: szerkesztett.tipus ?? 'egyetem' }
          : { ...URES, id: ujTanulmanyId() },
      );
    }
  }, [nyitva, szerkesztett]);

  if (!nyitva) return null;

  const tipus: IntezmenyTipus = form.tipus ?? 'egyetem';
  const mentheto = form.intezmeny.trim().length > 0 && form.szak.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-card p-6 shadow-xl"
        role="dialog"
        aria-labelledby="tanulmany-modal-cim"
      >
        <div className="flex items-center justify-between">
          <h2 id="tanulmany-modal-cim" className="text-lg font-bold text-navy">
            {szerkesztett ? 'Tanulmány szerkesztése' : 'Új tanulmány'}
          </h2>
          <button type="button" onClick={onBezar} className="text-xl text-text-muted hover:text-navy">
            ×
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <fieldset>
            <legend className="mb-2 text-[11px] font-semibold uppercase text-text-muted">
              Intézmény típusa
            </legend>
            <div className="flex gap-2">
              {(
                [
                  ['egyetem', 'Egyetem / főiskola'],
                  ['kozepiskola', 'Középiskola'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      tipus: id,
                      intezmeny: f.tipus === id ? f.intezmeny : '',
                    }))
                  }
                  className={[
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    tipus === id
                      ? 'border-[#2C7BD6] bg-[#EAF1F7] text-[#2C7BD6]'
                      : 'border-border text-navy hover:bg-cream-muted',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase text-text-muted">
              {tipus === 'egyetem' ? 'Egyetem / főiskola neve' : 'Középiskola neve'}
            </span>
            <IntezmenyKereso
              tipus={tipus}
              value={form.intezmeny}
              required
              placeholder={
                tipus === 'egyetem'
                  ? 'Pl. ELTE, BME, Debreceni Egyetem…'
                  : 'Pl. Fazekas, Radnóti, gimnázium neve…'
              }
              onValaszt={(nev) => setForm((f) => ({ ...f, intezmeny: nev }))}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase text-text-muted">
              {tipus === 'egyetem' ? 'Szak neve' : 'Képzés / osztály'}
            </span>
            <input
              className="field-input"
              value={form.szak}
              onChange={(e) => setForm((f) => ({ ...f, szak: e.target.value }))}
              placeholder={
                tipus === 'egyetem'
                  ? 'Pl. Gazdálkodási és menedzsment'
                  : 'Pl. érettségi, technikum, 12.A'
              }
            />
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.aktualis}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  aktualis: e.target.checked,
                  utolso_felev: e.target.checked ? '' : f.utolso_felev,
                }))
              }
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm font-medium text-navy">Aktuális tanulmány</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-text-muted">
                {tipus === 'egyetem' ? 'Első aktív félév' : 'Kezdés (év / hónap)'}
              </span>
              <input
                type="month"
                className="field-input"
                value={form.elso_felev ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, elso_felev: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-text-muted">
                {tipus === 'egyetem' ? 'Utolsó aktív félév' : 'Befejezés'}
              </span>
              <input
                type="month"
                className="field-input disabled:opacity-50"
                value={form.utolso_felev ?? ''}
                disabled={form.aktualis}
                onChange={(e) => setForm((f) => ({ ...f, utolso_felev: e.target.value }))}
              />
            </label>
          </div>

          {tipus === 'egyetem' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-text-muted">
                Specializáció
              </span>
              <input
                className="field-input"
                value={form.specializacio ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, specializacio: e.target.value }))}
                placeholder="Opcionális"
              />
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onBezar}
            className="rounded-btn border border-border px-4 py-2 text-sm font-bold text-navy"
          >
            Mégse
          </button>
          <button
            type="button"
            disabled={!mentheto}
            onClick={() => mentheto && onMent({ ...form, tipus })}
            className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
}
