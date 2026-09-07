import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import {
  partner,
  partnerKapcsolattarto,
  partnerKommunikacio,
  partnerSzerzodes,
} from '../../db/schema.js';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import {
  kapcsolattartoInsertFromBody,
  kapcsolattartoPatchFromBody,
  kapcsolattartoValasz,
  kommunikacioValasz,
  partnerPatchFromBody,
  partnerValasz,
  szerzodesValasz,
} from './lib/partner-map.js';
import { CRM_STATUSZOK } from '../../shared/src/partner.js';
import type { CrmStatusz } from '../../shared/src/enums.js';

function crmPatch(crmStatusz: string, currentKapcsolat: string) {
  if (crmStatusz === 'Megbízóvá alakítva') {
    return { crmStatusz, kapcsolatTipus: 'partner' };
  }
  return { crmStatusz, kapcsolatTipus: currentKapcsolat };
}

async function partnerReszlet(id: number) {
  const [row] = await db.select().from(partner).where(eq(partner.id, id));
  if (!row) return null;

  const kapcsolattartok = await db
    .select()
    .from(partnerKapcsolattarto)
    .where(eq(partnerKapcsolattarto.partnerId, id))
    .orderBy(partnerKapcsolattarto.id);

  const kommunikacio = await db
    .select()
    .from(partnerKommunikacio)
    .where(eq(partnerKommunikacio.partnerId, id))
    .orderBy(desc(partnerKommunikacio.datum), desc(partnerKommunikacio.id));

  const szerzodesek = await db
    .select()
    .from(partnerSzerzodes)
    .where(eq(partnerSzerzodes.partnerId, id))
    .orderBy(desc(partnerSzerzodes.ervKezdete));

  return partnerValasz(row, { kapcsolattartok, kommunikacio, szerzodesek });
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('partnerek', 'olvasas');
    if (auth instanceof Response) return auth;

    const id = url.searchParams.get('id');
    if (id) {
      const reszlet = await partnerReszlet(Number(id));
      if (!reszlet) return Response.json({ hiba: 'Partner nem található' }, { status: 404 });
      return Response.json({ partner: reszlet });
    }

    const nezet = url.searchParams.get('nezet') ?? 'partnerek';

    if (nezet === 'szerzodesek') {
      const statusz = url.searchParams.get('statusz')?.trim() ?? '';
      const partnerIdParam = url.searchParams.get('partner_id')?.trim() ?? '';
      const feltetelek = [];
      if (statusz && statusz !== 'mind') {
        feltetelek.push(eq(partnerSzerzodes.statusz, statusz));
      }
      if (partnerIdParam) {
        const pid = Number(partnerIdParam);
        if (pid > 0) feltetelek.push(eq(partnerSzerzodes.partnerId, pid));
      }
      const sorok = await db
        .select({
          szerzodes: partnerSzerzodes,
          partnerNev: partner.nev,
        })
        .from(partnerSzerzodes)
        .innerJoin(partner, eq(partnerSzerzodes.partnerId, partner.id))
        .where(feltetelek.length ? and(...feltetelek) : undefined)
        .orderBy(desc(partnerSzerzodes.ervKezdete))
        .limit(300);

      return Response.json({
        sorok: sorok.map((s) => szerzodesValasz(s.szerzodes, s.partnerNev)),
        count: sorok.length,
      });
    }

    if (nezet === 'crm') {
      const keres = url.searchParams.get('keres')?.trim() ?? '';
      const felelos = url.searchParams.get('felelos')?.trim() ?? '';
      const feltetelek = [eq(partner.kapcsolatTipus, 'lead')];
      if (felelos && felelos !== 'mind') {
        feltetelek.push(eq(partner.felelos, felelos));
      }
      if (keres) {
        feltetelek.push(ilike(partner.nev, `%${keres}%`));
      }

      const sorok = await db
        .select()
        .from(partner)
        .where(and(...feltetelek))
        .orderBy(desc(partner.letrehozva))
        .limit(200);

      const enriched = await Promise.all(
        sorok.map(async (row) => {
          const [utolso] = await db
            .select()
            .from(partnerKommunikacio)
            .where(eq(partnerKommunikacio.partnerId, row.id))
            .orderBy(desc(partnerKommunikacio.datum), desc(partnerKommunikacio.id))
            .limit(1);
          return partnerValasz(row, { utolsoKommunikacio: utolso ?? null });
        }),
      );

      return Response.json({
        sorok: enriched,
        count: enriched.length,
        crm_statuszok: CRM_STATUSZOK,
      });
    }

    const keres = url.searchParams.get('keres')?.trim() ?? '';
    const statusz = url.searchParams.get('statusz')?.trim() ?? '';
    const iroda = url.searchParams.get('iroda')?.trim() ?? '';

    const feltetelek = [eq(partner.kapcsolatTipus, 'partner')];
    if (statusz && statusz !== 'mind') {
      feltetelek.push(eq(partner.statusz, statusz));
    }
    if (iroda && iroda !== 'mind') {
      feltetelek.push(eq(partner.iroda, iroda));
    }
    if (keres) {
      const minta = `%${keres}%`;
      feltetelek.push(
        or(ilike(partner.nev, minta), ilike(partner.adoszam, minta))!,
      );
    }

    const sorok = await db
      .select()
      .from(partner)
      .where(and(...feltetelek))
      .orderBy(partner.nev)
      .limit(300);

    const kapcsolattartok = await db.select().from(partnerKapcsolattarto);
    const ktMap = new Map<number, typeof kapcsolattartok>();
    for (const kt of kapcsolattartok) {
      const list = ktMap.get(kt.partnerId) ?? [];
      list.push(kt);
      ktMap.set(kt.partnerId, list);
    }

    const [osszes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(partner)
      .where(eq(partner.kapcsolatTipus, 'partner'));

    return Response.json({
      sorok: sorok.map((row) =>
        partnerValasz(row, { kapcsolattartok: ktMap.get(row.id) ?? [] }),
      ),
      count: sorok.length,
      osszes: osszes?.count ?? sorok.length,
    });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('partnerek', 'iras');
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const muvelet = typeof body.muvelet === 'string' ? body.muvelet : 'uj_partner';

    if (muvelet === 'kapcsolattarto') {
      const values = kapcsolattartoInsertFromBody(body);
      if (!values) {
        return Response.json({ hiba: 'Név és partner azonosító kötelező' }, { status: 400 });
      }
      const [uj] = await db.insert(partnerKapcsolattarto).values(values).returning();
      return Response.json(
        { ok: true, kapcsolattarto: kapcsolattartoValasz(uj) },
        { status: 201 },
      );
    }

    if (muvelet === 'kommunikacio') {
      const partnerId = Number(body.partner_id);
      const targy = typeof body.targy === 'string' ? body.targy.trim() : '';
      const tipus = typeof body.tipus === 'string' ? body.tipus : 'megbeszélés';
      if (!partnerId || !targy) {
        return Response.json({ hiba: 'Partner és tárgy kötelező' }, { status: 400 });
      }
      const statusz =
        tipus === 'reklamáció' || tipus === 'ticket'
          ? typeof body.statusz === 'string'
            ? body.statusz
            : 'nyitva'
          : null;
      const [uj] = await db
        .insert(partnerKommunikacio)
        .values({
          partnerId,
          tipus,
          datum: new Date().toISOString().slice(0, 10),
          szerzo: auth.email,
          targy,
          leiras: typeof body.leiras === 'string' ? body.leiras.trim() || null : null,
          statusz,
        })
        .returning();
      return Response.json(
        { ok: true, kommunikacio: kommunikacioValasz(uj) },
        { status: 201 },
      );
    }

    if (muvelet === 'szerzodes') {
      const partnerId = Number(body.partner_id);
      const tipus = typeof body.tipus === 'string' ? body.tipus : 'Keretszerződés';
      const kezdete = typeof body.erv_kezdete === 'string' ? body.erv_kezdete : '';
      if (!partnerId || !kezdete) {
        return Response.json({ hiba: 'Partner és kezdete kötelező' }, { status: 400 });
      }
      const [uj] = await db
        .insert(partnerSzerzodes)
        .values({
          partnerId,
          tipus,
          statusz: 'piszkozat',
          ervKezdete: kezdete,
          ervVege: typeof body.erv_vege === 'string' && body.erv_vege ? body.erv_vege : null,
        })
        .returning();
      return Response.json({ ok: true, szerzodes: szerzodesValasz(uj) }, { status: 201 });
    }

    const nev = typeof body.nev === 'string' ? body.nev.trim() : '';
    const adoszam = typeof body.adoszam === 'string' ? body.adoszam.trim() : '';
    const iroda = typeof body.iroda === 'string' ? body.iroda.trim() : '';
    if (!nev || !adoszam || !iroda) {
      return Response.json({ hiba: 'Cégnév, adószám és iroda kötelező' }, { status: 400 });
    }

    const kapcsolatTipus =
      typeof body.kapcsolat_tipus === 'string' ? body.kapcsolat_tipus : 'lead';
    const crmStatusz =
      kapcsolatTipus === 'partner' ? 'Megbízóvá alakítva' : 'Új lead';

    const [uj] = await db
      .insert(partner)
      .values({
        nev,
        adoszam,
        cim: typeof body.cim === 'string' ? body.cim.trim() || null : null,
        iroda,
        statusz: 'aktív',
        kapcsolatTipus,
        crmStatusz,
        felelos:
          typeof body.felelos === 'string'
            ? body.felelos.trim() || null
            : PARTNER_FELELOS_DEFAULT,
      })
      .returning();

    const ktNev = typeof body.kt_nev === 'string' ? body.kt_nev.trim() : '';
    if (ktNev) {
      await db.insert(partnerKapcsolattarto).values({
        partnerId: uj.id,
        nev: ktNev,
        email: typeof body.kt_email === 'string' ? body.kt_email.trim() || null : null,
        mobil: typeof body.kt_mobil === 'string' ? body.kt_mobil.trim() || null : null,
        szamlazasi: true,
        hozzaferes:
          typeof body.kt_hozzaferes === 'string' ? body.kt_hozzaferes : 'nincs',
      });
    }

    const reszlet = await partnerReszlet(uj.id);
    return Response.json({ ok: true, partner: reszlet }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('partnerek', 'iras');
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (body.muvelet === 'szerzodes_dokumentum') {
      const szerzodesId = Number(body.szerzodes_id);
      const dokumentumNev =
        typeof body.dokumentum_nev === 'string' ? body.dokumentum_nev.trim() : '';
      if (!szerzodesId || !dokumentumNev) {
        return Response.json({ hiba: 'Szerződés és fájlnév kötelező' }, { status: 400 });
      }
      const [friss] = await db
        .update(partnerSzerzodes)
        .set({ dokumentumNev })
        .where(eq(partnerSzerzodes.id, szerzodesId))
        .returning();
      if (!friss) {
        return Response.json({ hiba: 'Szerződés nem található' }, { status: 404 });
      }
      return Response.json({ ok: true, szerzodes: szerzodesValasz(friss) });
    }

    if (body.muvelet === 'kapcsolattarto_frissites') {
      const id = Number(body.id);
      const patch = kapcsolattartoPatchFromBody(body);
      if (!id || !patch) {
        return Response.json({ hiba: 'Hiányzó azonosító vagy módosítandó mező' }, { status: 400 });
      }
      const [friss] = await db
        .update(partnerKapcsolattarto)
        .set(patch)
        .where(eq(partnerKapcsolattarto.id, id))
        .returning();
      if (!friss) {
        return Response.json({ hiba: 'Kapcsolattartó nem található' }, { status: 404 });
      }
      return Response.json({ ok: true, kapcsolattarto: kapcsolattartoValasz(friss) });
    }

    const id = Number(body.id);
    if (!id) return Response.json({ hiba: 'Hiányzó partner azonosító' }, { status: 400 });

    const [meglevo] = await db.select().from(partner).where(eq(partner.id, id));
    if (!meglevo) return Response.json({ hiba: 'Partner nem található' }, { status: 404 });

    const patch = partnerPatchFromBody(body);

    if (typeof body.crm_statusz === 'string') {
      const crm = crmPatch(body.crm_statusz, meglevo.kapcsolatTipus);
      patch.crmStatusz = crm.crmStatusz as CrmStatusz;
      patch.kapcsolatTipus = crm.kapcsolatTipus;
    }

    if (body.megbizova === true) {
      patch.crmStatusz = 'Megbízóvá alakítva';
      patch.kapcsolatTipus = 'partner';
    }

    if (!Object.keys(patch).length) {
      return Response.json({ hiba: 'Nincs módosítandó mező' }, { status: 400 });
    }

    await db.update(partner).set(patch).where(eq(partner.id, id));
    const reszlet = await partnerReszlet(id);
    return Response.json({ ok: true, partner: reszlet });
  }

  if (req.method === 'DELETE') {
    const auth = await requireBelso('partnerek', 'iras');
    if (auth instanceof Response) return auth;

    const kapcsolattartoId = url.searchParams.get('kapcsolattarto_id');
    if (kapcsolattartoId) {
      await db
        .update(partnerKapcsolattarto)
        .set({ aktiv: false })
        .where(eq(partnerKapcsolattarto.id, Number(kapcsolattartoId)));
      return Response.json({ ok: true });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  return new Response('Method not allowed', { status: 405 });
};

const PARTNER_FELELOS_DEFAULT = 'Kiss Andrea';

export const config: Config = {
  path: '/api/partnerek',
};
