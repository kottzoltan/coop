import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { db } from '../../db/index.js';
import { jelenletOcrFeltoltes } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireBelso, requireDiak } from './lib/auth.js';
import { jelenletRogzites } from './lib/jelenlet-service.js';

const STORE = 'ice-jelenlet-ocr';

/** Mock OCR — később valódi szolgáltatás (Google Vision / Azure). */
function mockOcrKinyeres() {
  return {
    sorok: [
      { datum: new Date().toISOString().slice(0, 10), erkezes: '08:00', tavozas: '16:00', megjegyzes: 'OCR demo' },
    ],
    biztonsag: 0.72,
  };
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'POST') {
    const diakAuth = await requireDiak();
    if (diakAuth instanceof Response) {
      return Response.json({ hiba: 'Csak diák tölthet fel papír jelenléti ívet.' }, { status: 401 });
    }

    let body: { projekt_id?: number; kep_base64?: string; fajl_nev?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    if (!body.kep_base64) {
      return Response.json({ hiba: 'kep_base64 kötelező' }, { status: 400 });
    }

    const blobKey = `ocr/${diakAuth.diakId}/${Date.now()}-${randomBytes(4).toString('hex')}.jpg`;
    const store = getStore({ name: STORE, consistency: 'strong' });
    const buffer = Buffer.from(body.kep_base64, 'base64');
    await store.set(blobKey, buffer, {
      metadata: { contentType: 'image/jpeg', diakId: String(diakAuth.diakId) },
    });

    const ocr = mockOcrKinyeres();
    const [feltoltes] = await db
      .insert(jelenletOcrFeltoltes)
      .values({
        diakId: diakAuth.diakId!,
        projektId: body.projekt_id ?? null,
        blobKey,
        statusz: 'feldolgozva',
        kinyertJson: ocr,
        biztonsag: String(ocr.biztonsag),
      })
      .returning();

    return Response.json({ ok: true, feltoltes, ocr }, { status: 201 });
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('beosztas', 'iras');
    if (auth instanceof Response) return auth;

    let body: {
      feltoltes_id: number;
      muvelet: 'jelenlet_letrehozas';
      projekt_id?: number;
      partner_id?: number;
      muszak_datum?: string;
      sor_index?: number;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const [feltoltes] = await db
      .select()
      .from(jelenletOcrFeltoltes)
      .where(eq(jelenletOcrFeltoltes.id, body.feltoltes_id));

    if (!feltoltes) return Response.json({ hiba: 'Feltöltés nem található' }, { status: 404 });

    const kinyert = feltoltes.kinyertJson as {
      sorok?: Array<{ datum?: string; erkezes?: string; tavozas?: string; megjegyzes?: string }>;
    } | null;
    const sor = kinyert?.sorok?.[body.sor_index ?? 0];
    if (!sor) return Response.json({ hiba: 'Nincs kinyert sor' }, { status: 400 });

    const datum = body.muszak_datum ?? sor.datum ?? new Date().toISOString().slice(0, 10);
    const erkezes = sor.erkezes ? new Date(`${datum}T${sor.erkezes}:00`) : null;
    const tavozas = sor.tavozas ? new Date(`${datum}T${sor.tavozas}:00`) : null;

    const jelenletSor = await jelenletRogzites({
      diakId: feltoltes.diakId,
      projektId: body.projekt_id ?? feltoltes.projektId,
      muszakDatum: datum,
      partnerId: body.partner_id ?? null,
      erkezes,
      tavozas,
      megjegyzes: sor.megjegyzes ?? 'Papír jelenléti ív (OCR)',
      forras: 'ocr',
      rogzitesMod: 'papir',
      identityId: auth.identityId,
    });

    await db
      .update(jelenletOcrFeltoltes)
      .set({ jelenletId: jelenletSor.id, pvMegerositette: true, statusz: 'jovahagyva' })
      .where(eq(jelenletOcrFeltoltes.id, feltoltes.id));

    return Response.json({ ok: true, jelenlet: jelenletSor });
  }

  if (req.method === 'GET' && url.searchParams.get('belso') === '1') {
    const auth = await requireBelso('beosztas', 'olvasas');
    if (auth instanceof Response) return auth;

    const sorok = await db
      .select()
      .from(jelenletOcrFeltoltes)
      .where(eq(jelenletOcrFeltoltes.pvMegerositette, false))
      .limit(100);

    return Response.json({ sorok });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/jelenlet-ocr',
};
