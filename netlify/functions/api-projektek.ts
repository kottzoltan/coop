import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { projekt, projektBerKod, projektSzereplo, munkaHirdetes, partner } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';
import {
  assertProjektHozzaferes,
  belsoLathatoProjektIds,
} from './lib/projekt-scope.js';
import {
  mentProjektMetaHaLehet,
  selectProjektById,
  selectProjektekListahoz,
  type ProjektSor,
} from './lib/projekt-db.js';
import {
  mergeProjektMeta,
  saveProjektMeta,
  seedProjektMetaIfEmpty,
} from './lib/projekt-meta.js';
import {
  szamitFedezet,
  type ProjektMetaPayload,
} from '../../shared/src/projekt-demo-meta.js';

async function resolvePartnerFields(body: {
  partner_id?: number | null;
  partner_nev?: string | null;
}): Promise<{ partnerId: number | null; partnerNev: string | null }> {
  if (body.partner_id != null && body.partner_id > 0) {
    const [row] = await db
      .select({ id: partner.id, nev: partner.nev })
      .from(partner)
      .where(eq(partner.id, body.partner_id))
      .limit(1);
    if (!row) throw new Error('Partner nem található');
    return { partnerId: row.id, partnerNev: row.nev };
  }
  return { partnerId: null, partnerNev: body.partner_nev ?? null };
}

async function projektReszlet(sor: ProjektSor) {
  seedProjektMetaIfEmpty(sor);
  const meta = mergeProjektMeta(sor);
  const fedezet = szamitFedezet(meta);

  const berKodok = await db
    .select()
    .from(projektBerKod)
    .where(eq(projektBerKod.projekt_id, sor.id));
  const szereplok = await db
    .select()
    .from(projektSzereplo)
    .where(eq(projektSzereplo.projekt_id, sor.id));

  const hirdetesek = await db
    .select({
      id: munkaHirdetes.id,
      cim: munkaHirdetes.cim,
      aktiv: munkaHirdetes.aktiv,
      varos: munkaHirdetes.varos,
      letrehozva: munkaHirdetes.letrehozva,
      jelentkezok: sql<number>`(
        SELECT count(*)::int FROM munka_jelentkezes j WHERE j.hirdetes_id = ${munkaHirdetes.id}
      )`,
    })
    .from(munkaHirdetes)
    .where(eq(munkaHirdetes.projekt_id, sor.id));

  return {
    sor: { ...sor, meta },
    meta,
    fedezet,
    berKodok,
    szereplok,
    hirdetesek,
  };
}

async function genProjektAzonosito() {
  // Mock/spec kompatibilis azonosító: `B` + 7 számjegy (pl. B0359192)
  while (true) {
    const num = Math.floor(1_000_000 + Math.random() * 9_000_000);
    const cand = `B${String(num)}`;
    const exists = await db.select({ id: projekt.id }).from(projekt).where(eq(projekt.azonosito, cand)).limit(1);
    if (!exists.length) return cand;
  }
}

