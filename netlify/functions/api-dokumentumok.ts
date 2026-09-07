import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { eAlairasKerelem } from '../../db/schema.js';
import { getIceAuth, requireBelso, requireDiak } from './lib/auth.js';
import type { Ugycsoport } from '../../shared/src/ugycsoportok.js';

const STORE = 'ice-dokumentumok';
const MAX_BYTES = 5 * 1024 * 1024;

function blobKey(scope: string, id: string, fajlnev: string): string {
  const safe = fajlnev.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return `${scope}/${id}/${Date.now()}-${safe}`;
}

function ugycsoportScope(scope: string): Ugycsoport {
  if (scope === 'tag') return 'tagok';
  if (scope === 'sablon') return 'tagok';
  return 'projektek';
}

async function diakSablonHozzafer(blobKey: string, diakId: number): Promise<boolean> {
  const [kerelem] = await db
    .select({ id: eAlairasKerelem.id })
    .from(eAlairasKerelem)
    .where(
      and(
        eq(eAlairasKerelem.diakRegisztracioId, diakId),
        eq(eAlairasKerelem.blobKey, blobKey),
      ),
    )
    .limit(1);
  return !!kerelem;
}

async function authOlvasas(scope: string, key?: string) {
  if (scope === 'diak') {
    const auth = await requireDiak();
    if (auth instanceof Response) return auth;
    if (key) {
      const parts = key.split('/');
      const scopeId = parts[1];
      if (scopeId && String(auth.diakId) !== scopeId) {
        return Response.json({ hiba: 'Forbidden' }, { status: 403 });
      }
    }
    return auth;
  }
  if (scope === 'sablon' && key) {
    const auth = await getIceAuth();
    if (!auth) return Response.json({ hiba: 'Unauthorized' }, { status: 401 });
    if (auth.szerep === 'belso') {
      const belso = await requireBelso('tagok', 'olvasas');
      if (belso instanceof Response) return belso;
      return belso;
    }
    if (auth.szerep === 'diak' && auth.diakId) {
      const enged = await diakSablonHozzafer(key, auth.diakId);
      if (!enged) return Response.json({ hiba: 'Forbidden' }, { status: 403 });
      return auth;
    }
    return Response.json({ hiba: 'Forbidden' }, { status: 403 });
  }
  return requireBelso(ugycsoportScope(scope), 'olvasas');
}

async function authIras(scope: string, scopeId?: string) {
  if (scope === 'diak') {
    const auth = await requireDiak();
    if (auth instanceof Response) return auth;
    if (scopeId && String(auth.diakId) !== scopeId) {
      return Response.json({ hiba: 'Forbidden' }, { status: 403 });
    }
    return auth;
  }
  return requireBelso(ugycsoportScope(scope), 'iras');
}

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const key = url.searchParams.get('key');
    if (!key) return Response.json({ hiba: 'Hiányzó blob kulcs' }, { status: 400 });

    const scope = key.split('/')[0] ?? 'projekt';
    const auth = await authOlvasas(scope, key);
    if (auth instanceof Response) return auth;

    const store = getStore({ name: STORE, consistency: 'strong' });
    const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!result) return Response.json({ hiba: 'Dokumentum nem található' }, { status: 404 });

    const contentType =
      typeof result.metadata?.contentType === 'string'
        ? result.metadata.contentType
        : 'application/octet-stream';
    const fajlnev =
      typeof result.metadata?.fajlnev === 'string' ? result.metadata.fajlnev : 'dokumentum';

    return new Response(result.data as ArrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fajlnev}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  if (req.method === 'POST') {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ hiba: 'Érvénytelen JSON' }, { status: 400 });
    }

    const scope = typeof body.scope === 'string' ? body.scope : 'projekt';
    const scopeId = String(body.scope_id ?? body.projekt_id ?? body.tag_id ?? body.diak_id ?? '');
    const auth =
      scope === 'sablon'
        ? await requireBelso('tagok', 'iras')
        : await authIras(scope, scopeId);
    if (auth instanceof Response) return auth;

    const fajlnev = typeof body.fajlnev === 'string' ? body.fajlnev.trim() : '';
    const tartalom = typeof body.tartalom_base64 === 'string' ? body.tartalom_base64 : '';
    const contentType =
      typeof body.content_type === 'string' ? body.content_type : 'application/octet-stream';

    if (!scopeId || !fajlnev || !tartalom) {
      return Response.json(
        { hiba: 'scope_id, fajlnev és tartalom_base64 kötelező' },
        { status: 400 },
      );
    }

    const buf = Buffer.from(tartalom, 'base64');
    if (buf.byteLength > MAX_BYTES) {
      return Response.json({ hiba: 'Max. 5 MB fájlméret' }, { status: 400 });
    }

    const key = blobKey(scope, scopeId, fajlnev);
    const store = getStore({ name: STORE, consistency: 'strong' });
    const feltolto = 'email' in auth ? auth.email : 'diak';
    await store.set(key, buf, {
      metadata: { contentType, fajlnev, feltolto, scope, scopeId },
    });

    return Response.json({
      ok: true,
      blob_key: key,
      meret: `${Math.round(buf.byteLength / 1024)} KB`,
    });
  }

  if (req.method === 'DELETE') {
    const key = url.searchParams.get('key');
    if (!key) return Response.json({ hiba: 'Hiányzó kulcs' }, { status: 400 });

    const scope = key.split('/')[0] ?? 'projekt';
    const auth = await authOlvasas(scope, key);
    if (auth instanceof Response) return auth;
    if (scope !== 'diak') {
      const belso = await requireBelso(ugycsoportScope(scope), 'iras');
      if (belso instanceof Response) return belso;
    }

    const store = getStore({ name: STORE });
    await store.delete(key);
    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/dokumentumok',
};
