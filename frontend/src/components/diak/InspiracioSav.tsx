import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import munkaCsoport from '../../assets/munka-csoport.jpg';

interface InspiracioSavProps {
  title?: string;
  leiras?: string;
  ctaLabel?: string;
  ctaTo?: string;
  children?: ReactNode;
}

export function InspiracioSav({
  title = 'Találd meg a neked való munkát',
  leiras = 'Irodai, fizikai, vendéglátóipari és gyakornoki lehetőségek — szűrj város, munkakör és címke szerint, majd jelentkezz egy kattintással.',
  ctaLabel,
  ctaTo,
  children,
}: InspiracioSavProps) {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 md:flex-row md:py-10">
        <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-2xl shadow-md md:h-52 md:w-80">
          <img src={munkaCsoport} alt="Diákok együtt" className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-xl font-bold text-navy md:text-2xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-body md:text-base">
            {leiras}
          </p>
          {children}
          {ctaLabel && ctaTo && (
            <Link to={ctaTo} className="btn-melodiak mt-4 inline-block">
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
