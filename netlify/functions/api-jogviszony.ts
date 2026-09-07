import type { Config } from '@netlify/functions';
import { requireBelso } from './lib/auth.js';
import { createJogviszony, listJogviszonyok } from './lib/ber/nav/nav-08e-generator.js';

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const auth = await requireBelso('tagok', 'olvasas');
    if (auth instanceof Response) return auth;

    const tagId = Number(url.searchParams.get('tag_id'));
    if (!tagId) return Response.json({ hiba: 'tag_id kötelező' }, { status: 400 });

    const sorok = await listJogviszonyok(tagId);
    return Response.json({ sorok, count: sorok.length });
  }

  if (req.method === 'POST') {
    const auth = await requireBelso('tagok', 'iras');
    if (auth instanceof Response) return auth;

    const body = (await req.json().catch(() => ({}))) as {
      tag_id?: number;
      relation_type?: string;
      is_insured?: boolean;
      nav_declaration_required?: boolean;
      start_date?: string;
      end_date?: string | null;
      project_id?: number | null;
    };

    if (!body.tag_id || !body.relation_type || !body.start_date) {
      return Response.json(
        { hiba: 'tag_id, relation_type, start_date kötelező.' },
        { status: 400 },
      );
    }

    try {
      const sor = await createJogviszony({
        tagId: body.tag_id,
        relationType: body.relation_type,
        isInsured: body.is_insured,
        navDeclarationRequired: body.nav_declaration_required,
        startDate: body.start_date,
        endDate: body.end_date,
        projectId: body.project_id,
      });
      return Response.json({ ok: true, jogviszony: sor });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Létrehozás sikertelen';
      return Response.json({ hiba: msg }, { status: 400 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/jogviszony',
};
