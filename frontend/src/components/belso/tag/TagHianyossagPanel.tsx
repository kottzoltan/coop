import { tagHianyossagSorok, type SzovetkezetiTag } from '@coop/shared';

function statuszIcon(statusz: 'ok' | 'figyelmeztetes' | 'hiba') {
  if (statusz === 'ok') return '✓';
  if (statusz === 'figyelmeztetes') return '!';
  return '✕';
}

function statuszClass(statusz: 'ok' | 'figyelmeztetes' | 'hiba') {
  if (statusz === 'ok') return 'bg-success-bg text-success border-success/20';
  if (statusz === 'figyelmeztetes') return 'bg-warning-bg text-warning border-warning/20';
  return 'bg-danger-bg text-danger border-danger/20';
}

export function TagHianyossagPanel({ tag }: { tag: SzovetkezetiTag }) {
  const sorok = tagHianyossagSorok(tag);
  const hibak = sorok.filter((s) => s.statusz !== 'ok');

  return (
    <div className="space-y-4">
      {hibak.length === 0 ? (
        <div className="rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm text-success">
          Nincs aktív hiányosság — a tag bérszámfejtésre és munkavégzésre alkalmas.
        </div>
      ) : (
        <div className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning">
          {hibak.length} hiányosság / figyelmeztetés — utalás előtt ellenőrizd (FK #07).
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {sorok.map((s) => (
          <div
            key={s.kod}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${statuszClass(s.statusz)}`}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/60 text-xs font-bold">
              {statuszIcon(s.statusz)}
            </span>
            <div>
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="mt-0.5 text-xs opacity-90">{s.leiras}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
