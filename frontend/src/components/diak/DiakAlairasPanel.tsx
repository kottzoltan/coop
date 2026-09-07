import { useCallback, useEffect, useState } from 'react';
import type { EAlairasKerelem } from '@coop/shared';
import { diakSzerzodesAlairas, dokumentumLetoltesUrl, getDiakFuggobenAlairasok } from '../../api/coop';

const TIPUS_LABEL: Record<string, string> = {
  keretszerzodes: 'Keretszerződés',
  eseti_szerzodes: 'Eseti szerződés',
};

type Props = {
  onValtozas?: (fuggoben: number) => void;
  modalNyitva?: boolean;
  onModalBezar?: () => void;
};

export function DiakAlairasPanel({ onValtozas, modalNyitva, onModalBezar }: Props) {
  const [sorok, setSorok] = useState<EAlairasKerelem[]>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [alairasId, setAlairasId] = useState<number | null>(null);
  const [siker, setSiker] = useState<string | null>(null);

  const betolt = useCallback(async () => {
    setToltes(true);
    try {
      const d = await getDiakFuggobenAlairasok();
      setSorok(d.sorok);
      onValtozas?.(d.fuggoben);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Betöltés sikertelen');
    } finally {
      setToltes(false);
    }
  }, [onValtozas]);

  useEffect(() => {
    betolt().catch(() => null);
  }, [betolt]);

  async function alair(k: EAlairasKerelem) {
    setAlairasId(k.id);
    setHiba(null);
    setSiker(null);
    try {
      const r = await diakSzerzodesAlairas(k.id);
      setSiker(`${k.dokumentum_nev} — aláírva (időbélyeg: ${r.sor.microsec_idobelyeg ?? '—'})`);
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Aláírás sikertelen');
    } finally {
      setAlairasId(null);
    }
  }

  const fuggoben = sorok.filter((s) => s.statusz === 'függőben');

  const tartalom = (
    <div className="space-y-3">
      {hiba && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}
      {siker && <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">{siker}</p>}

      {toltes ? (
        <p className="text-sm text-text-muted">Aláírandó dokumentumok betöltése…</p>
      ) : fuggoben.length === 0 ? (
        <p className="text-sm text-text-muted">Nincs függőben lévő aláírandó szerződés.</p>
      ) : (
        fuggoben.map((k) => (
          <article
            key={k.id}
            className="rounded-card border border-warning/40 bg-warning-bg/30 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-warning">
                  {TIPUS_LABEL[k.szerzodes_tipus ?? ''] ?? 'Digitális aláírás'}
                </p>
                <h3 className="mt-1 font-bold text-navy">{k.dokumentum_nev}</h3>
                {k.hirdetes_cim && (
                  <p className="mt-1 text-sm text-text-muted">Munka: {k.hirdetes_cim}</p>
                )}
                <p className="mt-2 text-xs text-text-muted">
                  Microsec időbélyeggel történő elektronikus aláírás (teszt: szimulált időbélyeg).
                </p>
                {k.blob_key && (
                  <a
                    href={dokumentumLetoltesUrl(k.blob_key)}
                    className="mt-2 inline-block text-xs font-semibold text-[#2C7BD6] hover:underline"
                  >
                    Szerződés letöltése / megtekintése →
                  </a>
                )}
                {!k.blob_key && (
                  <p className="mt-2 text-xs text-warning">Sablon még nincs feltöltve — kérd a Coop-tól.</p>
                )}
              </div>
              <button
                type="button"
                disabled={alairasId === k.id}
                onClick={() => alair(k)}
                className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535] disabled:opacity-50"
              >
                {alairasId === k.id ? 'Aláírás…' : 'Digitális aláírás'}
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );

  return (
    <>
      <section id="alairas" className="scroll-mt-24">
        <h2 className="text-lg font-bold text-navy">Digitális szerződések</h2>
        <p className="mt-1 text-sm text-text-muted">
          Felvétel után a keretszerződést és az eseti szerződést itt írhatod alá.
        </p>
        <div className="mt-4">{tartalom}</div>
      </section>

      {modalNyitva && fuggoben.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
          <div
            role="dialog"
            aria-labelledby="alairas-modal-cim"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-card p-6 shadow-lg"
          >
            <h2 id="alairas-modal-cim" className="text-lg font-bold text-navy">
              Aláírás szükséges
            </h2>
            <p className="mt-2 text-sm text-text-body">
              Felvételt nyertél egy munkára — kérjük, írd alá digitálisan a szerződéseket a
              munkavállalás megkezdéséhez. E-mailben is értesítettünk.
            </p>
            <div className="mt-4">{tartalom}</div>
            <button
              type="button"
              onClick={onModalBezar}
              className="mt-5 w-full rounded-btn border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-cream-muted"
            >
              Később aláírom
            </button>
          </div>
        </div>
      )}
    </>
  );
}
