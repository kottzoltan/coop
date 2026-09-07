import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { munkaJelentkezes, munkaHirdetes, diakRegisztracio } from '../../db/schema.js';
import { desc, eq, and, ilike, or, isNotNull } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import { normalizaltDiakProfil } from '../../shared/src/diak-profil.js';
import { nemErtemElLejart, parseNemErtemElOrak } from './lib/nem-ertem-el.js';
import { inditsSzerzodesAlairasFelvetelUtan } from './lib/diak-szerzodes-alairas.js';
import {
  assertProjektHozzaferes,
  belsoLathatoProjektIds,
  projektIdSzuro,
} from './lib/projekt-scope.js';

const STATUSZOK = [
  'Kezeletlen',
  'Önéletrajzot várunk',
  'Interjú',
  'Felvéve',
  'Más munkára ajánlottuk',
  'Nem elérhető',
  'Visszamondta',
  'Elutasítva',
] as const;

async function nemErtemElVisszaallitas(): Promise<number> {
  const sorok = await db
    .select({
      id: munkaJelentkezes.id,
      nem_ertem_el_at: munkaJelentkezes.nemErtemElAt,
      nem_ertem_el: munkaHirdetes.nem_ertem_el,
    })
    .from(munkaJelentkezes)
    .innerJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
    .where(
      and(
        eq(munkaJelentkezes.statusz, 'Nem elérhető'),
        isNotNull(munkaJelentkezes.nemErtemElAt),
      ),
    );

  let frissitve = 0;
  for (const s of sorok) {
    if (!s.nem_ertem_el_at) continue;
    const limit = parseNemErtemElOrak(s.nem_ertem_el);
    if (nemErtemElLejart(s.nem_ertem_el_at, limit)) {
      await db
        .update(munkaJelentkezes)
        .set({ statusz: 'Kezeletlen', nemErtemElAt: null })
        .where(eq(munkaJelentkezes.id, s.id));
      frissitve += 1;
    }
  }
  return frissitve;
}

