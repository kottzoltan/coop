/** Belső ICE ügycsoportok — jogosultság-mátrix sorai */
export const UGYCSOPORTOK = [
  'erdeklodok',
  'tagok',
  'partnerek',
  'projektek',
  'toborzas',
  'berszamfejtes',
  'beosztas',
  'penzugy',
  'admin',
] as const;

export type Ugycsoport = (typeof UGYCSOPORTOK)[number];

export const UGYCSOPORT_LABELS: Record<Ugycsoport, string> = {
  erdeklodok: 'Érdeklődő diákok',
  tagok: 'Szövetkezeti tagok',
  partnerek: 'Partnerek',
  projektek: 'Projektek',
  toborzas: 'Toborzás',
  berszamfejtes: 'Bérszámfejtés',
  beosztas: 'Beosztás / jelenlét',
  penzugy: 'Pénzügy / számlázás',
  admin: 'Admin (jogosultságok)',
};
