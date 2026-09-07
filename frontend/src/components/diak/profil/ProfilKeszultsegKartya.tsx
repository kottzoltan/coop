import type { HianyzoSzekcioId } from '@coop/shared';

type Props = {
  nev: string;
  szazalek: number;
  hianyzik: Array<{ id: HianyzoSzekcioId; label: string }>;
  onKitoltes: () => void;
};

export function ProfilKeszultsegKartya({ nev, szazalek, hianyzik, onKitoltes }: Props) {
  const elsoNegy = hianyzik.slice(0, 4);
  const tovabbi = hianyzik.length - elsoNegy.length;

  return (
    <div className="overflow-hidden rounded-card bg-navy text-white">
      <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Szia, {nev}!</h1>
          <p className="mt-2 max-w-xl text-sm text-[#cbd0da]">
            A profilod jelenleg {szazalek}%-os. Töltsd ki a hiányzó adatokat, hogy a dolgozói
            adataid naprakészek legyenek.
          </p>

          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold">
              <span className="text-gold-light">Profil készültség</span>
              <span>{szazalek}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-navy-muted">
              <div
                className="h-full rounded-full bg-gold transition-all"
                style={{ width: `${szazalek}%` }}
              />
            </div>
          </div>

          {hianyzik.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gold-light">
                Amit még érdemes kitöltened:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {elsoNegy.map((h) => (
                  <span
                    key={h.id}
                    className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold-light"
                  >
                    <span aria-hidden>!</span> {h.label}
                  </span>
                ))}
                {tovabbi > 0 && (
                  <span className="inline-flex items-center rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold-light">
                    +{tovabbi} további
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onKitoltes}
            className="mt-5 inline-flex items-center gap-2 rounded-btn bg-white px-4 py-2.5 text-sm font-bold text-navy hover:bg-cream"
          >
            Profil kitöltése →
          </button>
        </div>

        <div className="hidden h-28 w-40 items-center justify-center rounded-xl bg-navy-muted/60 text-5xl md:flex">
          📊
        </div>
      </div>
    </div>
  );
}
