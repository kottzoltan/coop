import { db } from '../../../db/index.js';
import { projekt } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { envGet } from './netlify-env.js';
import {
  PROJEKT_DEMO_META,
  validateProjektMeta,
  type ProjektMetaPayload,
} from '../../../shared/src/projekt-demo-meta.js';

type ProjektSor = typeof projekt.$inferSelect;

function isEmptyMeta(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object') return true;
  return Object.keys(meta as object).length === 0;
}

function demoMetaEngedelyezett(): boolean {
  if (envGet('ICE_DEMO_META') === '1') return true;
  if (envGet('NETLIFY_DEV') === 'true') return true;
  if (envGet('CONTEXT') === 'dev') return true;
  return false;
}

/** Demo meta összefésülés — csak dev / ICE_DEMO_META=1 környezetben */
export function mergeProjektMeta(sor: ProjektSor): ProjektMetaPayload {
  const stored = (sor.meta ?? {}) as ProjektMetaPayload;
  if (!demoMetaEngedelyezett()) return stored;

  const demo = PROJEKT_DEMO_META[sor.azonosito];
  if (isEmptyMeta(stored) && demo) return demo;
  if (demo) return { ...demo, ...stored };
  return stored;
}

/** Háttérben menti a demo metát, ha üres — csak demo környezetben */
export function seedProjektMetaIfEmpty(sor: ProjektSor): void {
  if (!demoMetaEngedelyezett()) return;
  const demo = PROJEKT_DEMO_META[sor.azonosito];
  if (!demo || !isEmptyMeta(sor.meta)) return;

  db.update(projekt)
    .set({ meta: demo })
    .where(eq(projekt.id, sor.id))
    .catch(() => undefined);
}

/** Meta mentése DB-be (a kliens a teljes egyesített meta objektumot küldi) */
export async function saveProjektMeta(
  projektId: number,
  meta: ProjektMetaPayload,
): Promise<void> {
  const hiba = validateProjektMeta(meta);
  if (hiba) throw new Error(hiba);

  await db.update(projekt).set({ meta }).where(eq(projekt.id, projektId));
}
