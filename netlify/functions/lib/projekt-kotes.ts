import { db } from '../../../db/index.js';
import { projekt, projektSzereplo, penzugySzamla } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  szamfejtesiBerekBerKodLista,
  teljesitesMetaFromMunkalap,
  validateHirdetesProjektMezok,
  validateMunkalapBerKodok,
  type ProjektMetaPayload,
} from '../../../shared/src/projekt-demo-meta.js';
import { diakBruttoOra, type MunkalapDiak } from '../../../shared/src/munkalap.js';
import { mergeProjektMeta, saveProjektMeta } from './projekt-meta.js';
import type { munkalap } from '../../../db/schema.js';

type MunkalapRow = typeof munkalap.$inferSelect;

export async function projektMetaEsSzereplok(projektId: number) {
  const [p] = await db.select().from(projekt).where(eq(projekt.id, projektId));
  if (!p) return null;
  const meta = mergeProjektMeta(p);
  const szereplok = await db
    .select()
    .from(projektSzereplo)
    .where(eq(projektSzereplo.projekt_id, projektId));
  return { projekt: p, meta, szereplok };
}

export async function hirdetesProjektEllenorzes(
  projektId: number | null | undefined,
  felelos: string | null | undefined,
  kifizetesiKod: string | null | undefined,
): Promise<string | null> {
  if (!projektId) return null;
  const ctx = await projektMetaEsSzereplok(projektId);
  if (!ctx) return 'Projekt nem található';
  return validateHirdetesProjektMezok(ctx.meta, ctx.szereplok, felelos, kifizetesiKod);
}

export function munkalapDiakokEllenorzes(
  diakok: unknown[],
  meta: ProjektMetaPayload,
): string | null {
  const normalizalt = diakok
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
    .map((d) => ({
      idoadatok:
        d.idoadatok && typeof d.idoadatok === 'object'
          ? (d.idoadatok as Record<string, { kod?: string }>)
          : undefined,
    }));
  return validateMunkalapBerKodok(normalizalt, meta);
}

export async function teljesitesFrissitesMunkalapbol(
  munkalapRow: MunkalapRow,
  diakok: MunkalapDiak[],
  korrekcios = false,
): Promise<void> {
  const ctx = await projektMetaEsSzereplok(munkalapRow.projektId);
  if (!ctx) return;

  const berKodok = szamfejtesiBerekBerKodLista(ctx.meta);
  let osszBrutto = 0;
  for (const d of diakok) {
    osszBrutto += diakBruttoOra(d, berKodok).brutto;
  }

  const { teljesites, kifizetes } = teljesitesMetaFromMunkalap(
    {
      azonosito: munkalapRow.azonosito,
      telj_idoszak: munkalapRow.teljIdoszak,
      szf_idoszak: munkalapRow.szfIdoszak,
      temavezeto: munkalapRow.temavezeto,
      diakok,
      ossz_brutto: Math.round(osszBrutto),
    },
    ctx.projekt.azonosito,
    ctx.meta,
    ctx.meta.teljesitesek,
    korrekcios,
  );

  const teljesitesek = [...(ctx.meta.teljesitesek ?? [])];
  const tIdx = teljesitesek.findIndex(
    (t) => t.munkalap_azonosito === munkalapRow.azonosito,
  );
  if (tIdx >= 0) teljesitesek[tIdx] = teljesites;
  else teljesitesek.unshift(teljesites);

  const kifizetesek = [...(ctx.meta.kifizetesek ?? [])];
  const kIdx = kifizetesek.findIndex(
    (k) => k.munkalap_azonosito === munkalapRow.azonosito,
  );
  if (kIdx >= 0) kifizetesek[kIdx] = { ...kifizetesek[kIdx], ...kifizetes };
  else kifizetesek.unshift(kifizetes);

  await saveProjektMeta(ctx.projekt.id, {
    ...ctx.meta,
    teljesitesek,
    kifizetesek,
  });

  if (ctx.meta.szamlazas?.automatikus_szamlazas && !korrekcios) {
    const meglevo = await db
      .select({ id: penzugySzamla.id })
      .from(penzugySzamla)
      .where(eq(penzugySzamla.munkalapId, munkalapRow.id))
      .limit(1);
    if (!meglevo.length) {
      await db.insert(penzugySzamla).values({
        munkalapId: munkalapRow.id,
        projektId: munkalapRow.projektId,
        munkalapAzonosito: munkalapRow.azonosito,
        osszeg: Math.round(osszBrutto),
        statusz: 'piszkozat',
        megjegyzes: 'Automatikus számlázás — munkalap jóváhagyás',
      });
    }
  }
}
