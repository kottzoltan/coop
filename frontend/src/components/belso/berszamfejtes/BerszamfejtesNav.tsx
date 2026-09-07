import { Link } from 'react-router-dom';

export type BerszamfejtesNavTab = 'munkalapok' | 'futasok' | 'folyoszamla' | 'jelenletek';

export function BerszamfejtesNav({ active }: { active: BerszamfejtesNavTab }) {
  const base = 'rounded-lg px-4 py-2 text-sm font-semibold transition-colors';
  const activeCls = 'bg-card text-navy shadow-sm';
  const inactiveCls = 'text-text-muted hover:text-navy';

  const tabs: { key: BerszamfejtesNavTab; to: string; label: string }[] = [
    { key: 'munkalapok', to: '/belso/berszamfejtes', label: 'Munkalapok' },
    { key: 'futasok', to: '/belso/berszamfejtes/futasok', label: 'Számfejtési futások' },
    { key: 'folyoszamla', to: '/belso/berszamfejtes/folyoszamla', label: 'Folyószámla' },
    { key: 'jelenletek', to: '/belso/berszamfejtes/jelenletek', label: 'Jelenlétek' },
  ];

  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-btn bg-cream-muted p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          className={`${base} ${active === t.key ? activeCls : inactiveCls}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function ft(n: number) {
  return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
}

const FUTAS_STATUSZ: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Piszkozat', cls: 'bg-[#8A8570]/15 text-[#8A8570]' },
  VALIDATED: { label: 'Validált', cls: 'bg-[#2F7A4E]/15 text-[#2F7A4E]' },
  CLOSED: { label: 'Lezárt', cls: 'bg-[#1C4E7A]/15 text-[#1C4E7A]' },
  DECLARED: { label: 'Bevallva', cls: 'bg-navy/15 text-navy' },
  CORRECTED: { label: 'Korrigálva', cls: 'bg-[#B8863F]/15 text-[#B8863F]' },
};

export function FutasStatuszBadge({ status }: { status: string }) {
  const s = FUTAS_STATUSZ[status] ?? { label: status, cls: 'bg-cream-muted text-text-muted' };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