export default async (req: Request) => {
  if (req.method === 'POST') {
    const auth = await requireBelso('projektek', 'iras');
    if (auth instanceof Response) return auth;

    try {
      const body = (await req.json()) as {
        // Régi ág: szereplő lista hozzáadása
        projekt_id?: number;
        szereplok?: Array<{
          nev: string;
          szerepkor?: string;
          email?: string;
          erv_kezdete?: string;
          erv_vege?: string;
          tipus?: string;
          osszeg?: number;
          min_osszeg?: number;
          reszesedes?: number;
        }>;

        // Új ág: projekt létrehozás
        muvelet?: string;
        nev?: string;
        partner_id?: number | null;
        partner_nev?: string | null;
        iroda?: string | null;
        statusz?: string;
        prioritas?: string | null;
        belso_munka?: boolean;
        meta?: ProjektMetaPayload;
      };

      const muvelet = typeof body.muvelet === 'string' ? body.muvelet : '';

      // --- Új projekt létrehozása ---
      if (muvelet === 'uj_projekt') {
        const nev = typeof body.nev === 'string' ? body.nev.trim() : '';
        const partnerFields = await resolvePartnerFields({
          partner_id: body.partner_id,
          partner_nev: body.partner_nev,
        });
        const iroda = body.iroda ?? null;
        const statusz = typeof body.statusz === 'string' ? body.statusz : 'aktív';
        const prioritas = body.prioritas ?? 'Elsődleges';
        const belsoMunka = Boolean(body.belso_munka);
        const meta = body.meta ?? {};

        if (!nev) {
          return Response.json({ hiba: 'Projekt megnevezés (nev) kötelező' }, { status: 400 });
        }
        if (!body.partner_id || body.partner_id <= 0) {
          return Response.json({ hiba: 'Partner kiválasztása kötelező' }, { status: 400 });
        }

        const azonosito = await genProjektAzonosito();
        const [uj] = await db
          .insert(projekt)
          .values({
            azonosito,
            nev,
            partner_nev: partnerFields.partnerNev,
            partnerId: partnerFields.partnerId,
            iroda,
            statusz,
            prioritas,
            belsoMunka: belsoMunka,
            meta,
          })
          .returning();

        const friss = await selectProjektById(uj.id);
        if (!friss) return Response.json({ hiba: 'Projekt nem található' }, { status: 500 });
        return Response.json(await projektReszlet(friss), { status: 201 });
      }

      // --- Régi ág: szereplő lista hozzáadása ---
      const projektId = Number(body.projekt_id);
      const lista = body.szereplok ?? [];
      if (!projektId || lista.length === 0) {
        return Response.json({ hiba: 'Hiányzó projekt_id vagy szereplő lista' }, { status: 400 });
      }

      const sor = await selectProjektById(projektId);
      if (!sor) return Response.json({ hiba: 'Projekt nem található' }, { status: 404 });

      const ervenyes = lista.filter((s) => s.nev?.trim());
      if (!ervenyes.length) {
        return Response.json({ hiba: 'Adj meg legalább egy szereplő nevet' }, { status: 400 });
      }

      await db.insert(projektSzereplo).values(
        ervenyes.map((s) => ({
          projekt_id: projektId,
          nev: s.nev.trim(),
          szerepkor: s.szerepkor ?? null,
          email: s.email ?? null,
          erv_kezdete: s.erv_kezdete ?? null,
          erv_vege: s.erv_vege ?? null,
          tipus: s.tipus ?? 'Fedezet arányos',
          osszeg: s.osszeg ?? 0,
          min_osszeg: s.min_osszeg ?? 0,
          reszesedes: s.reszesedes ?? 0,
        })),
      );

      const friss = await selectProjektById(projektId);
      if (!friss) return Response.json({ hiba: 'Projekt nem található' }, { status: 404 });
      return Response.json(await projektReszlet(friss));
    } catch (err) {
      console.error('api-projektek POST hiba:', err);
      const msg = err instanceof Error ? err.message : 'Szereplő mentés / projekt létrehozás sikertelen';
      return Response.json({ hiba: msg }, { status: 500 });
    }
  }

  if (req.method === 'DELETE') {
    const auth = await requireBelso('projektek', 'iras');
    if (auth instanceof Response) return auth;

    try {
      const url = new URL(req.url);
      const szereploId = Number(url.searchParams.get('szereplo_id'));
      if (!szereploId) {
        return Response.json({ hiba: 'Hiányzó szereplo_id' }, { status: 400 });
      }

      const [sz] = await db
        .select()
        .from(projektSzereplo)
        .where(eq(projektSzereplo.id, szereploId));
      if (!sz) return Response.json({ hiba: 'Szereplő nem található' }, { status: 404 });

      await db.delete(projektSzereplo).where(eq(projektSzereplo.id, szereploId));

      const friss = await selectProjektById(sz.projekt_id);
      if (!friss) return Response.json({ hiba: 'Projekt nem található' }, { status: 404 });
      return Response.json(await projektReszlet(friss));
    } catch (err) {
      console.error('api-projektek DELETE hiba:', err);
      return Response.json({ hiba: 'Törlés sikertelen' }, { status: 500 });
    }
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('projektek', 'iras');
    if (auth instanceof Response) return auth;

    try {
      const body = (await req.json()) as {
        id?: number;
        meta?: ProjektMetaPayload;
        sor?: {
          nev?: string;
          partner_id?: number | null;
          partner_nev?: string | null;
          iroda?: string;
          statusz?: string;
          prioritas?: string;
          belso_munka?: boolean;
        };
      };
      const id = Number(body.id);
      if (!id || (!body.meta && !body.sor)) {
        return Response.json({ hiba: 'Hiányzó id vagy mentendő adat' }, { status: 400 });
      }

      const sor = await selectProjektById(id);
      if (!sor) return Response.json({ hiba: 'Projekt nem található' }, { status: 404 });

      if (body.meta) {
        try {
          await saveProjektMeta(id, body.meta);
        } catch {
          await mentProjektMetaHaLehet(id, body.meta);
        }
      }

      if (body.sor) {
        const patch: Record<string, unknown> = {};
        if (body.sor.nev !== undefined) patch.nev = body.sor.nev;
        if (body.sor.partner_id !== undefined) {
          if (!body.sor.partner_id || body.sor.partner_id <= 0) {
            return Response.json({ hiba: 'Partner kiválasztása kötelező' }, { status: 400 });
          }
          const partnerFields = await resolvePartnerFields({ partner_id: body.sor.partner_id });
          patch.partnerId = partnerFields.partnerId;
          patch.partner_nev = partnerFields.partnerNev;
        } else if (body.sor.partner_nev !== undefined) {
          return Response.json(
            { hiba: 'Partner kiválasztása kötelező — válassz CRM partnert' },
            { status: 400 },
          );
        }
        if (body.sor.iroda !== undefined) patch.iroda = body.sor.iroda;
        if (body.sor.statusz !== undefined) patch.statusz = body.sor.statusz;
        if (body.sor.prioritas !== undefined) patch.prioritas = body.sor.prioritas;
        if (body.sor.belso_munka !== undefined) patch.belsoMunka = body.sor.belso_munka;
        const celPartnerId =
          patch.partnerId !== undefined ? (patch.partnerId as number | null) : sor.partnerId;
        if (Object.keys(patch).length && (!celPartnerId || celPartnerId <= 0)) {
          return Response.json({ hiba: 'Partner kiválasztása kötelező' }, { status: 400 });
        }
        if (Object.keys(patch).length) {
          try {
            await db.update(projekt).set(patch).where(eq(projekt.id, id));
          } catch (err) {
            const legacyPatch: Record<string, unknown> = {};
            if (body.sor.nev !== undefined) legacyPatch.nev = body.sor.nev;
            if (body.sor.partner_nev !== undefined) legacyPatch.partner_nev = body.sor.partner_nev;
            if (body.sor.iroda !== undefined) legacyPatch.iroda = body.sor.iroda;
            if (body.sor.statusz !== undefined) legacyPatch.statusz = body.sor.statusz;
            if (Object.keys(legacyPatch).length) {
              await db.update(projekt).set(legacyPatch).where(eq(projekt.id, id));
            } else {
              throw err;
            }
          }
        }
      }

      const friss = await selectProjektById(id);
      if (!friss) return Response.json({ hiba: 'Projekt nem található' }, { status: 404 });
      return Response.json(await projektReszlet(friss));
    } catch (err) {
      console.error('api-projektek PATCH hiba:', err);
      const msg = err instanceof Error ? err.message : 'Mentés sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = await requireBelso('projektek', 'olvasas');
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    const lathato = await belsoLathatoProjektIds(auth);

    if (id) {
      const sor = await selectProjektById(Number(id));
      if (!sor) return Response.json({ hiba: 'Projekt nem található' }, { status: 404 });
      const tiltas = await assertProjektHozzaferes(auth, sor.id);
      if (tiltas) return tiltas;
      return Response.json(await projektReszlet(sor));
    }

    const sorok = await selectProjektekListahoz();
    const szurt = lathato === null ? sorok : sorok.filter((r) => lathato.includes(r.projekt.id));

    const enriched = szurt.map((r) => {
      seedProjektMetaIfEmpty(r.projekt);
      const meta = mergeProjektMeta(r.projekt);
      const fedezet = szamitFedezet(meta);
      return {
        ...r.projekt,
        meta,
        fedezet,
        hirdetes_szam: r.hirdetes_szam,
        aktiv_hirdetes: r.aktiv_hirdetes,
        jelentkezok: r.jelentkezok,
      };
    });

    return Response.json({
      sorok: enriched,
      count: enriched.length,
    });
  } catch (err) {
    console.error('api-projektek hiba:', err);
    const reszlet = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        hiba: 'Projektek betöltése sikertelen.',
        reszlet,
      },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: '/api/projektek',
};
