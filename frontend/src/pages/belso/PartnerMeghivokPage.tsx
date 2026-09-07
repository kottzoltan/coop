import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface MeghivoSor {
  id: number;
  email: string;
  nev: string;
  statusz: string;
  forras: string;
  hozzaferes: string;
  cegnev: string;
  projekt_nev: string | null;
  kuldve: string;
  lejarat: string | null;
  elfogadva: string | null;
}

interface SablonAdat {
  targy: string;
  szoveg: string;
}

const STATUSZ_SZIN: Record<string, string> = {
  küldve: 'bg-cream-muted text-navy',
  elfogadva: 'bg-success-bg text-success',
  lejárt: 'bg-danger-bg text-danger',
  visszavonva: 'bg-cream-muted text-text-muted',
};

const HELYORZOK = [
  '{{nev}}',
  '{{email}}',
  '{{cegnev}}',
  '{{projekt}}',
  '{{projekt_sor}}',
  '{{link}}',
  '{{lejarat}}',
  '{{uzenet_sor}}',
];

export function PartnerMeghivokPage() {
  const [tab, setTab] = useState<'lista' | 'sablon'>('lista');
  const [sorok, setSorok] = useState<MeghivoSor[]>([]);
  const [statusz, setStatusz] = useState('mind');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [uzenet, setUzenet] = useState<string | null>(null);

  const [sablon, setSablon] = useState<SablonAdat>({ targy: '', szoveg: '' });
  const [emailSzolgaltato, setEmailSzolgaltato] = useState('');
  const [sablonMentes, setSablonMentes] = useState(false);

  const listaBetolt = useCallback(async () => {
    setToltes(true);
    setHiba(null);
    try {
      const q = statusz !== 'mind' ? `?statusz=${encodeURIComponent(statusz)}` : '';
      const res = await fetch(`/api/belso-partner-meghivok${q}`);
      const json = (await res.json().catch(() => ({}))) as {
        sorok?: MeghivoSor[];
        hiba?: string;
      };
      if (!res.ok) throw new Error(json.hiba ?? 'Lista betöltése sikertelen');
      setSorok(json.sorok ?? []);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }, [statusz]);

  const sablonBetolt = useCallback(async () => {
    setToltes(true);
    setHiba(null);
    try {
      const res = await fetch('/api/belso-partner-meghivok?nezet=sablon');
      const json = (await res.json().catch(() => ({}))) as {
        sablon?: SablonAdat;
        email_szolgaltato?: string;
        hiba?: string;
      };
      if (!res.ok) throw new Error(json.hiba ?? 'Sablon betöltése sikertelen');
      setSablon(json.sablon ?? { targy: '', szoveg: '' });
      setEmailSzolgaltato(json.email_szolgaltato ?? '');
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'lista') listaBetolt();
    else sablonBetolt();
  }, [tab, listaBetolt, sablonBetolt]);

  async function linkMasolasa(id: number) {
    const res = await fetch('/api/belso-partner-meghivok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = (await res.json().catch(() => ({}))) as { link?: string; hiba?: string };
    if (!res.ok || !json.link) {
      setHiba(json.hiba ?? 'Link lekérése sikertelen');
      return;
    }
    await navigator.clipboard.writeText(json.link);
    setUzenet('Link másolva.');
    setTimeout(() => setUzenet(null), 2000);
  }

  async function visszavonas(id: number) {
    if (!confirm('Meghívó visszavonása?')) return;
    const res = await fetch('/api/belso-partner-meghivok', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statusz: 'visszavonva' }),
    });
    const json = (await res.json().catch(() => ({}))) as { hiba?: string };
    if (!res.ok) {
      setHiba(json.hiba ?? 'Visszavonás sikertelen');
      return;
    }
    listaBetolt();
  }

  async function sablonMent() {
    setSablonMentes(true);
    setHiba(null);
    try {
      const res = await fetch('/api/belso-partner-meghivok', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sablon }),
      });
      const json = (await res.json().catch(() => ({}))) as { hiba?: string };
      if (!res.ok) throw new Error(json.hiba ?? 'Mentés sikertelen');
      setUzenet('E-mail sablon mentve.');
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setSablonMentes(false);
    }
  }

  const szolgaltatoSzoveg =
    emailSzolgaltato === 'resend'
      ? 'Resend (Coop sablon)'
      : emailSzolgaltato === 'sendgrid'
        ? 'SendGrid (Coop sablon)'
        : 'Netlify Identity alapértelmezett (állíts be RESEND_API_KEY vagy SENDGRID_API_KEY env-et az Coop sablonhoz)';

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-bold text-navy">Partner meghívók</h1>
        <p className="mt-1 text-sm text-text-muted">
          Küldött meghívók nyomon követése és e-mail sablon szerkesztése.
        </p>
        <nav className="mt-4 flex gap-1 border-b border-border pb-px">
          {(
            [
              ['lista', 'Meghívók listája'],
              ['sablon', 'E-mail sablon'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'border-b-2 px-3 py-2 text-xs font-semibold',
                tab === id ? 'border-gold text-navy' : 'border-transparent text-text-muted',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {hiba && <p className="mb-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}
        {uzenet && (
          <p className="mb-4 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">{uzenet}</p>
        )}

        {tab === 'lista' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-text-muted">Státusz:</span>
                <select
                  className="field-input py-1.5 text-sm"
                  value={statusz}
                  onChange={(e) => setStatusz(e.target.value)}
                >
                  {['mind', 'küldve', 'elfogadva', 'lejárt', 'visszavonva'].map((s) => (
                    <option key={s} value={s}>
                      {s === 'mind' ? 'Mind' : s}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                to="/belso/partner-regisztraciok"
                className="text-xs font-semibold text-gold hover:underline"
              >
                Partner jelentkezések →
              </Link>
            </div>

            {toltes ? (
              <p className="text-sm text-text-muted">Betöltés…</p>
            ) : sorok.length === 0 ? (
              <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-text-muted">
                Nincs meghívó ebben a szűrésben.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-card border border-border bg-card">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-cream-muted text-xs uppercase text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Kapcsolattartó</th>
                      <th className="px-4 py-3">Partner / projekt</th>
                      <th className="px-4 py-3">Státusz</th>
                      <th className="px-4 py-3">Küldve</th>
                      <th className="px-4 py-3">Lejárat</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorok.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-navy">{s.nev}</p>
                          <p className="text-xs text-text-muted">{s.email}</p>
                          <p className="mt-1 text-[11px] text-text-muted">
                            {s.forras === 'projekt' ? 'Projekt kapcsolattartó' : 'CRM kapcsolattartó'} ·{' '}
                            {s.hozzaferes}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-body">
                          {s.cegnev}
                          {s.projekt_nev && (
                            <p className="mt-1 text-text-muted">{s.projekt_nev}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUSZ_SZIN[s.statusz] ?? 'bg-cream-muted'}`}
                          >
                            {s.statusz}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          {s.kuldve?.slice(0, 16).replace('T', ' ')}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          {s.lejarat?.slice(0, 10) ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {s.statusz === 'küldve' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => linkMasolasa(s.id)}
                                  className="text-xs font-semibold text-[#2C7BD6] hover:underline"
                                >
                                  Link
                                </button>
                                <button
                                  type="button"
                                  onClick={() => visszavonas(s.id)}
                                  className="text-xs font-semibold text-danger hover:underline"
                                >
                                  Visszavonás
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'sablon' && (
          <div className="mx-auto max-w-2xl space-y-4">
            <p className="rounded-lg border border-border bg-cream-muted px-4 py-3 text-sm text-text-body">
              E-mail küldés: <span className="font-semibold">{szolgaltatoSzoveg}</span>
            </p>
            <p className="text-xs text-text-muted">
              Helyőrzők: {HELYORZOK.join(', ')}. A <code className="text-navy">{'{{uzenet_sor}}'}</code>{' '}
              a meghívó küldésekor megadott egyedi üzenet (ha van).
            </p>
            {toltes ? (
              <p className="text-sm text-text-muted">Betöltés…</p>
            ) : (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase text-text-muted">
                    E-mail tárgy
                  </span>
                  <input
                    className="field-input"
                    value={sablon.targy}
                    onChange={(e) => setSablon((s) => ({ ...s, targy: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase text-text-muted">
                    E-mail szöveg
                  </span>
                  <textarea
                    className="field-input min-h-[240px] font-mono text-sm"
                    value={sablon.szoveg}
                    onChange={(e) => setSablon((s) => ({ ...s, szoveg: e.target.value }))}
                  />
                </label>
                <button
                  type="button"
                  disabled={sablonMentes}
                  onClick={sablonMent}
                  className="rounded-btn bg-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {sablonMentes ? 'Mentés…' : 'Sablon mentése'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
