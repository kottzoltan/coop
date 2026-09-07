import type { ReactNode } from 'react';
import heroMunkak from '../../assets/hero-munkak.jpg';

type HeroSize = 'lg' | 'md' | 'sm';

const sizeClasses: Record<HeroSize, { section: string; inner: string; title: string }> = {
  lg: {
    section: 'min-h-[340px] md:min-h-[400px]',
    inner: 'min-h-[340px] py-14 md:min-h-[400px] md:py-20',
    title: 'text-3xl md:text-4xl lg:text-5xl',
  },
  md: {
    section: 'min-h-[240px] md:min-h-[280px]',
    inner: 'min-h-[240px] py-10 md:min-h-[280px] md:py-14',
    title: 'text-2xl md:text-3xl',
  },
  sm: {
    section: 'min-h-[180px] md:min-h-[220px]',
    inner: 'min-h-[180px] py-8 md:min-h-[220px] md:py-10',
    title: 'text-xl md:text-2xl',
  },
};

interface MelodiakHeroProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  image?: string;
  imagePosition?: string;
  size?: HeroSize;
  align?: 'center' | 'left';
  children?: ReactNode;
}

export function MelodiakHero({
  title,
  subtitle,
  eyebrow = 'Coop',
  image = heroMunkak,
  imagePosition = 'center_30%',
  size = 'lg',
  align = 'center',
  children,
}: MelodiakHeroProps) {
  const s = sizeClasses[size];
  const alignClass = align === 'center' ? 'text-center' : 'text-left';

  return (
    <section className={`relative overflow-hidden ${s.section}`}>
      <img
        src={image}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: imagePosition.replace('_', ' ') }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-melodiak-blue-dark/90 via-[#1a4a8a]/75 to-melodiak-blue/55" />
      <div className={`relative z-10 flex flex-col justify-center px-5 ${s.inner}`}>
        <div className={`mx-auto w-full max-w-4xl text-white ${alignClass}`}>
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
              {eyebrow}
            </p>
          )}
          <h1 className={`mt-2 font-bold drop-shadow-sm ${s.title}`}>{title}</h1>
          {subtitle && (
            <p
              className={[
                'mt-3 text-sm text-white/85 md:text-base',
                align === 'center' ? 'mx-auto max-w-lg' : 'max-w-xl',
              ].join(' ')}
            >
              {subtitle}
            </p>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}
