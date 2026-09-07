import { db } from '../../../db/index.js';
import {
  beosztas,
  diakRegisztracio,
  jelenlet,
  jelenletModositasNaplo,
  muszak,
  partnerRegisztracio,
  projekt,
} from '../../../db/schema.js';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  jelenletAtmenetEngedelyezett,
  jelenletStatuszNormalizalas,
  type JelenletForras,
  type JelenletRogzitesMod,
  type JelenletStatusz,
  type JelenletSzerep,
} from '../../../shared/src/jelenlet-workflow.js';

export interface JelenletAuditInput {
  identityId?: string;
  szerep: JelenletSzerep;
  indok?: string;
}

function ts(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export async function jelenletAudit(
  jelenletId: number,
  mezo: string,
  regi: unknown,
  uj: unknown,
  audit: JelenletAuditInput,
) {
  const regiStr = regi === undefined || regi === null ? null : String(regi);
  const ujStr = uj === undefined || uj === null ? null : String(uj);
  if (regiStr === ujStr) return;

  await db.insert(jelenletModositasNaplo).values({
    jelenletId,
    mezo,
    regiErtek: regiStr,
    ujErtek: ujStr,
    indok: audit.indok ?? null,
    modositoIdentityId: audit.identityId ?? null,
    modositoSzerep: audit.szerep,
  });
}

export async function jelenletAuditNaplo(jelenletId: number) {
  return db
    .select()
    .from(jelenletModositasNaplo)
    .where(eq(jelenletModositasNaplo.jelenletId, jelenletId))
    .orderBy(desc(jelenletModositasNaplo.letrehozva));
}

export async function jelenletStatuszValtas(
  sor: typeof jelenlet.$inferSelect,
  ujStatusz: JelenletStatusz,
  audit: JelenletAuditInput,
) {
  const jelenlegi = jelenletStatuszNormalizalas(sor.statusz);
  if (jelenlegi === ujStatusz) return sor;

  if (!jelenletAtmenetEngedelyezett(jelenlegi, ujStatusz, audit.szerep)) {
    throw new Error(`Nem engedélyezett állapotváltás: ${jelenlegi} → ${ujStatusz}`);
  }

  await jelenletAudit(sor.id, 'statusz', jelenlegi, ujStatusz, audit);

  const [friss] = await db
    .update(jelenlet)
    .set({ statusz: ujStatusz })
    .where(eq(jelenlet.id, sor.id))
    .returning();

  return friss ?? sor;
}

export async function jelenletMezoFrissites(
  sor: typeof jelenlet.$inferSelect,
  patch: {
    erkezes?: Date | null;
    tavozas?: Date | null;
    megjegyzes?: string | null;
  },
  audit: JelenletAuditInput,
  options?: { statuszValtoztathat?: boolean },
) {
  if (sor.statusz === 'pv_véglegesített' && !options?.statuszValtoztathat) {
    throw new Error('PV véglegesített jelenlét nem módosítható.');
  }

  const dbPatch: Record<string, unknown> = {};

  if (patch.erkezes !== undefined) {
    await jelenletAudit(sor.id, 'erkezes', ts(sor.erkezes), ts(patch.erkezes), audit);
    dbPatch.erkezes = patch.erkezes;
  }
  if (patch.tavozas !== undefined) {
    await jelenletAudit(sor.id, 'tavozas', ts(sor.tavozas), ts(patch.tavozas), audit);
    dbPatch.tavozas = patch.tavozas;
  }
  if (patch.megjegyzes !== undefined) {
    await jelenletAudit(sor.id, 'megjegyzes', sor.megjegyzes, patch.megjegyzes, audit);
    dbPatch.megjegyzes = patch.megjegyzes;
  }

  if (Object.keys(dbPatch).length === 0) return sor;

  const [friss] = await db
    .update(jelenlet)
    .set(dbPatch)
    .where(eq(jelenlet.id, sor.id))
    .returning();

  return friss ?? sor;
}

export interface JelenletRogzitesInput {
  diakId: number;
  beosztasId?: number | null;
  projektId?: number | null;
  muszakDatum?: string | null;
  partnerId?: number | null;
  erkezes?: Date | null;
  tavozas?: Date | null;
  megjegyzes?: string | null;
  forras: JelenletForras;
  rogzitesMod: JelenletRogzitesMod;
  identityId?: string;
}

/** Flexibilis jelenlét rögzítés — beosztás nélkül is. */
export async function jelenletRogzites(input: JelenletRogzitesInput) {
  let projektId = input.projektId ?? null;
  let muszakDatum = input.muszakDatum ?? null;
  let partnerId = input.partnerId ?? null;
  let beosztasId = input.beosztasId ?? null;

  if (beosztasId) {
    const [b] = await db
      .select({ beosztas: beosztas, muszak: muszak })
      .from(beosztas)
      .innerJoin(muszak, eq(beosztas.muszakId, muszak.id))
      .where(eq(beosztas.id, beosztasId));

    if (!b) throw new Error('Beosztás nem található.');
    if (b.beosztas.diakId !== input.diakId) {
      throw new Error('A beosztás nem ehhez a diákhoz tartozik.');
    }
    projektId = b.muszak.projektId;
    muszakDatum = b.muszak.datum;
    partnerId = b.muszak.partnerId;
  }

  if (!projektId && !beosztasId) {
    throw new Error('Projekt vagy beosztás megadása kötelező.');
  }

  const [sor] = await db
    .insert(jelenlet)
    .values({
      beosztasId,
      diakId: input.diakId,
      projektId,
      muszakDatum: muszakDatum ?? undefined,
      partnerId,
      erkezes: input.erkezes ?? null,
      tavozas: input.tavozas ?? null,
      megjegyzes: input.megjegyzes ?? null,
      statusz: 'rögzített',
      forras: input.forras,
      rogzitesMod: input.rogzitesMod,
      rogzitetteIdentityId: input.identityId ?? null,
    })
    .returning();

  if (!sor) throw new Error('Jelenlét mentése sikertelen.');

  await jelenletAudit(sor.id, 'statusz', null, 'rögzített', {
    identityId: input.identityId,
    szerep: input.forras === 'partner' ? 'partner' : input.forras === 'pv' ? 'pv' : 'diak',
    indok: 'Új jelenlét rögzítve',
  });

  return sor;
}

export async function jelenletPartnerJovahagyas(
  sor: typeof jelenlet.$inferSelect,
  audit: JelenletAuditInput,
  patch?: { erkezes?: Date | null; tavozas?: Date | null; megjegyzes?: string | null },
) {
  let aktualis = sor;
  if (patch) {
    aktualis = await jelenletMezoFrissites(sor, patch, audit);
  }
  return jelenletStatuszValtas(aktualis, 'partner_jóváhagyva', audit);
}

export async function jelenletPvVeglegesites(
  sor: typeof jelenlet.$inferSelect,
  audit: JelenletAuditInput,
  patch?: { erkezes?: Date | null; tavozas?: Date | null; megjegyzes?: string | null },
) {
  let aktualis = sor;
  if (patch) {
    aktualis = await jelenletMezoFrissites(sor, patch, { ...audit, indok: audit.indok ?? 'PV véglegesítés előtti javítás' });
  }
  return jelenletStatuszValtas(aktualis, 'pv_véglegesített', audit);
}

export async function jelenletSorLekerdezes(id: number) {
  const [row] = await db.select().from(jelenlet).where(eq(jelenlet.id, id));
  return row ?? null;
}

export async function pvOsszesitoSzamok() {
  const rows = await db.execute<{ k: string; v: number }>(sql`
    SELECT 'jelenlet_rogzitett' AS k, count(*)::int AS v FROM jelenlet WHERE statusz = 'rögzített'
    UNION ALL
    SELECT 'jelenlet_partner_jovahagyva', count(*)::int FROM jelenlet WHERE statusz = 'partner_jóváhagyva'
    UNION ALL
    SELECT 'jelenlet_pv_veglegesitett', count(*)::int FROM jelenlet WHERE statusz = 'pv_véglegesített'
    UNION ALL
    SELECT 'megrendeles_piszkozat', count(*)::int FROM muszak WHERE statusz = 'piszkozat'
  `);

  const out: Record<string, number> = {};
  for (const r of rows.rows as { k: string; v: number }[]) {
    out[r.k] = r.v;
  }
  return out;
}

export async function jelenletListaJoin(options: {
  statusz?: string;
  projektId?: number;
  partnerId?: number;
  projektIds?: number[] | null;
  limit?: number;
}) {
  const feltetelek = [];
  if (options.statusz) feltetelek.push(eq(jelenlet.statusz, options.statusz));
  if (options.projektId) feltetelek.push(eq(jelenlet.projektId, options.projektId));
  if (options.partnerId) feltetelek.push(eq(jelenlet.partnerId, options.partnerId));
  if (options.projektIds !== undefined && options.projektIds !== null) {
    if (options.projektIds.length === 0) {
      feltetelek.push(sql`false`);
    } else {
      feltetelek.push(inArray(jelenlet.projektId, options.projektIds));
    }
  }

  const q = db
    .select({
      jelenlet: jelenlet,
      diak_nev: diakRegisztracio.nev,
      projekt_azonosito: projekt.azonosito,
      projekt_nev: projekt.nev,
      partner_cegnev: partnerRegisztracio.cegnev,
      muszak_cim: muszak.cim,
      muszak_datum_join: muszak.datum,
    })
    .from(jelenlet)
    .innerJoin(diakRegisztracio, eq(jelenlet.diakId, diakRegisztracio.id))
    .leftJoin(beosztas, eq(jelenlet.beosztasId, beosztas.id))
    .leftJoin(muszak, eq(beosztas.muszakId, muszak.id))
    .leftJoin(projekt, eq(jelenlet.projektId, projekt.id))
    .leftJoin(partnerRegisztracio, eq(jelenlet.partnerId, partnerRegisztracio.id))
    .orderBy(desc(jelenlet.letrehozva))
    .limit(options.limit ?? 300);

  if (feltetelek.length) {
    return q.where(and(...feltetelek));
  }
  return q;
}
