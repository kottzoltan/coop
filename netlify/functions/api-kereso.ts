import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import {
  diakRegisztracio,
  kampany,
  kampanyResztvevo,
  munkaHirdetes,
  munkaJelentkezes,
  munkalap,
  partner,
  projekt,
  szovetkezetiTag,
} from '../../db/schema.js';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import { belsoLathatoProjektIds, projektIdSzuro } from './lib/projekt-scope.js';

export default async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const auth = await requireBelso('erdeklodok', 'olvasas');
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const modul = url.searchParams.get('modul') ?? 'mind';

  if (!q || q.length < 2) {
    return Response.json({ hiba: 'Legalább 2 karakteres keresés szükséges' }, { status: 400 });
  }

  const minta = `%${q}%`;
  const eredmeny: Record<string, unknown[]> = {};
  const lathato = await belsoLathatoProjektIds(auth);

  if (modul === 'mind' || modul === 'tagok') {
    const sorok = await db
      .select({
        id: szovetkezetiTag.id,
        nev: szovetkezetiTag.nev,
        adoszam: szovetkezetiTag.adoszam,
        email: szovetkezetiTag.email,
        iroda: szovetkezetiTag.iroda,
        tagsag_statusz: szovetkezetiTag.tagsagStatusz,
      })
      .from(szovetkezetiTag)
      .where(
        or(
          ilike(szovetkezetiTag.nev, minta),
          ilike(szovetkezetiTag.email, minta),
          ilike(szovetkezetiTag.adoszam, minta),
        ),
      )
      .orderBy(desc(szovetkezetiTag.letrehozva))
      .limit(30);
    eredmeny.tagok = sorok;
  }

  if (modul === 'mind' || modul === 'erdeklodok') {
    const sorok = await db
      .select({
        id: diakRegisztracio.id,
        nev: diakRegisztracio.nev,
        email: diakRegisztracio.email,
        telefon: diakRegisztracio.telefon,
        iroda: diakRegisztracio.iroda,
        statusz: diakRegisztracio.statusz,
      })
      .from(diakRegisztracio)
      .where(
        or(
          ilike(diakRegisztracio.nev, minta),
          ilike(diakRegisztracio.email, minta),
          ilike(diakRegisztracio.telefon, minta),
        ),
      )
      .orderBy(desc(diakRegisztracio.letrehozva))
      .limit(30);
    eredmeny.erdeklodok = sorok;
  }

  if (modul === 'mind' || modul === 'partnerek') {
    const sorok = await db
      .select({
        id: partner.id,
        nev: partner.nev,
        adoszam: partner.adoszam,
        iroda: partner.iroda,
        statusz: partner.statusz,
      })
      .from(partner)
      .where(
        or(
          ilike(partner.nev, minta),
          ilike(partner.adoszam, minta),
          ilike(partner.iroda, minta),
        ),
      )
      .orderBy(desc(partner.letrehozva))
      .limit(30);
    eredmeny.partnerek = sorok;
  }

  if (modul === 'mind' || modul === 'projektek') {
    const scope = projektIdSzuro(lathato, projekt.id);
    const sorok = await db
      .select({
        id: projekt.id,
        azonosito: projekt.azonosito,
        nev: projekt.nev,
        statusz: projekt.statusz,
        iroda: projekt.iroda,
      })
      .from(projekt)
      .where(
        and(
          or(
            ilike(projekt.nev, minta),
            ilike(projekt.azonosito, minta),
            ilike(projekt.iroda, minta),
          )!,
          scope ?? undefined,
        ),
      )
      .orderBy(desc(projekt.letrehozva))
      .limit(30);
    eredmeny.projektek = sorok;
  }

  if (modul === 'mind' || modul === 'hirdetesek') {
    const scope = projektIdSzuro(lathato, munkaHirdetes.projekt_id);
    const sorok = await db
      .select({
        id: munkaHirdetes.id,
        cim: munkaHirdetes.cim,
        varos: munkaHirdetes.varos,
        munkakor: munkaHirdetes.munkakor,
        statusz: munkaHirdetes.statusz,
      })
      .from(munkaHirdetes)
      .where(
        and(
          or(
            ilike(munkaHirdetes.cim, minta),
            ilike(munkaHirdetes.varos, minta),
            ilike(munkaHirdetes.munkakor, minta),
          )!,
          scope ?? undefined,
        ),
      )
      .orderBy(desc(munkaHirdetes.letrehozva))
      .limit(30);
    eredmeny.hirdetesek = sorok;
  }

  if (modul === 'mind' || modul === 'jelentkezesek') {
    const scope = projektIdSzuro(lathato, munkaHirdetes.projekt_id);
    const sorok = await db
      .select({
        id: munkaJelentkezes.id,
        nev: munkaJelentkezes.nev,
        email: munkaJelentkezes.email,
        statusz: munkaJelentkezes.statusz,
        hirdetes_cim: munkaHirdetes.cim,
      })
      .from(munkaJelentkezes)
      .innerJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
      .where(
        and(
          or(
            ilike(munkaJelentkezes.nev, minta),
            ilike(munkaJelentkezes.email, minta),
            ilike(munkaHirdetes.cim, minta),
          )!,
          scope ?? undefined,
        ),
      )
      .orderBy(desc(munkaJelentkezes.letrehozva))
      .limit(30);
    eredmeny.jelentkezesek = sorok;
  }

  if (modul === 'mind' || modul === 'munkalapok') {
    const scope = projektIdSzuro(lathato, munkalap.projektId);
    const sorok = await db
      .select({
        id: munkalap.id,
        azonosito: munkalap.azonosito,
        nev: munkalap.nev,
        statusz: munkalap.statusz,
        szf_idoszak: munkalap.szfIdoszak,
        projekt_azonosito: projekt.azonosito,
      })
      .from(munkalap)
      .innerJoin(projekt, eq(munkalap.projektId, projekt.id))
      .where(
        and(
          or(
            ilike(munkalap.azonosito, minta),
            ilike(munkalap.nev, minta),
            ilike(projekt.azonosito, minta),
          )!,
          scope ?? undefined,
        ),
      )
      .orderBy(desc(munkalap.letrehozva))
      .limit(30);
    eredmeny.munkalapok = sorok;
  }

  const osszes = Object.values(eredmeny).reduce((n, arr) => n + arr.length, 0);

  return Response.json({ q, modul, eredmeny, osszes });
};

export const config: Config = {
  path: '/api/kereso',
};
