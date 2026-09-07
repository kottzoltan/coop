import {
  MUNKALAP_CONTROLLING_SOROK,
  type MunkalapControlling,
} from '@coop/shared';

export function controllingIkonok(c: MunkalapControlling, resolved: boolean) {
  if (!resolved) return '❔❔❔❔';
  const ic = (b?: boolean) => (b ? '❌' : '✅');
  return MUNKALAP_CONTROLLING_SOROK.map((s) => ic(c[s.key])).join('');
}

export function passesControllingSzuro(
  c: MunkalapControlling,
  resolved: boolean,
  szurok: Record<keyof MunkalapControlling, 'mind' | 'igen' | 'nem'>,
): boolean {
  if (!resolved) return true;
  for (const sor of MUNKALAP_CONTROLLING_SOROK) {
    const sz = szurok[sor.key];
    if (sz === 'mind') continue;
    const ertek = !!c[sor.key];
    if (sz === 'igen' && !ertek) return false;
    if (sz === 'nem' && ertek) return false;
  }
  return true;
}

export function MunkalapControllingPanel({
  controlling,
  resolved,
}: {
  controlling: MunkalapControlling;
  resolved: boolean;
}) {
  if (!resolved) {
    return (
      <p className="text-sm text-text-muted">
        A controlling ellenőrzés lezáráskor fut le (4 flag).
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MUNKALAP_CONTROLLING_SOROK.map((sor) => {
        const hiba = !!controlling[sor.key];
        return (
          <div
            key={sor.key}
            className={[
              'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
              hiba ? 'border-danger/30 bg-danger-bg/40' : 'border-success/20 bg-success-bg/30',
            ].join(' ')}
          >
            <span className="text-base leading-none">{hiba ? '❌' : '✅'}</span>
            <div>
              <p className="font-semibold text-navy">{sor.label}</p>
              <p className="text-xs text-text-muted">{sor.hint}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
