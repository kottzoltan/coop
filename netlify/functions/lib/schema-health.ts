import { db } from '../../../db/index.js';
import { sql } from 'drizzle-orm';
import {
  projektKiterjesztettOszlopok,
  projektMetaOszlopElerheto,
  projektPartnerIdOszlop,
} from './projekt-db.js';

function executeRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows: unknown }).rows;
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  }
  return [];
}

async function tablaLetezik(nev: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${nev}
    `);
    return Number(executeRows(result)[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

async function oszlopLetezik(tabla: string, oszlop: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tabla} AND column_name = ${oszlop}
    `);
    return Number(executeRows(result)[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

export type SchemaHealth = {
  projekt_meta: boolean;
  projekt_partner_id: boolean;
  szovetkezeti_tag: boolean;
  partner_crm: boolean;
  munkalap: boolean;
  munkalap_korrekcio: boolean;
  jelenlet_qr: boolean;
  kampany: boolean;
  jelentkezes_megjegyzes: boolean;
  jelentkezes_nem_ertem_el: boolean;
  nav_bejelentes: boolean;
  penzugy_szamla: boolean;
  blog_ugy_ealairas: boolean;
  hianyzo: string[];
};

export async function schemaHealth(): Promise<SchemaHealth> {
  const [
    projekt_meta,
    projekt_partner_id,
    tagTabla,
    partnerTabla,
    munkalapTabla,
    korrekcioOszlop,
    qrErkezes,
    kampanyTabla,
    jelMegjegyzes,
    jelNemErtemEl,
    navBejelentes,
    penzugyTabla,
    blogTabla,
  ] = await Promise.all([
    projektMetaOszlopElerheto(),
    projektPartnerIdOszlop(),
    tablaLetezik('szovetkezeti_tag'),
    tablaLetezik('partner'),
    tablaLetezik('munkalap'),
    oszlopLetezik('munkalap', 'korrekcio_szulo_id'),
    oszlopLetezik('jelenlet', 'qr_erkezes'),
    tablaLetezik('kampany'),
    oszlopLetezik('munka_jelentkezes', 'megjegyzes'),
    oszlopLetezik('munka_jelentkezes', 'nem_ertem_el_at'),
    oszlopLetezik('szovetkezeti_tag', 'nav_bejelentes'),
    tablaLetezik('penzugy_szamla'),
    tablaLetezik('blog_bejegyzes'),
  ]);

  const hianyzo: string[] = [];
  if (!(await projektKiterjesztettOszlopok())) hianyzo.push('0007/0011 projekt meta');
  if (!projekt_partner_id) hianyzo.push('0016 partner_id');
  if (!tagTabla) hianyzo.push('0013 szovetkezeti_tag');
  if (!partnerTabla) hianyzo.push('0014 partner CRM');
  if (!munkalapTabla) hianyzo.push('0015 munkalap');
  if (!korrekcioOszlop) hianyzo.push('0018 korrekcio_szulo_id');
  if (!qrErkezes) hianyzo.push('0019 jelenlet QR');
  if (!kampanyTabla) hianyzo.push('0020 kampany');
  if (!jelMegjegyzes) hianyzo.push('0020 jelentkezes megjegyzes');
  if (!jelNemErtemEl) hianyzo.push('0021 nem_ertem_el_at');
  if (!navBejelentes) hianyzo.push('0022 nav_bejelentes');
  if (!penzugyTabla) hianyzo.push('0022 penzugy_szamla');
  if (!blogTabla) hianyzo.push('0022 blog/ugy/ealairas');

  return {
    projekt_meta,
    projekt_partner_id,
    szovetkezeti_tag: tagTabla,
    partner_crm: partnerTabla,
    munkalap: munkalapTabla,
    munkalap_korrekcio: korrekcioOszlop,
    jelenlet_qr: qrErkezes,
    kampany: kampanyTabla,
    jelentkezes_megjegyzes: jelMegjegyzes,
    jelentkezes_nem_ertem_el: jelNemErtemEl,
    nav_bejelentes: navBejelentes,
    penzugy_szamla: penzugyTabla,
    blog_ugy_ealairas: blogTabla,
    hianyzo,
  };
}
