import { admin, AuthError } from '@netlify/identity';
import { db } from '../../../db/index.js';
import { belsoJogosultsag, iceFelhasznalo } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

async function identityUserIdEmailhez(email: string): Promise<string | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  while (true) {
    const users = await admin.listUsers({ page, perPage });
    const found = users.find((u) => u.email?.toLowerCase() === normalized);
    if (found) return found.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function iceBelsoFelhasznaloLetrehozas(
  identityId: string,
  email: string,
) {
  const [existing] = await db
    .select()
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.email, email));

  if (existing) {
    if (existing.identityId !== identityId) {
      // Elavult Identity ID — törlés és újraírás a PK miatt
      await db.delete(iceFelhasznalo).where(eq(iceFelhasznalo.identityId, existing.identityId));
      const [created] = await db
        .insert(iceFelhasznalo)
        .values({
          identityId,
          email,
          szerep: 'belso',
          aktiv: true,
          diakId: null,
          partnerKapcsolatId: null,
        })
        .returning();
      return created;
    }
    if (existing.szerep !== 'belso' || !existing.aktiv) {
      await db
        .update(iceFelhasznalo)
        .set({ szerep: 'belso', aktiv: true, diakId: null, partnerKapcsolatId: null })
        .where(eq(iceFelhasznalo.identityId, identityId));
    }
    return existing;
  }

  const [byId] = await db
    .select()
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.identityId, identityId));

  if (byId) {
    await db
      .update(iceFelhasznalo)
      .set({ email, szerep: 'belso', aktiv: true, diakId: null, partnerKapcsolatId: null })
      .where(eq(iceFelhasznalo.identityId, identityId));
    return byId;
  }

  const [created] = await db
    .insert(iceFelhasznalo)
    .values({
      identityId,
      email,
      szerep: 'belso',
      aktiv: true,
    })
    .returning();

  return created;
}

export async function jogosultsagMatrixMentese(
  identityId: string,
  jogosultsagok: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }>,
) {
  await db
    .delete(belsoJogosultsag)
    .where(eq(belsoJogosultsag.felhasznaloIdentityId, identityId));

  const rows = jogosultsagok.filter((j) => j.olvasas || j.iras);
  if (rows.length > 0) {
    await db.insert(belsoJogosultsag).values(
      rows.map((j) => ({
        felhasznaloIdentityId: identityId,
        ugycsoport: j.ugycsoport,
        olvasas: j.olvasas || j.iras,
        iras: j.iras,
      })),
    );
  }
}

/** Létrehoz vagy frissít Identity + ICE belső felhasználót (idempotens). */
export async function identityBelsoFelhasznaloUpsert(
  email: string,
  password: string,
  jogosultsagok: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }>,
  fullName?: string,
) {
  const normalized = email.toLowerCase().trim();
  const nev = fullName ?? normalized.split('@')[0] ?? 'PV';

  let identityId = await identityUserIdEmailhez(normalized);

  if (!identityId) {
    try {
      const user = await admin.createUser({
        email: normalized,
        password,
        data: { user_metadata: { full_name: nev } },
      });
      identityId = user.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const letezo =
        msg.toLowerCase().includes('already') || (err instanceof AuthError && err.status === 422);
      if (!letezo) throw err instanceof Error ? err : new Error('Identity létrehozás sikertelen');
      identityId = await identityUserIdEmailhez(normalized);
      if (!identityId) throw new Error('Identity fiók már létezik, de nem található.');
      await admin.updateUser(identityId, { password, confirm: true, user_metadata: { full_name: nev } });
    }
  } else {
    await admin.updateUser(identityId, { password, confirm: true, user_metadata: { full_name: nev } });
  }

  await iceBelsoFelhasznaloLetrehozas(identityId, normalized);
  await jogosultsagMatrixMentese(identityId, jogosultsagok);

  return { id: identityId, email: normalized };
}

export async function identityBelsoFelhasznaloLetrehozas(
  email: string,
  password: string,
  jogosultsagok: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }>,
) {
  return identityBelsoFelhasznaloUpsert(email, password, jogosultsagok);
}
