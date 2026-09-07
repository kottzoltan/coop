import type { Config } from '@netlify/functions';
import { requireBelso } from './lib/auth.js';
import {
  closePayrollRun,
  createPayrollRun,
  getPayrollRunDetail,
  listPayrollRuns,
  startPayrollCorrection,
  syncPayrollLines,
  validatePayrollRunById,
} from './lib/ber/payroll-run-service.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('berszamfejtes', 'olvasas');
    if (auth instanceof Response) return auth;

    const id = url.searchParams.get('id');
    if (id) {
      const detail = await getPayrollRunDetail(Number(id));
      if (!detail) return Response.json({ hiba: 'Futás nem található.' }, { status: 404 });
      return Response.json(detail);
    }

    const period = url.searchParams.get('payroll_period') ?? undefined;
    const sorok = await listPayrollRuns(period);
    return Response.json({ sorok, count: sorok.length });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('berszamfejtes', 'iras');
    if (auth instanceof Response) return auth;

    const body = (await req.json().catch(() => ({}))) as {
      payroll_period?: string;
      performance_period?: string;
      munkalap_ids?: number[];
    };

    if (!body.payroll_period?.match(/^\d{4}-\d{2}$/)) {
      return Response.json({ hiba: 'Érvényes payroll_period kötelező (YYYY-MM).' }, { status: 400 });
    }

    try {
      const detail = await createPayrollRun({
        payrollPeriod: body.payroll_period,
        performancePeriod: body.performance_period,
        munkalapIds: body.munkalap_ids,
        createdBy: auth.email,
      });
      return Response.json({ ok: true, ...detail });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Futás létrehozása sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  if (req.method === 'PATCH') {
    const auth = await requireBelso('berszamfejtes', 'iras');
    if (auth instanceof Response) return auth;

    const body = (await req.json().catch(() => ({}))) as {
      id?: number;
      muvelet?: 'validate' | 'close' | 'sync' | 'korrekcio';
    };

    const id = Number(body.id);
    if (!id) return Response.json({ hiba: 'id kötelező' }, { status: 400 });

    try {
      if (body.muvelet === 'sync') {
        await syncPayrollLines(id);
        const detail = await getPayrollRunDetail(id);
        return Response.json({ ok: true, ...detail });
      }
      if (body.muvelet === 'validate') {
        const detail = await validatePayrollRunById(id);
        return Response.json({ ok: true, ...detail });
      }
      if (body.muvelet === 'close') {
        const detail = await closePayrollRun(id, auth.email);
        return Response.json({ ok: true, ...detail });
      }
      if (body.muvelet === 'korrekcio') {
        const detail = await startPayrollCorrection(id, auth.email);
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
  path: '/api/ber-futasok',
};
