import type { Config } from '@netlify/functions';
import { requireBelso } from './lib/auth.js';
import {
  downloadBevallasExport,
  exportNav08Declaration,
  generateNav08Declaration,
  getBevallasDetail,
  listBevallasok,
  startNav08Correction,
} from './lib/ber/nav/nav-08-generator.js';
import { exportM30Declaration, generateM30 } from './lib/ber/nav/m30-generator.js';
import {
  exportNav08eDeclaration,
  generateEmploymentRegistrationExport,
} from './lib/ber/nav/nav-08e-generator.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('berszamfejtes', 'olvasas');
    if (auth instanceof Response) return auth;

    const exportId = url.searchParams.get('export_id');
    const id = url.searchParams.get('id');

    if (id && exportId) {
      const file = await downloadBevallasExport(Number(id), Number(exportId));
      if (!file) return Response.json({ hiba: 'Export nem található.' }, { status: 404 });
      return new Response(file.body, {
        headers: {
          'Content-Type': file.mime,
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
        },
      });
    }

    if (id) {
      const detail = await getBevallasDetail(Number(id));
      if (!detail) return Response.json({ hiba: 'Bevallás nem található.' }, { status: 404 });
      return Response.json(detail);
    }

    const period = url.searchParams.get('period') ?? undefined;
    const type = url.searchParams.get('type') ?? 'NAV_08';
    const taxYear = url.searchParams.get('tax_year');
    const sorok = await listBevallasok(
      period,
      type,
      taxYear ? Number(taxYear) : undefined,
    );
    return Response.json({ sorok, count: sorok.length });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('berszamfejtes', 'iras');
    if (auth instanceof Response) return auth;

    const body = (await req.json().catch(() => ({}))) as {
      type?: string;
      period?: string;
      tax_year?: number;
      payroll_run_ids?: number[];
      korrekcio_szulo_id?: number;
      tag_id?: number;
      jogviszony_id?: number;
    };

    const type = body.type ?? 'NAV_08';

    try {
      if (type === 'M30') {
        if (!body.tax_year) {
          return Response.json({ hiba: 'tax_year kötelező M30-hoz.' }, { status: 400 });
        }
        const result = await generateM30({
          taxYear: body.tax_year,
          tagId: body.tag_id,
          generatedBy: auth.email,
        });
        const detail = await getBevallasDetail(result.bevallasId);
        return Response.json({ ok: true, ...detail, issues: result.issues });
      }

      if (type === 'NAV_08E') {
        if (!body.tag_id || !body.jogviszony_id) {
          return Response.json(
            { hiba: 'tag_id és jogviszony_id kötelező 08E-hez.' },
            { status: 400 },
          );
        }
        const result = await generateEmploymentRegistrationExport({
          tagId: body.tag_id,
          jogviszonyId: body.jogviszony_id,
          generatedBy: auth.email,
        });
        const detail = await getBevallasDetail(result.bevallas_id);
        return Response.json({ ok: true, ...detail, ...result });
      }

      if (!body.period?.match(/^\d{4}-\d{2}$/) || !body.payroll_run_ids?.length) {
        return Response.json(
          { hiba: 'period (YYYY-MM) és payroll_run_ids kötelező NAV 08-hoz.' },
          { status: 400 },
        );
      }

      const detail = body.korrekcio_szulo_id
        ? await startNav08Correction(body.korrekcio_szulo_id, auth.email)
        : await generateNav08Declaration({
            period: body.period,
            payrollRunIds: body.payroll_run_ids,
            generatedBy: auth.email,
          });
      return Response.json({ ok: true, ...detail });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generálás sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('berszamfejtes', 'iras');
    if (auth instanceof Response) return auth;

    const body = (await req.json().catch(() => ({}))) as {
      id?: number;
      muvelet?: 'export' | 'korrekcio';
    };

    const id = Number(body.id);
    if (!id) return Response.json({ hiba: 'id kötelező' }, { status: 400 });

    try {
      if (body.muvelet === 'export') {
        const detail = await getBevallasDetail(id);
        if (!detail) throw new Error('Bevallás nem található.');
        if (detail.bevallas.type === 'M30') {
          await exportM30Declaration(id, auth.email);
        } else if (detail.bevallas.type === 'NAV_08E') {
          await exportNav08eDeclaration(id, auth.email);
        } else {
          await exportNav08Declaration(id, auth.email);
        }
        const friss = await getBevallasDetail(id);
        return Response.json({ ok: true, ...friss });
      }
      if (body.muvelet === 'korrekcio') {
        const detail = await startNav08Correction(id, auth.email);
        return Response.json({ ok: true, ...detail });
      }
      return Response.json({ hiba: 'Ismeretlen muvelet' }, { status: 400 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Művelet sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/nav-bevallasok',
};