async function jelentkezesSor(id: number) {
  const [sor] = await db
    .select({
      id: munkaJelentkezes.id,
      hirdetes_id: munkaJelentkezes.hirdetes_id,
      nev: munkaJelentkezes.nev,
      email: munkaJelentkezes.email,
      telefon: munkaJelentkezes.telefon,
      regisztracio_id: munkaJelentkezes.regisztracio_id,
      statusz: munkaJelentkezes.statusz,
      megjegyzes: munkaJelentkezes.megjegyzes,
      mas_hirdetes_id: munkaJelentkezes.masHirdetesId,
      nem_ertem_el_at: munkaJelentkezes.nemErtemElAt,
      letrehozva: munkaJelentkezes.letrehozva,
      hirdetes_cim: munkaHirdetes.cim,
      hirdetes_varos: munkaHirdetes.varos,
      hirdetes_munkakor: munkaHirdetes.munkakor,
      hirdetes_nem_ertem_el: munkaHirdetes.nem_ertem_el,
      projekt_id: munkaHirdetes.projekt_id,
      diak_iroda: diakRegisztracio.iroda,
      diak_iskola: diakRegisztracio.iskola,
    })
    .from(munkaJelentkezes)
    .innerJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
    .leftJoin(diakRegisztracio, eq(munkaJelentkezes.regisztracio_id, diakRegisztracio.id))
    .where(eq(munkaJelentkezes.id, id));
  return sor ?? null;
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('toborzas', 'olvasas');
    if (auth instanceof Response) return auth;

    try {
      try {
        await nemErtemElVisszaallitas();
      } catch (err) {
        console.error('nemErtemElVisszaallitas:', err);
      }

      const id = url.searchParams.get('id');
      if (id) {
        const sor = await jelentkezesSor(Number(id));
        if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });
        const tiltas = await assertProjektHozzaferes(auth, sor.projekt_id ?? null);
        if (tiltas) return tiltas;
        return Response.json({ sor, statuszok: STATUSZOK });
      }

      const hirdetesId = url.searchParams.get('hirdetes_id');
      const regisztracioId = url.searchParams.get('regisztracio_id');
      const statuszFilter = url.searchParams.get('statusz');
      const keres = url.searchParams.get('keres')?.trim();

      const feltetelek = [];
      if (hirdetesId) feltetelek.push(eq(munkaJelentkezes.hirdetes_id, Number(hirdetesId)));
      if (regisztracioId) feltetelek.push(eq(munkaJelentkezes.regisztracio_id, Number(regisztracioId)));
      if (statuszFilter) feltetelek.push(eq(munkaJelentkezes.statusz, statuszFilter));
      if (keres) {
        const minta = `%${keres}%`;
        feltetelek.push(
          or(
            ilike(munkaJelentkezes.nev, minta),
            ilike(munkaJelentkezes.email, minta),
            ilike(munkaHirdetes.cim, minta),
          )!,
        );
      }

      const lathato = await belsoLathatoProjektIds(auth);
      const scope = projektIdSzuro(lathato, munkaHirdetes.projekt_id);
      if (scope) feltetelek.push(scope);

      const sorok = await db
        .select({
          id: munkaJelentkezes.id,
          hirdetes_id: munkaJelentkezes.hirdetes_id,
          nev: munkaJelentkezes.nev,
          email: munkaJelentkezes.email,
          telefon: munkaJelentkezes.telefon,
          regisztracio_id: munkaJelentkezes.regisztracio_id,
          statusz: munkaJelentkezes.statusz,
          megjegyzes: munkaJelentkezes.megjegyzes,
          mas_hirdetes_id: munkaJelentkezes.masHirdetesId,
          nem_ertem_el_at: munkaJelentkezes.nemErtemElAt,
          letrehozva: munkaJelentkezes.letrehozva,
          hirdetes_cim: munkaHirdetes.cim,
          hirdetes_varos: munkaHirdetes.varos,
          hirdetes_munkakor: munkaHirdetes.munkakor,
          hirdetes_nem_ertem_el: munkaHirdetes.nem_ertem_el,
          projekt_id: munkaHirdetes.projekt_id,
          diak_iroda: diakRegisztracio.iroda,
          diak_iskola: diakRegisztracio.iskola,
        })
        .from(munkaJelentkezes)
        .innerJoin(munkaHirdetes, eq(munkaJelentkezes.hirdetes_id, munkaHirdetes.id))
        .leftJoin(diakRegisztracio, eq(munkaJelentkezes.regisztracio_id, diakRegisztracio.id))
        .where(feltetelek.length ? and(...feltetelek) : undefined)
        .orderBy(desc(munkaJelentkezes.letrehozva))
        .limit(200);
      return Response.json({ sorok, count: sorok.length, statuszok: STATUSZOK });
    } catch (err) {
      console.error('api-jelentkezes GET:', err);
      const reszlet = err instanceof Error ? err.message : String(err);
      return Response.json({ hiba: 'Jelentkezések betöltése sikertelen', reszlet }, { status: 500 });
    }
  }

  if (req.method === 'POST') {
    let body: {
      hirdetes_id: number;
      nev: string;
      email: string;
      telefon?: string;
      regisztracio_id?: number;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.hirdetes_id || !body.nev?.trim() || !body.email?.trim()) {
      return Response.json({ hiba: 'Hiányzó kötelező mezők' }, { status: 400 });
    }

    const [hirdetes] = await db
      .select()
      .from(munkaHirdetes)
      .where(eq(munkaHirdetes.id, body.hirdetes_id));
    if (!hirdetes) return Response.json({ hiba: 'Hirdetés nem található' }, { status: 404 });

    const email = body.email.trim().toLowerCase();
    let regId = body.regisztracio_id ?? null;

    if (!regId) {
      const [diak] = await db
        .select()
        .from(diakRegisztracio)
        .where(eq(diakRegisztracio.email, email));
      if (diak) regId = diak.id;
    }

    let kezdoStatusz = 'Kezeletlen';
    if (hirdetes.oneletrajz) {
      let vanCv = false;
      if (regId) {
        const [diak] = await db
          .select({ profil: diakRegisztracio.profil })
          .from(diakRegisztracio)
          .where(eq(diakRegisztracio.id, regId));
        const profil = normalizaltDiakProfil(diak?.profil);
        vanCv = !!(profil.oneletrajz?.blob_key || profil.oneletrajz?.fajlnev);
      }
      if (!vanCv) kezdoStatusz = 'Önéletrajzot várunk';
    }

    const [sor] = await db
      .insert(munkaJelentkezes)
      .values({
        hirdetes_id: body.hirdetes_id,
        nev: body.nev.trim(),
        email,
        telefon: body.telefon?.trim() || null,
        regisztracio_id: regId,
        statusz: kezdoStatusz,
      })
      .returning();

    return Response.json({ ok: true, sor }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('toborzas', 'iras');
    if (auth instanceof Response) return auth;

    let body: {
      id: number;
      statusz?: string;
      megjegyzes?: string | null;
      mas_hirdetes_id?: number | null;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.id) {
      return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });
    }

    const [regi] = await db
      .select({ statusz: munkaJelentkezes.statusz })
      .from(munkaJelentkezes)
      .where(eq(munkaJelentkezes.id, body.id));

    const patch: Partial<typeof munkaJelentkezes.$inferInsert> = {};
    if (body.statusz) {
      if (!STATUSZOK.includes(body.statusz as (typeof STATUSZOK)[number])) {
        return Response.json({ hiba: 'Érvénytelen státusz' }, { status: 400 });
      }
      patch.statusz = body.statusz;
      if (body.statusz === 'Nem elérhető') {
        patch.nemErtemElAt = new Date();
      } else {
        patch.nemErtemElAt = null;
      }
    }
    if (body.megjegyzes !== undefined) {
      patch.megjegyzes = body.megjegyzes?.trim() || null;
    }
    if (body.mas_hirdetes_id !== undefined) {
      patch.masHirdetesId = body.mas_hirdetes_id ? Number(body.mas_hirdetes_id) : null;
    }

    if (!Object.keys(patch).length) {
      return Response.json({ hiba: 'Nincs módosítandó mező' }, { status: 400 });
    }

    const [sor] = await db
      .update(munkaJelentkezes)
      .set(patch)
      .where(eq(munkaJelentkezes.id, body.id))
      .returning();

    if (!sor) return Response.json({ hiba: 'Nem található' }, { status: 404 });

    let alairasInditas: { inditva?: number[]; hiba?: string } | undefined;
    if (body.statusz === 'Felvéve' && regi?.statusz !== 'Felvéve') {
      try {
        alairasInditas = await inditsSzerzodesAlairasFelvetelUtan(sor.id);
      } catch (err) {
        console.error('szerzodes alairas inditas:', err);
        alairasInditas = { inditva: [], hiba: 'Aláírási folyamat indítása sikertelen' };
      }
    }

    const teljes = await jelentkezesSor(sor.id);
    return Response.json({ ok: true, sor: teljes ?? sor, alairas_inditas: alairasInditas });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/jelentkezes',
};
