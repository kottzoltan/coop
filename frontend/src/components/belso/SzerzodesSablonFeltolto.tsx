import { useRef, useState } from 'react';
import type { SzerzodesSablonMeta } from '@coop/shared';
import { feltoltSzerzodesSablon } from '../../api/coop';

type Props = {
  cim: string;
  leiras: string;
  tipus: 'keretszerzodes' | 'eseti_alap' | 'eseti_projekt';
  projektId?: number;
  sablon: SzerzodesSablonMeta | null;
  onFeltoltve: () => void;
};

export function SzerzodesSablonFeltolto({
  cim,
  leiras,
  tipus,
  projektId,
  sablon,
  onFeltoltve,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [toltes, setToltes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  async function fajlValasztas(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setToltes(true);
    setHiba(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const tartalom_base64 = btoa(binary);
      await feltoltSzerzodesSablon({
        tipus,
        fajlnev: file.name,
        tartalom_base64,
        content_type: file.type || undefined,
        projekt_id: projektId,
      });
      onFeltoltve();
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Feltöltés sikertelen');
    } finally {
      setToltes(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <h3 className="font-bold text-navy">{cim}</h3>
      <p className="mt-1 text-sm text-text-muted">{leiras}</p>

      {sablon ? (
        <div className="mt-3 rounded-lg bg-cream-muted px-3 py-2 text-sm">
          <p className="font-semibold text-navy">{sablon.fajlnev}</p>
          <p className="text-xs text-text-muted">
            {sablon.meret ?? '—'} · feltöltve: {sablon.feltoltve ?? '—'}
            {sablon.feltolto ? ` · ${sablon.feltolto}` : ''}
          </p>
          <a
            href={`/api/dokumentumok?key=${encodeURIComponent(sablon.blob_key)}`}
            className="mt-2 inline-block text-xs font-semibold text-gold hover:underline"
          >
            Sablon letöltése →
          </a>
        </div>
      ) : (
        <p className="mt-3 text-sm text-warning">Még nincs feltöltött sablon.</p>
      )}

      {hiba && <p className="mt-2 text-sm text-danger">{hiba}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".doc,.docx,.pdf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={fajlValasztas}
      />
      <button
        type="button"
        disabled={toltes}
        onClick={() => inputRef.current?.click()}
        className="mt-3 rounded-btn border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-cream-muted disabled:opacity-50"
      >
        {toltes ? 'Feltöltés…' : sablon ? 'Sablon cseréje' : 'Word / PDF sablon feltöltése'}
      </button>
    </div>
  );
}
