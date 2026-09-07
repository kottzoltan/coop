import type { IrodaInfo } from '../../data/irodak';

interface IrodaKartyaProps {
  iroda: IrodaInfo;
}

export function IrodaKartya({ iroda }: IrodaKartyaProps) {
  return (
    <div className="w-full max-w-sm shrink-0 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-lg font-bold text-navy">Iroda</h3>
      <p className="mt-2 text-sm font-semibold text-navy">{iroda.nev}</p>
      <p className="mt-1 text-sm text-text-body">{iroda.cim}</p>
      <a
        href={`mailto:${iroda.email}`}
        className="mt-2 block text-sm font-medium text-[#2C7BD6] hover:underline"
      >
        {iroda.email}
      </a>
      <a
        href={`tel:${iroda.telefon.replace(/\s/g, '')}`}
        className="mt-1 block text-sm font-medium text-[#2C7BD6] hover:underline"
      >
        {iroda.telefon}
      </a>
      <p className="mt-4 text-right text-sm font-bold text-[#2C7BD6]">→ Részletek</p>
    </div>
  );
}
