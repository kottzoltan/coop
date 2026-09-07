import { useState } from 'react';
import type { SzovetkezetiTag, TagDokumentumMeta } from '@coop/shared';
import { dokumentumLetoltesUrl, feltoltDokumentum, mentTag } from '../../../api/coop';

const TIPUSOK = ['Diákigazolvány másolat', 'Bankszámla igazolás', 'Eseti szerződés', 'Egyéb'] as const;

function formatMeret(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function fileToBase64(file: File): Promise<{ base64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        base64: result.includes(',') ? result.split(',')[1]! : result,
        contentType: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Props = {
  tag: SzovetkezetiTag;
  onFrissit: (tag: SzovetkezetiTag) => void;
};

export function TagDokumentumokPanel({ tag, onFrissit }: Props) {
  const [fajl, setFajl] = useState<File | null>(null);
  const [tipus, setTipus] = useState<string>(TIPUSOK[0]);
  const [kuldes, setKuldes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  const lista = tag.dokumentumok ?? [];

  async function feltolt(e: React.FormEvent) {
    e.preventDefault();
    if (!fajl) return;
    setKuldes(true);
    setHiba(null);
    try {
      const { base64, contentType } = await fileToBase64(fajl);
      const feltolt = await feltoltDokumentum({
        scope: 'tag',
        scope_id: tag.id,
        fajlnev: fajl.name,
        tartalom_base64: base64,
        content_type: contentType,
      });
      const uj: TagDokumentumMeta = {
        id: `d-${Date.now()}`,
        nev: fajl.name,
        tipus,
        feltoltve: new Date().toISOString().slice(0, 10),
        meret: formatMeret(fajl.size),
        blob_key: feltolt.blob_key,
      };
      const r = await mentTag(tag.id, { dokumentumok: [uj, ...lista] });
      onFrissit(r.tag);
      setFajl(null);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Feltöltés sikertelen');
    } finally {
      setKuldes(false);
    }
  }

  async function torol(index: number, doc: TagDokumentumMeta) {
    if (!confirm(`Törlöd: ${doc.nev}?`)) return;
    if (doc.blob_key) {
      await fetch(`/api/dokumentumok?key=${encodeURIComponent(doc.blob_key)}`, { method: 'DELETE' });
    }
    const marad = lista.filter((_, i) => i !== index);
    const r = await mentTag(tag.id, { dokumentumok: marad });
    onFrissit(r.tag);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={feltolt} className="rounded-lg border border-border bg-cream-muted p-4">
        <h3 className="text-sm font-bold text-navy">Dokumentum feltöltés</h3>
        {hiba && <p className="mt-2 text-sm text-danger">{hiba}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-2">
            Fájl
            <input
              type="file"
              className="field-input mt-1 w-full text-sm"
              onChange={(e) => setFajl(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block text-sm">
            Típus
            <select className="field-input mt-1 w-full" value={tipus} onChange={(e) => setTipus(e.target.value)}>
              {TIPUSOK.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={kuldes || !fajl}
          className="mt-3 rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {kuldes ? 'Feltöltés…' : 'Feltöltés'}
        </button>
      </form>

      {lista.length === 0 ? (
        <p className="text-sm text-text-muted">Nincs feltöltött dokumentum.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((doc, i) => (
            <div
              key={doc.id ?? `${doc.nev}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                {doc.blob_key ? (
                  <a
                    href={dokumentumLetoltesUrl(doc.blob_key)}
                    className="font-medium text-gold hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {doc.nev}
                  </a>
                ) : (
                  <span className="font-medium text-navy">{doc.nev}</span>
                )}
                <p className="text-xs text-text-muted">
                  {[doc.tipus, doc.meret, doc.feltoltve].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => torol(i, doc)}
                className="text-xs font-semibold text-danger hover:underline"
              >
                Törlés
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
