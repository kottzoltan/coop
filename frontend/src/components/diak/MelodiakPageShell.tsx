import type { ReactNode } from 'react';
import { MelodiakHero } from './MelodiakHero';

interface MelodiakPageShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  heroSize?: 'lg' | 'md' | 'sm';
  heroChildren?: ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: ReactNode;
}

const maxWidthClass = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

export function MelodiakPageShell({
  title,
  subtitle,
  eyebrow,
  heroSize = 'md',
  heroChildren,
  maxWidth = '2xl',
  children,
}: MelodiakPageShellProps) {
  return (
    <div className="min-h-screen bg-page-bg">
      <MelodiakHero
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        size={heroSize}
        align="left"
      >
        {heroChildren}
      </MelodiakHero>
      <div className={`mx-auto px-5 py-8 md:py-10 ${maxWidthClass[maxWidth]}`}>
        {children}
      </div>
    </div>
  );
}
