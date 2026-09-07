import type { IrodaInfo } from '../../data/irodak';

interface KapcsolatKartyaProps {
  nev: string;
  email: string;
}

export function KapcsolatKartya({ nev, email }: KapcsolatKartyaProps) {
  return (
    <div className="rounded-xl border border-[#c5dff5] bg-[#EAF4FC] p-5 shadow-sm">
      <p className="text-base font-bold text-navy">{nev}</p>
      <a
        href={`mailto:${email}`}
        className="mt-2 block text-sm font-medium text-[#2C7BD6] hover:underline"
      >
        {email}
      </a>
      <a
        href={`mailto:${email}`}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2C7BD6] hover:underline"
      >
        <span aria-hidden>✉</span>
        Üzenet küldése
      </a>
    </div>
  );
}

/** Toborzó e-mail becslése névből (melodiak.hu minta: kornya.jozsef@) */
export function toborzoEmail(nev: string, iroda: IrodaInfo): string {
  const parts = nev
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}@melodiak.hu`;
  }
  return iroda.email;
}
