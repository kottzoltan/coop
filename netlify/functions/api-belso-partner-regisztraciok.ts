import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { db } from '../../db/index.js';
import {
  partnerRegisztracio,
  iceFelhasznalo,
  partner,
  beosztasCsoport,
} from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireBelso } from './lib/auth.js';

type Hozzaferes = 'nincs' | 'olvasas' | 'iras';

interface PartnerRegisztracioPatchBody {
  id: number;
  statusz?: 'jóváhagyva' | 'elutasitva';
  hozzaferes?: Hozzaferes;
  portal_aktiv?: boolean;
}

function sorValasz(
  reg: typeof partnerRegisztracio.$inferSelect,
  ice: typeof iceFelhasznalo.$inferSelect | null,
) {
  const hozzaferes = (reg.hozzaferes ?? 'iras') as Hozzaferes;
  const portalAktiv =
    reg.statusz === 'jóváhagyva' && hozzaferes !== 'nincs' && (ice?.aktiv ?? false);

  return {
    id: reg.id,
    cegnev: reg.cegnev,
    adoszam: reg.adoszam,
    kapcsolat_nev: reg.kapcsolatNev,
    email: reg.email,
    telefon: reg.telefon,
    statusz: reg.statusz,
    hozzaferes,
    portal_aktiv: portalAktiv,
    ice_aktiv: ice?.aktiv ?? null,
    identity_id: ice?.identityId ?? null,
    letrehozva: reg.letrehozva?.toISOString() ?? null,
    partner_crm_id: reg.partnerCrmId,
  };
}

async function syncIceAktiv(partnerRegId: number, aktiv: boolean) {
  await db
    .update(iceFelhasznalo)
    .set({ aktiv })
    .where(eq(iceFelhasznalo.partnerKapcsolatId, partnerRegId));
}

export default async (req: Request) => {
  const identityUser = await getUser();
  if (!identityUser) {
    return Response.json({ hiba: 'Unauthorized' }, { status: 401 });
  }

  const auth = await requireBelso('partnerek', req.method === 'GET' ? 'olvasas' : 'iras');
  if (auth instanceof Response) return auth;

  const identityId = identityUser.id;
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const statuszSzuro = url.searchParams.get('statusz') ?? 'mind';

    const rows = await db
      .select({
        reg: partnerRegisztracio,
        ice: iceFelhasznalo,
      })
      .from(partnerRegisztracio)
      .leftJoin(iceFelhasznalo, eq(iceFelhasznalo.partnerKapcsolatId, partnerRegisztracio.id))
      .where(
        statuszSzuro !== 'mind' ? eq(partnerRegisztracio.statusz, statuszSzuro) : undefined,
      )
      .orderBy(desc(partnerRegisztracio.letrehozva));

    const sorok = rows.map(({ reg, ice }) => sorValasz(reg, ice));
    return Response.json({ sorok, count: sorok.length }, { status: 200 });
  }

  if (req.method === 'PATCH') {
    let body: PartnerRegisztracioPatchBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body?.id) {
      return Response.json({ hiba: 'Hiányzó id' }, { status: 400 });
    }

    const [meglevo] = await db
      .select()
      .from(partnerRegisztracio)
      .where(eq(partnerRegisztracio.id, body.id));

    if (!meglevo) {
      return Response.json({ hiba: 'Nem található' }, { status: 404 });
    }

    const patch: Partial<typeof partnerRegisztracio.$inferInsert> = {};

    if (body.statusz) {
      patch.statusz = body.statusz;
      patch.jovahagytaId = identityId;
      if (body.statusz === 'jóváhagyva' && !body.hozzaferes) {
        patch.hozzaferes =
          meglevo.hozzaferes === 'nincs' ? 'iras' : (meglevo.hozzaferes ?? 'iras');
      }
    }

    if (body.hozzaferes) {
      patch.hozzaferes = body.hozzaferes;
    }

    const [regSor] = await db
      .update(partnerRegisztracio)
      .set(patch)
      .where(eq(partnerRegisztracio.id, body.id))
      .returning();

    if (!regSor) {
      return Response.json({ hiba: 'Mentés sikertelen' }, { status: 500 });
    }

    if (body.statusz === 'jóváhagyva') {
      const hozzaferes = (regSor.hozzaferes ?? 'iras') as Hozzaferes;
      await syncIceAktiv(body.id, hozzaferes !== 'nincs');

      if (!regSor.partnerCrmId) {
        const [crm] = await db
          .insert(partner)
          .values({
            nev: regSor.cegnev,
            adoszam: regSor.adoszam,
            statusz: 'aktív',
            iroda: 'Budapest',
            kapcsolatTipus: 'ugyfel',
            crmStatusz: 'Megbízó',
          })
          .returning();

        await db
          .update(partnerRegisztracio)
          .set({ partnerCrmId: crm.id })
          .where(eq(partnerRegisztracio.id, body.id));

        await db.insert(beosztasCsoport).values({
          nev: `${regSor.cegnev} — beosztás`,
          partnerId: crm.id,
          statusz: 'aktív',
          leiras: 'Automatikus csoport partner jóváhagyáskor',
        });
      }
    }

    if (body.statusz === 'elutasitva') {
      await syncIceAktiv(body.id, false);
    }

    if (body.hozzaferes) {
      const aktiv = regSor.statusz === 'jóváhagyva' && body.hozzaferes !== 'nincs';
      await syncIceAktiv(body.id, aktiv);
    }

    if (typeof body.portal_aktiv === 'boolean') {
      if (regSor.statusz !== 'jóváhagyva') {
        return Response.json(
          { hiba: 'Csak jóváhagyott partnernél állítható a portál hozzáférés.' },
          { status: 400 },
        );
      }
      if (body.portal_aktiv && regSor.hozzaferes === 'nincs') {
        return Response.json(
          { hiba: 'Előbb állíts be olvasási vagy írási jogot.' },
          { status: 400 },
        );
      }
      await syncIceAktiv(body.id, body.portal_aktiv);
    }

    const [ice] = await db
      .select()
      .from(iceFelhasznalo)
      .where(eq(iceFelhasznalo.partnerKapcsolatId, body.id));

    const [frissReg] = await db
      .select()
      .from(partnerRegisztracio)
      .where(eq(partnerRegisztracio.id, body.id));

    return Response.json({
      ok: true,
      sor: frissReg ? sorValasz(frissReg, ice ?? null) : null,
    });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/belso-partner-regisztraciok',
};
