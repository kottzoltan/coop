import { db } from '../../../db/index.js';
import { projektSzereplo } from '../../../db/schema.js';
import { eq, inArray, sql } from 'drizzle-orm';
import type { IceAuthContext } from './auth.js';
import { vanJog } from './auth.js';

/**
 * Admin: minden projekt.
 * Egyéb belső user: csak azok a projektek, ahol szereplőként (email) fel van víve.
 * Üres lista = nincs látható projekt (nem „minden”).
 */
export async function belsoLathatoProjektIds(
  auth: IceAuthContext,
): Promise<number[] | null> {
  if (vanJog(auth, 'admin', 'iras')) return null;

  const email = auth.email.toLowerCase().trim();
  if (!email) return [];

  const rows = await db
    .select({ projektId: projektSzereplo.projekt_id })
    .from(projektSzereplo)
    .where(sql`lower(${projektSzereplo.email}) = ${email}`);

  const ids = [...new Set(rows.map((r) => r.projektId).filter(Boolean))];
  return ids;
}

export function projektIdSzuro(
  lathato: number[] | null,
  column: Parameters<typeof inArray>[0],
) {
  if (lathato === null) return undefined;
  if (lathato.length === 0) return sql`false`;
  return inArray(column, lathato);
}

export async function assertProjektHozzaferes(
  auth: IceAuthContext,
  projektId: number | null | undefined,
): Promise<Response | null> {
  if (projektId == null) return null;
  const lathato = await belsoLathatoProjektIds(auth);
  if (lathato === null) return null;
  if (!lathato.includes(projektId)) {
    return Response.json({ hiba: 'Nincs hozzáférés ehhez a projekthez' }, { status: 403 });
  }
  return null;
}

export async function szereploHozzarendel(
  projektId: number,
  nev: string,
  email: string,
  szerepkor = 'Témavezető/Mentor',
) {
  const normalized = email.toLowerCase().trim();
  const [meglevo] = await db
    .select()
    .from(projektSzereplo)
    .where(
      sql`${projektSzereplo.projekt_id} = ${projektId} AND lower(${projektSzereplo.email}) = ${normalized}`,
    )
    .limit(1);

  if (meglevo) return meglevo;

  const [uj] = await db
    .insert(projektSzereplo)
    .values({
      projekt_id: projektId,
      nev,
      szerepkor,
      email: normalized,
      erv_kezdete: new Date().toISOString().slice(0, 7),
      tipus: 'Fedezet arányos',
      min_osszeg: 0,
      reszesedes: 10,
    })
    .returning();

  return uj;
}
