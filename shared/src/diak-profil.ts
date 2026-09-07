export interface DiakSocialLink {
  tipus: string;
  url: string;
}

export interface DiakOneletrajz {
  fajlnev: string;
  feltoltve: string;
  /** Netlify Blobs kulcs */
  blob_key?: string;
}

export interface DiakTanulmany {
  id: string;
  intezmeny: string;
  szak: string;
  aktualis: boolean;
  elso_felev?: string;
  utolso_felev?: string;
  specializacio?: string;
  /** egyetem | kozepiskola — régi rekordoknál hiányozhat */
  tipus?: 'egyetem' | 'kozepiskola';
}

/** nap → ráérés szöveg (pl. "délelőtt", "13–17") */
export type HetiRareres = Record<string, string>;

export interface DiakProfilPayload {
  bemutatkozas?: string;
  keszsegek?: string[];
  tapasztalat?: string;
  social_linkek?: DiakSocialLink[];
  oneletrajz?: DiakOneletrajz | null;
  heti_rareres?: HetiRareres;
  tanulmanyok?: DiakTanulmany[];
}

export const HET_NAPOK = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'] as const;

export const HIANYZO_SZEKCIOK = [
  { id: 'oneletrajz', label: 'Önéletrajz' },
  { id: 'bemutatkozas', label: 'Bemutatkozás' },
  { id: 'keszsegek', label: 'Készségek' },
  { id: 'tapasztalat', label: 'Tapasztalat' },
  { id: 'tanulmany', label: 'Tanulmány' },
  { id: 'social', label: 'Social linkek' },
  { id: 'rareres', label: 'Heti ráérés' },
] as const;

export type HianyzoSzekcioId = (typeof HIANYZO_SZEKCIOK)[number]['id'];

export function uresDiakProfil(): DiakProfilPayload {
  return {
    bemutatkozas: '',
    keszsegek: [],
    tapasztalat: '',
    social_linkek: [],
    oneletrajz: null,
    heti_rareres: {},
    tanulmanyok: [],
  };
}

export function normalizaltDiakProfil(raw: unknown): DiakProfilPayload {
  const p = (raw && typeof raw === 'object' ? raw : {}) as DiakProfilPayload;
  return {
    bemutatkozas: p.bemutatkozas ?? '',
    keszsegek: Array.isArray(p.keszsegek) ? p.keszsegek : [],
    tapasztalat: p.tapasztalat ?? '',
    social_linkek: Array.isArray(p.social_linkek) ? p.social_linkek : [],
    oneletrajz: p.oneletrajz ?? null,
    heti_rareres: p.heti_rareres && typeof p.heti_rareres === 'object' ? p.heti_rareres : {},
    tanulmanyok: Array.isArray(p.tanulmanyok) ? p.tanulmanyok : [],
  };
}

function szekcioKesz(profil: DiakProfilPayload, id: HianyzoSzekcioId): boolean {
  switch (id) {
    case 'oneletrajz':
      return !!(profil.oneletrajz?.blob_key || profil.oneletrajz?.fajlnev);
    case 'bemutatkozas':
      return (profil.bemutatkozas?.trim().length ?? 0) >= 20;
    case 'keszsegek':
      return (profil.keszsegek?.length ?? 0) > 0;
    case 'tapasztalat':
      return (profil.tapasztalat?.trim().length ?? 0) >= 10;
    case 'tanulmany':
      return (profil.tanulmanyok?.length ?? 0) > 0;
    case 'social':
      return (profil.social_linkek?.some((l) => l.url.trim()) ?? false);
    case 'rareres':
      return Object.values(profil.heti_rareres ?? {}).some((v) => v.trim().length > 0);
    default:
      return false;
  }
}

export function profilKeszultseg(profil: DiakProfilPayload): {
  szazalek: number;
  hianyzik: Array<{ id: HianyzoSzekcioId; label: string }>;
} {
  const hianyzik = HIANYZO_SZEKCIOK.filter((s) => !szekcioKesz(profil, s.id));
  const kesz = HIANYZO_SZEKCIOK.length - hianyzik.length;
  return {
    szazalek: Math.round((kesz / HIANYZO_SZEKCIOK.length) * 100),
    hianyzik,
  };
}

export function ujTanulmanyId(): string {
  return `t-${Date.now()}`;
}
