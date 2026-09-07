import { admin, AuthError } from '@netlify/identity';
import { db } from '../../../db/index.js';
import { diakRegisztracio, iceFelhasznalo, partnerRegisztracio } from '../../../db/schema.js';
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

async function identityUpsert(email: string, password: string, nev: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
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
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const letezo = msg.includes('already') || (err instanceof AuthError && err.status === 422);
      if (!letezo) throw err instanceof Error ? err : new Error('Identity létrehozás sikertelen');
      identityId = await identityUserIdEmailhez(normalized);
      if (!identityId) throw new Error(`Identity fiók nem található: ${normalized}`);
    }
  }

  await admin.updateUser(identityId, { password, confirm: true });
  return identityId;
}

async function iceFelhasznaloUpsert(input: {
  identityId: string;
  email: string;
  szerep: 'diak' | 'partner';
  diakId?: number | null;
  partnerKapcsolatId?: number | null;
}) {
  const email = input.email.toLowerCase().trim();
  const [byEmail] = await db.select().from(iceFelhasznalo).where(eq(iceFelhasznalo.email, email));
  const [byId] = await db
    .select()
    .from(iceFelhasznalo)
    .where(eq(iceFelhasznalo.identityId, input.identityId));

  const adatok = {
    email,
    szerep: input.szerep,
    diakId: input.diakId ?? null,
    partnerKapcsolatId: input.partnerKapcsolatId ?? null,
    aktiv: true,
  };

  if (byId && byId.identityId === input.identityId) {
    await db.update(iceFelhasznalo).set(adatok).where(eq(iceFelhasznalo.identityId, input.identityId));
    return;
  }

  if (byEmail && byEmail.identityId !== input.identityId) {
    await db.delete(iceFelhasznalo).where(eq(iceFelhasznalo.identityId, byEmail.identityId));
  }

  if (!byId) {
    await db.insert(iceFelhasznalo).values({ identityId: input.identityId, ...adatok });
  } else {
    await db.update(iceFelhasznalo).set(adatok).where(eq(iceFelhasznalo.identityId, input.identityId));
  }
}

export async function demoPartnerFiok(input: {
  email: string;
  password: string;
  nev: string;
  cegnev: string;
  adoszam: string;
  telefon?: string;
}): Promise<{ email: string; partnerRegisztracioId: number; identityId: string }> {
  const email = input.email.toLowerCase().trim();
  const [meglevo] = await db
    .select()
    .from(partnerRegisztracio)
    .where(eq(partnerRegisztracio.email, email));

  let partnerRegisztracioId: number;
  if (meglevo) {
    await db
      .update(partnerRegisztracio)
      .set({
        cegnev: input.cegnev,
        kapcsolatNev: input.nev,
        adoszam: input.adoszam,
        telefon: input.telefon ?? meglevo.telefon,
        statusz: 'jóváhagyva',
        hozzaferes: 'iras',
      })
      .where(eq(partnerRegisztracio.id, meglevo.id));
    partnerRegisztracioId = meglevo.id;
  } else {
    const [uj] = await db
      .insert(partnerRegisztracio)
      .values({
        cegnev: input.cegnev,
        adoszam: input.adoszam,
        kapcsolatNev: input.nev,
        email,
        telefon: input.telefon ?? null,
        statusz: 'jóváhagyva',
        hozzaferes: 'iras',
      })
      .returning();
    partnerRegisztracioId = uj.id;
  }

  const identityId = await identityUpsert(email, input.password, input.nev);
  await iceFelhasznaloUpsert({
    identityId,
    email,
    szerep: 'partner',
    partnerKapcsolatId: partnerRegisztracioId,
  });

  return { email, partnerRegisztracioId, identityId };
}

export async function demoDiakFiok(input: {
  email: string;
  password: string;
  nev: string;
  telefon?: string;
  szuldat?: string;
  iroda?: string;
}): Promise<{ email: string; diakId: number; identityId: string }> {
  const email = input.email.toLowerCase().trim();
  const [meglevo] = await db.select().from(diakRegisztracio).where(eq(diakRegisztracio.email, email));

  let diakId: number;
  if (meglevo) {
    await db
      .update(diakRegisztracio)
      .set({
        nev: input.nev,
        telefon: input.telefon ?? meglevo.telefon,
        iroda: input.iroda ?? meglevo.iroda,
        statusz: 'aktív',
      })
      .where(eq(diakRegisztracio.id, meglevo.id));
    diakId = meglevo.id;
  } else {
    const [uj] = await db
      .insert(diakRegisztracio)
      .values({
        nev: input.nev,
        email,
        telefon: input.telefon ?? '+36 30 000 0000',
        szuldat: input.szuldat ?? '2004-05-15',
        iroda: input.iroda ?? 'Budapest',
        statusz: 'aktív',
      })
      .returning();
    diakId = uj.id;
  }

  const identityId = await identityUpsert(email, input.password, input.nev);
  await iceFelhasznaloUpsert({
    identityId,
    email,
    szerep: 'diak',
    diakId,
  });

  return { email, diakId, identityId };
}
