import type { szovetkezetiTag } from '../../../../db/schema.js';
import { tagValasz } from '../tag-map.js';
import { listSzjaKedvezmenyek } from './szja-kedvezmeny-service.js';
import type { SzovetkezetiTag } from '../../../../shared/src/tag.js';

type TagRow = typeof szovetkezetiTag.$inferSelect;

export async function tagValaszEnriched(row: TagRow): Promise<SzovetkezetiTag> {
  const base = tagValasz(row);
  try {
    const kedv = await listSzjaKedvezmenyek(row.id);
    if (kedv.length > 0) {
      return { ...base, szja_kedvezmenyek: kedv };
    }
  } catch {
    /* tábla még nem létezik deploy előtt */
  }
  return base;
}
