import { db } from '../../../db/index.js';
import { iceBeallitas } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export const PARTNER_MEGHIVO_SABLON_KULCS = 'partner_meghivo_sablon';

export interface PartnerMeghivoSablon {
  targy: string;
  szoveg: string;
}

export const ALAP_PARTNER_MEGHIVO_SABLON: PartnerMeghivoSablon = {
  targy: 'Meghívó az ICE partnerfelületre — {{cegnev}}',
  szoveg: `Kedves {{nev}}!

Meghívtak az ICE partnerfelületre{{projekt_sor}} kapcsolattartóként.

{{uzenet_sor}}

A belépéshez állítsd be a jelszavad az alábbi linken ({{lejarat}}-ig érvényes):
{{link}}

Üdvözlettel,
Coop`,
};

export const SABLON_HELYORZOK = [
  '{{nev}}',
  '{{email}}',
  '{{cegnev}}',
  '{{projekt}}',
  '{{projekt_sor}}',
  '{{link}}',
  '{{lejarat}}',
  '{{uzenet_sor}}',
] as const;

function sablonNormalizal(raw: Record<string, unknown> | null | undefined): PartnerMeghivoSablon {
  const targy = typeof raw?.targy === 'string' ? raw.targy.trim() : '';
  const szoveg = typeof raw?.szoveg === 'string' ? raw.szoveg.trim() : '';
  return {
    targy: targy || ALAP_PARTNER_MEGHIVO_SABLON.targy,
    szoveg: szoveg || ALAP_PARTNER_MEGHIVO_SABLON.szoveg,
  };
}

export function sablonRender(
  sablon: PartnerMeghivoSablon,
  vars: Record<string, string>,
): PartnerMeghivoSablon {
  const replace = (s: string) => {
    let out = s;
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{{${k}}}`).join(v);
    }
    return out.replace(/\n{3,}/g, '\n\n').trim();
  };
  return { targy: replace(sablon.targy), szoveg: replace(sablon.szoveg) };
}

export async function partnerMeghivoSablonLekerdezes(): Promise<PartnerMeghivoSablon> {
  try {
    const [row] = await db
      .select()
      .from(iceBeallitas)
      .where(eq(iceBeallitas.kulcs, PARTNER_MEGHIVO_SABLON_KULCS));
    return sablonNormalizal(row?.ertek as Record<string, unknown> | undefined);
  } catch {
    return { ...ALAP_PARTNER_MEGHIVO_SABLON };
  }
}

export async function partnerMeghivoSablonMentes(sablon: PartnerMeghivoSablon): Promise<PartnerMeghivoSablon> {
  const normal = sablonNormalizal(sablon);
  if (!normal.targy || !normal.szoveg) {
    throw new Error('A tárgy és a szöveg kötelező.');
  }
  try {
    const [existing] = await db
      .select()
      .from(iceBeallitas)
      .where(eq(iceBeallitas.kulcs, PARTNER_MEGHIVO_SABLON_KULCS));
    if (existing) {
      await db
        .update(iceBeallitas)
        .set({ ertek: normal, modositva: new Date() })
        .where(eq(iceBeallitas.kulcs, PARTNER_MEGHIVO_SABLON_KULCS));
    } else {
      await db.insert(iceBeallitas).values({
        kulcs: PARTNER_MEGHIVO_SABLON_KULCS,
        ertek: normal,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('ice_beallitas') || msg.includes('does not exist')) {
      throw new Error('Az e-mail sablon tábla még nem lértettek fel — várd meg a deployt vagy futtasd a migrációt.');
    }
    throw err;
  }
  return normal;
}

export function lejaratSzoveg(d: Date): string {
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function meghivoSablonValtozok(input: {
  nev: string;
  email: string;
  cegnev: string;
  projektNev: string | null;
  link: string;
  lejarat: Date;
  egyediUzenet?: string;
}): Record<string, string> {
  const projekt_sor = input.projektNev ? ` a(z) „${input.projektNev}” projekthez` : '';
  const uzenet_sor = input.egyediUzenet?.trim() ?? '';
  return {
    nev: input.nev,
    email: input.email,
    cegnev: input.cegnev,
    projekt: input.projektNev ?? '',
    projekt_sor,
    link: input.link,
    lejarat: lejaratSzoveg(input.lejarat),
    uzenet_sor,
  };
}
