import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  belsoDiakBeoszt,
  belsoDiakBeosztTorol,
  belsoCsoportLetrehoz,
  belsoJelenletModosit,
  belsoLemondasDontes,
  belsoMuszakLetrehoz,
  belsoMuszakModosit,
  belsoMuszakTorol,
  belsoQrJelenlet,
  getBelsoBeosztas,
  getBelsoJelenletek,
  getBelsoMuszakReszlet,
  getPartnerek,
  getProjektek,
  getReszletesKereso,
  type BelsoBeosztasCsoport,
  type BelsoJelenletSor,
  type BelsoMuszak,
  type Projekt,
} from '../../api/coop';

function SegmentBar({ active }: { active: 'muszakok' | 'jelenletek' }) {
  const base = 'rounded-lg px-4 py-2 text-sm font-semibold transition-colors';
  const activeCls = 'bg-card text-navy shadow-sm';
  const inactiveCls = 'text-text-muted hover:text-navy';
  return (
    <div className="inline-flex gap-0.5 rounded-btn bg-cream-muted p-1">
      <Link
        to="/belso/beosztas"
        className={`${base} ${active === 'muszakok' ? activeCls : inactiveCls}`}
      >
        Műszakok
      </Link>
      <Link
        to="/belso/beosztas/jelenletek"
        className={`${base} ${active === 'jelenletek' ? activeCls : inactiveCls}`}
      >
        Jelenléti ívek
      </Link>
    </div>
  );
}

function muszakStatuszBadge(statusz: string) {
  const map: Record<string, string> = {
    publikus: 'bg-success-bg text-success',
    piszkozat: 'bg-cream-muted text-text-muted',
    zárt: 'bg-navy/10 text-navy',
    lezárt: 'bg-cream-muted text-text-muted',
    törölve: 'bg-danger-bg text-danger',
  };
  return map[statusz] ?? 'bg-cream-muted text-text-muted';
}

function jelenletStatuszBadge(statusz: string) {
  const map: Record<string, string> = {
    rögzített: 'bg-warning-bg text-warning',
    jóváhagyva: 'bg-[#EAF1F7] text-[#2C7BD6]',
    partner_jóváhagyva: 'bg-[#EAF1F7] text-[#2C7BD6]',
    pv_véglegesített: 'bg-success-bg text-success',
    elutasítva: 'bg-danger-bg text-danger',
  };
  return map[statusz] ?? 'bg-cream-muted text-text-muted';
}

function idoFormat(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

function ProjektSzuro({
  projektId,
  projektek,
  onChange,
}: {
  projektId: string;
  projektek: Projekt[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={projektId}
      onChange={(e) => onChange(e.target.value)}
      className="field-input w-auto min-w-[240px]"
    >
      <option value="">Minden projekt</option>
      {projektek.map((p) => (
        <option key={p.id} value={p.id}>
          {p.azonosito} — {p.nev}
        </option>
      ))}
    </select>
  );
}

export function BeosztasMuszakokPage() {
  const [muszakok, setMuszakok] = useState<BelsoMuszak[]>([]);
  const [stats, setStats] = useState({
    osszesMuszak: 0,
    beosztottOsszesen: 0,
    kovetkezo2Het: 0,
    fuggőJelenlet: 0,
  });
  const [projektek, setProjektek] = useState<Projekt[]>([]);
  const [projektId, setProjektId] = useState('');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [reszlet, setReszlet] = useState<BelsoMuszak | null>(null);
  const [beosztottak, setBeosztottak] = useState<
    Array<{ beosztas: { id: number; statusz: string }; diak_nev: string; diak_id?: number }>
  >([]);
  const [diakKeres, setDiakKeres] = useState('');
  const [diakEredmeny, setDiakEredmeny] = useState<Array<{ id: number; nev: string; email: string }>>([]);
  const [kijeloltDiakok, setKijeloltDiakok] = useState<Set<number>>(new Set());
  const [beosztasKuldes, setBeosztasKuldes] = useState(false);
  const [reszletToltes, setReszletToltes] = useState(false);
  const [qrKuldes, setQrKuldes] = useState<number | null>(null);
  const [ujNyitva, setUjNyitva] = useState(false);
  const [szerkesztMuszak, setSzerkesztMuszak] = useState<BelsoMuszak | null>(null);
  const [partnerek, setPartnerek] = useState<Array<{ id: number; nev: string }>>([]);
  const [ujNap, setUjNap] = useState('');
  const [ujKezdet, setUjKezdet] = useState('08:00');
  const [ujVege, setUjVege] = useState('16:00');
  const [ujCim, setUjCim] = useState('');
  const [ujLetszam, setUjLetszam] = useState(1);
  const [ujPartnerId, setUjPartnerId] = useState('');
  const [ujProjektId, setUjProjektId] = useState('');
  const [muszakKuldes, setMuszakKuldes] = useState(false);
  const [csoportok, setCsoportok] = useState<BelsoBeosztasCsoport[]>([]);
  const [ujCsoportNev, setUjCsoportNev] = useState('');
  const [csoportKuldes, setCsoportKuldes] = useState(false);

  useEffect(() => {
    getProjektek()
      .then((d) => setProjektek(d.sorok))
      .catch(() => setProjektek([]));
    getPartnerek()
      .then((d) => setPartnerek(d.sorok.map((p) => ({ id: p.id, nev: p.nev }))))
      .catch(() => setPartnerek([]));
  }, []);

  useEffect(() => {
    setToltes(true);
    setHiba(null);
    getBelsoBeosztas(projektId ? { projekt_id: Number(projektId) } : undefined)
      .then((d) => {
        setMuszakok(d.muszakok);
        setStats(d.statistikak);
        setCsoportok(d.beosztasok ?? []);
      })
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [projektId]);

  async function reszletNyit(m: BelsoMuszak) {
    setReszlet(m);
    setBeosztottak([]);
    setDiakKeres('');
    setDiakEredmeny([]);
    setKijeloltDiakok(new Set());
    setReszletToltes(true);
    try {
      const d = await getBelsoMuszakReszlet(m.id);
      setReszlet(d.muszak);
      setBeosztottak(d.beosztottak);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Részlet betöltése sikertelen');
    } finally {
      setReszletToltes(false);
    }
  }

  useEffect(() => {
    if (!reszlet || !diakKeres.trim()) {
      setDiakEredmeny([]);
      return;
    }
    const t = setTimeout(() => {
      getReszletesKereso(diakKeres.trim(), 'erdeklodok')
        .then((d) => {
          const lista = (d.eredmeny.erdeklodok ?? []) as Array<{
            id: number;
            nev: string;
            email: string;
          }>;
          setDiakEredmeny(lista);
        })
        .catch(() => setDiakEredmeny([]));
    }, 250);
    return () => clearTimeout(t);
  }, [diakKeres, reszlet]);

  async function diakokHozzarendel() {
    if (!reszlet || kijeloltDiakok.size === 0) return;
    setBeosztasKuldes(true);
    setHiba(null);
    try {
      await belsoDiakBeoszt(reszlet.id, [...kijeloltDiakok]);
      const d = await getBelsoMuszakReszlet(reszlet.id);
      setReszlet(d.muszak);
      setBeosztottak(d.beosztottak);
      setKijeloltDiakok(new Set());
      setDiakKeres('');
      const lista = await getBelsoBeosztas(projektId ? { projekt_id: Number(projektId) } : undefined);
      setMuszakok(lista.muszakok);
      setStats(lista.statistikak);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Beosztás sikertelen');
    } finally {
      setBeosztasKuldes(false);
    }
  }

  async function diakEltavolit(beosztasId: number) {
    if (!reszlet || !confirm('Eltávolítjuk a diákot a műszakról?')) return;
    try {
      await belsoDiakBeosztTorol(beosztasId);
      const d = await getBelsoMuszakReszlet(reszlet.id);
      setBeosztottak(d.beosztottak);
      setReszlet(d.muszak);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Eltávolítás sikertelen');
    }
  }

  async function lemondasDontes(beosztasId: number, elfogadva: boolean) {
    if (!reszlet) return;
    try {
      await belsoLemondasDontes(beosztasId, elfogadva);
      const d = await getBelsoMuszakReszlet(reszlet.id);
      setBeosztottak(d.beosztottak);
      setReszlet(d.muszak);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Lemondás döntés sikertelen');
    }
  }

  async function csoportLetrehoz(e: React.FormEvent) {
    e.preventDefault();
    if (!ujCsoportNev.trim()) return;
    setCsoportKuldes(true);
    try {
      await belsoCsoportLetrehoz({
        nev: ujCsoportNev.trim(),
        projekt_id: projektId ? Number(projektId) : undefined,
      });
      setUjCsoportNev('');
      const d = await getBelsoBeosztas(projektId ? { projekt_id: Number(projektId) } : undefined);
      setCsoportok(d.beosztasok ?? []);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Csoport létrehozása sikertelen');
    } finally {
      setCsoportKuldes(false);
    }
  }

  async function qrRogzit(beosztasId: number, tipus: 'qr_erkezes' | 'qr_tavozas') {
    setQrKuldes(beosztasId);
    setHiba(null);
    try {
      await belsoQrJelenlet(beosztasId, tipus);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'QR rögzítés sikertelen');
    } finally {
      setQrKuldes(null);
    }
  }

  async function ujMuszakMent(e: React.FormEvent) {
    e.preventDefault();
    setMuszakKuldes(true);
    setHiba(null);
    try {
      await belsoMuszakLetrehoz({
        napok: [ujNap],
        kezdet: ujKezdet,
        vege: ujVege,
        cim: ujCim || 'Belső műszak',
        letszam: ujLetszam,
        partner_id: ujPartnerId ? Number(ujPartnerId) : undefined,
        projekt_id: ujProjektId ? Number(ujProjektId) : projektId ? Number(projektId) : undefined,
      });
      setUjNyitva(false);
      const d = await getBelsoBeosztas(projektId ? { projekt_id: Number(projektId) } : undefined);
      setMuszakok(d.muszakok);
      setStats(d.statistikak);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Létrehozás sikertelen');
    } finally {
      setMuszakKuldes(false);
    }
  }

  async function muszakSzerkesztMent() {
    if (!szerkesztMuszak) return;
    setMuszakKuldes(true);
    try {
      await belsoMuszakModosit({
        muszak_id: szerkesztMuszak.id,
        kezdet: szerkesztMuszak.kezdet,
        vege: szerkesztMuszak.vege,
        cim: szerkesztMuszak.cim,
        letszam: szerkesztMuszak.letszamMegrendelt ?? 1,
        statusz: szerkesztMuszak.statusz,
      });
      setSzerkesztMuszak(null);
      const d = await getBelsoBeosztas(projektId ? { projekt_id: Number(projektId) } : undefined);
      setMuszakok(d.muszakok);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMuszakKuldes(false);
    }
  }

  async function muszakTorol(id: number) {
    if (!confirm('Töröljük a műszakot?')) return;
    try {
      await belsoMuszakTorol(id);
      setReszlet(null);
      const d = await getBelsoBeosztas(projektId ? { projekt_id: Number(projektId) } : undefined);
      setMuszakok(d.muszakok);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Törlés sikertelen');
    }
  }

  const statuszSzuro = useMemo(() => {
    const ma = new Date().toISOString().slice(0, 10);
    return {
      kovetkezo: muszakok.filter((m) => String(m.datum) >= ma),
      mult: muszakok.filter((m) => String(m.datum) < ma),
    };
  }, [muszakok]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4">
        <SegmentBar active="muszakok" />
        <h1 className="mt-3 text-xl font-bold text-navy">Beosztáskezelő — műszakok</h1>
        <p className="text-sm text-text-muted">
          Partneri megrendelések és beosztások áttekintése — részletek, beosztott diákok.
        </p>
      </div>

      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Összes műszak', value: stats.osszesMuszak },
          { label: 'Következő 2 hét', value: stats.kovetkezo2Het },
          { label: 'Beosztott diák', value: stats.beosztottOsszesen },
          { label: 'Függő jelenlét', value: stats.fuggőJelenlet },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-border bg-card p-3 text-center">
            <p className="text-xl font-bold text-navy">{s.value}</p>
            <p className="text-[11px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-navy">Beosztás csoportok</h2>
        <form onSubmit={csoportLetrehoz} className="mt-2 flex flex-wrap gap-2">
          <input
            className="field-input min-w-[200px] flex-1"
            placeholder="Új csoport neve…"
            value={ujCsoportNev}
            onChange={(e) => setUjCsoportNev(e.target.value)}
          />
          <button
            type="submit"
            disabled={csoportKuldes}
            className="rounded-btn bg-gold px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {csoportKuldes ? '…' : '+ Csoport'}
          </button>
        </form>
        {csoportok.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {csoportok.map((c) => (
              <li key={c.id} className="rounded-md bg-cream-muted px-2 py-1 text-text-muted">
                {c.nev}
                {c.projekt_azonosito && ` · ${c.projekt_azonosito}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ProjektSzuro projektId={projektId} projektek={projektek} onChange={setProjektId} />
        <button
          type="button"
          onClick={() => {
            setUjProjektId(projektId);
            setUjNyitva(true);
          }}
          className="rounded-btn bg-gold px-3 py-2 text-sm font-bold text-white"
        >
          + Új műszak
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-muted text-left text-[11px] font-bold uppercase text-text-muted">
            <tr>
              <th className="px-2 py-2">Dátum</th>
              <th className="px-2 py-2">Műszak</th>
              <th className="px-2 py-2">Projekt</th>
              <th className="px-2 py-2">Partner</th>
              <th className="px-2 py-2">Létszám</th>
              <th className="px-2 py-2">Státusz</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {toltes ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                  Betöltés…
                </td>
              </tr>
            ) : muszakok.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                  Nincs műszak a szűrőre.
                </td>
              </tr>
            ) : (
              statuszSzuro.kovetkezo.concat(statuszSzuro.mult).map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-cream-muted/50">
                  <td className="px-2 py-2 text-xs whitespace-nowrap">{String(m.datum).slice(0, 10)}</td>
                  <td className="px-2 py-2">
                    <p className="font-medium">{m.cim}</p>
                    <p className="text-xs text-text-muted">
                      {m.kezdet}–{m.vege}
                      {m.hely ? ` · ${m.hely}` : ''}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {m.projekt_azonosito ?? '—'}
                    {m.projekt_nev ? (
                      <span className="block text-text-muted">{m.projekt_nev}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-xs">{m.partner_cegnev ?? '—'}</td>
                  <td className="px-2 py-2 text-xs">
                    {m.beosztott ?? 0}/{m.letszamMegrendelt ?? 1}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${muszakStatuszBadge(m.statusz)}`}
                    >
                      {m.statusz}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => reszletNyit(m)}
                      className="mr-2 text-xs font-semibold text-gold hover:underline"
                    >
                      Részlet
                    </button>
                    <button
                      type="button"
                      onClick={() => setSzerkesztMuszak(m)}
                      className="text-xs font-semibold text-navy hover:underline"
                    >
                      Szerk.
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reszlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-card border border-border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-navy">{reszlet.cim}</h2>
                <p className="text-sm text-text-muted">
                  {String(reszlet.datum).slice(0, 10)} · {reszlet.kezdet}–{reszlet.vege}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReszlet(null)}
                className="text-text-muted hover:text-navy"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="text-text-muted">Projekt:</span>{' '}
                {reszlet.projekt_azonosito} — {reszlet.projekt_nev}
              </p>
              <p>
                <span className="text-text-muted">Partner:</span> {reszlet.partner_cegnev ?? '—'}
              </p>
              <p>
                <span className="text-text-muted">Munkakör:</span> {reszlet.munkakor ?? '—'}
              </p>
              {reszlet.leiras && (
                <p className="text-text-body">{reszlet.leiras}</p>
              )}
            </div>

            <h3 className="mt-4 text-sm font-bold text-navy">Beosztott diákok — QR jelenlét</h3>
            <p className="mt-1 text-xs text-text-muted">
              Beérkezés / távozás rögzítése a műszak helyszínén (belső QR panel).
            </p>

            <div className="mt-3 rounded-lg border border-border bg-cream-muted/40 p-3">
              <p className="text-xs font-bold text-navy">Diák hozzárendelés</p>
              <input
                placeholder="Keresés név vagy e-mail alapján…"
                value={diakKeres}
                onChange={(e) => setDiakKeres(e.target.value)}
                className="field-input mt-2 w-full text-sm"
              />
              {diakEredmeny.length > 0 && (
                <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-sm">
                  {diakEredmeny.map((d) => {
                    const marBeosztva = beosztottak.some(
                      (b) => b.diak_id === d.id && b.beosztas.statusz !== 'lemondva',
                    );
                    return (
                      <label
                        key={d.id}
                        className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 ${
                          marBeosztva ? 'opacity-50' : 'hover:bg-card'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={marBeosztva}
                          checked={kijeloltDiakok.has(d.id)}
                          onChange={(e) => {
                            setKijeloltDiakok((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(d.id);
                              else next.delete(d.id);
                              return next;
                            });
                          }}
                        />
                        <span>{d.nev}</span>
                        <span className="text-xs text-text-muted">{d.email}</span>
                      </label>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                disabled={kijeloltDiakok.size === 0 || beosztasKuldes}
                onClick={diakokHozzarendel}
                className="mt-2 rounded-btn bg-gold px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {beosztasKuldes ? 'Beosztás…' : `Hozzárendelés (${kijeloltDiakok.size})`}
              </button>
            </div>

            {reszletToltes ? (
              <p className="mt-2 text-sm text-text-muted">Betöltés…</p>
            ) : beosztottak.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">Nincs beosztott diák.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {beosztottak.map((b) => (
                  <li
                    key={b.beosztas.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream-muted px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{b.diak_nev}</span>
                      <span className="ml-2 text-xs text-text-muted">{b.beosztas.statusz}</span>
                    </div>
                    <div className="flex gap-1">
                      {b.beosztas.statusz === 'lemondás_kérvényezve' && (
                        <>
                          <button
                            type="button"
                            onClick={() => lemondasDontes(b.beosztas.id, true)}
                            className="rounded-md bg-success-bg px-2 py-1 text-[10px] font-bold text-success"
                          >
                            Lemondás OK
                          </button>
                          <button
                            type="button"
                            onClick={() => lemondasDontes(b.beosztas.id, false)}
                            className="rounded-md bg-danger-bg px-2 py-1 text-[10px] font-bold text-danger"
                          >
                            Elutasít
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => diakEltavolit(b.beosztas.id)}
                        className="rounded-md bg-danger-bg px-2 py-1 text-[10px] font-bold text-danger hover:opacity-80"
                      >
                        Eltávolít
                      </button>
                      <button
                        type="button"
                        disabled={qrKuldes === b.beosztas.id}
                        onClick={() => qrRogzit(b.beosztas.id, 'qr_erkezes')}
                        className="rounded-md bg-success-bg px-2 py-1 text-[10px] font-bold text-success hover:opacity-80 disabled:opacity-50"
                      >
                        QR érkezés
                      </button>
                      <button
                        type="button"
                        disabled={qrKuldes === b.beosztas.id}
                        onClick={() => qrRogzit(b.beosztas.id, 'qr_tavozas')}
                        className="rounded-md bg-navy/10 px-2 py-1 text-[10px] font-bold text-navy hover:opacity-80 disabled:opacity-50"
                      >
                        QR távozás
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => muszakTorol(reszlet.id)}
                className="text-xs font-semibold text-danger hover:underline"
              >
                Műszak törlése
              </button>
              <button type="button" onClick={() => setReszlet(null)} className="text-sm text-text-muted">
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {ujNyitva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <form className="w-full max-w-md rounded-card bg-card p-5 shadow-lg" onSubmit={ujMuszakMent}>
            <h2 className="text-lg font-bold text-navy">Új műszak</h2>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                Dátum
                <input type="date" className="field-input mt-1 w-full" value={ujNap} onChange={(e) => setUjNap(e.target.value)} required />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  Kezdet
                  <input className="field-input mt-1 w-full" value={ujKezdet} onChange={(e) => setUjKezdet(e.target.value)} required />
                </label>
                <label className="block">
                  Vég
                  <input className="field-input mt-1 w-full" value={ujVege} onChange={(e) => setUjVege(e.target.value)} required />
                </label>
              </div>
              <label className="block">
                Megnevezés
                <input className="field-input mt-1 w-full" value={ujCim} onChange={(e) => setUjCim(e.target.value)} />
              </label>
              <label className="block">
                Létszám
                <input type="number" min={1} className="field-input mt-1 w-full" value={ujLetszam} onChange={(e) => setUjLetszam(Number(e.target.value))} />
              </label>
              <label className="block">
                Projekt
                <select className="field-input mt-1 w-full" value={ujProjektId} onChange={(e) => setUjProjektId(e.target.value)}>
                  <option value="">—</option>
                  {projektek.map((p) => (
                    <option key={p.id} value={p.id}>{p.azonosito} — {p.nev}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                Partner
                <select className="field-input mt-1 w-full" value={ujPartnerId} onChange={(e) => setUjPartnerId(e.target.value)}>
                  <option value="">—</option>
                  {partnerek.map((p) => (
                    <option key={p.id} value={p.id}>{p.nev}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={muszakKuldes} className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-white disabled:opacity-50">
                {muszakKuldes ? 'Létrehozás…' : 'Létrehozás'}
              </button>
              <button type="button" onClick={() => setUjNyitva(false)} className="rounded-lg border px-4 py-2 text-sm">Mégse</button>
            </div>
          </form>
        </div>
      )}

      {szerkesztMuszak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="w-full max-w-md rounded-card bg-card p-5 shadow-lg">
            <h2 className="text-lg font-bold text-navy">Műszak szerkesztése</h2>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                Megnevezés
                <input
                  className="field-input mt-1 w-full"
                  value={szerkesztMuszak.cim}
                  onChange={(e) => setSzerkesztMuszak({ ...szerkesztMuszak, cim: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  Kezdet
                  <input
                    className="field-input mt-1 w-full"
                    value={szerkesztMuszak.kezdet}
                    onChange={(e) => setSzerkesztMuszak({ ...szerkesztMuszak, kezdet: e.target.value })}
                  />
                </label>
                <label className="block">
                  Vég
                  <input
                    className="field-input mt-1 w-full"
                    value={szerkesztMuszak.vege}
                    onChange={(e) => setSzerkesztMuszak({ ...szerkesztMuszak, vege: e.target.value })}
                  />
                </label>
              </div>
              <label className="block">
                Státusz
                <select
                  className="field-input mt-1 w-full"
                  value={szerkesztMuszak.statusz}
                  onChange={(e) => setSzerkesztMuszak({ ...szerkesztMuszak, statusz: e.target.value })}
                >
                  {['piszkozat', 'publikus', 'zárt', 'lezárt'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={muszakKuldes} onClick={muszakSzerkesztMent} className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-white disabled:opacity-50">
                {muszakKuldes ? 'Mentés…' : 'Mentés'}
              </button>
              <button type="button" onClick={() => setSzerkesztMuszak(null)} className="rounded-lg border px-4 py-2 text-sm">Mégse</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BeosztasJelenletekPage() {
  const [sorok, setSorok] = useState<BelsoJelenletSor[]>([]);
  const [projektek, setProjektek] = useState<Projekt[]>([]);
  const [projektId, setProjektId] = useState('');
  const [statuszSzuro, setStatuszSzuro] = useState('');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [szerkeszt, setSzerkeszt] = useState<BelsoJelenletSor | null>(null);
  const [modErkezes, setModErkezes] = useState('');
  const [modTavozas, setModTavozas] = useState('');
  const [modMegjegyzes, setModMegjegyzes] = useState('');
  const [mentes, setMentes] = useState(false);

  useEffect(() => {
    getProjektek()
      .then((d) => setProjektek(d.sorok))
      .catch(() => setProjektek([]));
  }, []);

  async function betolt() {
    setToltes(true);
    setHiba(null);
    try {
      const d = await getBelsoJelenletek({
        statusz: statuszSzuro || undefined,
        projekt_id: projektId ? Number(projektId) : undefined,
      });
      setSorok(d.sorok);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => setToltes(false));
  }, [statuszSzuro, projektId]);

  async function statuszModosit(id: number, statusz: 'pv_véglegesített' | 'elutasítva') {
    setMentes(true);
    try {
      await belsoJelenletModosit({ id, statusz });
      setSzerkeszt(null);
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  function szerkesztNyit(s: BelsoJelenletSor) {
    setSzerkeszt(s);
    setModErkezes(s.jelenlet.erkezes?.slice(0, 16) ?? '');
    setModTavozas(s.jelenlet.tavozas?.slice(0, 16) ?? '');
    setModMegjegyzes(s.jelenlet.megjegyzes ?? '');
    setHiba(null);
  }

  async function idoadatMent() {
    if (!szerkeszt) return;
    setMentes(true);
    try {
      await belsoJelenletModosit({
        id: szerkeszt.jelenlet.id,
        erkezes: modErkezes || null,
        tavozas: modTavozas || null,
        megjegyzes: modMegjegyzes || null,
      });
      setSzerkeszt(null);
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4">
        <SegmentBar active="jelenletek" />
        <h1 className="mt-3 text-xl font-bold text-navy">Beosztáskezelő — jelenléti ívek</h1>
        <p className="text-sm text-text-muted">
          Diákok digitális jelenlétei — jóváhagyás, szerkesztés. PV véglegesítés:{' '}
          <Link to="/belso/pv-munkaterulet" className="font-semibold text-gold hover:underline">
            PV munkaterület
          </Link>
          {' · '}
          Munkalaphoz rendelés:{' '}
          <Link to="/belso/berszamfejtes/jelenletek" className="font-semibold text-gold hover:underline">
            Bérszámfejtés → Jelenlétek
          </Link>
        </p>
      </div>

      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ProjektSzuro projektId={projektId} projektek={projektek} onChange={setProjektId} />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['', 'Minden státusz'],
              ['rögzített', 'Rögzített'],
              ['partner_jóváhagyva', 'Partner jóváhagyta'],
              ['pv_véglegesített', 'PV véglegesítette'],
              ['elutasítva', 'Elutasítva'],
            ] as const
          ).map(([s, label]) => (
            <button
              key={s || 'mind'}
              type="button"
              onClick={() => setStatuszSzuro(s)}
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold',
                statuszSzuro === s
                  ? 'bg-gold text-white'
                  : 'bg-cream-muted text-text-muted hover:bg-gold/10',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-muted text-left text-[11px] font-bold uppercase text-text-muted">
            <tr>
              <th className="px-2 py-2">Diák</th>
              <th className="px-2 py-2">Projekt</th>
              <th className="px-2 py-2">Dátum / műszak</th>
              <th className="px-2 py-2">Érkezés</th>
              <th className="px-2 py-2">Távozás</th>
              <th className="px-2 py-2">QR érkezés</th>
              <th className="px-2 py-2">QR távozás</th>
              <th className="px-2 py-2">GPS</th>
              <th className="px-2 py-2">Státusz</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {toltes ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-text-muted">
                  Betöltés…
                </td>
              </tr>
            ) : sorok.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-text-muted">
                  Nincs jelenlét a szűrőre.
                </td>
              </tr>
            ) : (
              sorok.map((s) => (
                <tr key={s.jelenlet.id} className="border-t border-border hover:bg-cream-muted/50">
                  <td className="px-2 py-2 font-medium">{s.diak_nev}</td>
                  <td className="px-2 py-2 text-xs">
                    {s.projekt_azonosito ?? '—'}
                    {s.projekt_nev ? (
                      <span className="block text-text-muted">{s.projekt_nev}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <p>{s.muszak.cim}</p>
                    <p className="text-text-muted">
                      {String(s.muszak.datum).slice(0, 10)} · {s.muszak.kezdet}–{s.muszak.vege}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-xs">{idoFormat(s.jelenlet.erkezes)}</td>
                  <td className="px-2 py-2 text-xs">{idoFormat(s.jelenlet.tavozas)}</td>
                  <td className="px-2 py-2 text-xs">{idoFormat(s.jelenlet.qrErkezes ?? null)}</td>
                  <td className="px-2 py-2 text-xs">{idoFormat(s.jelenlet.qrTavozas ?? null)}</td>
                  <td className="px-2 py-2 text-[10px] text-text-muted">
                    {s.jelenlet.gpsLat && s.jelenlet.gpsLng
                      ? `${Number(s.jelenlet.gpsLat).toFixed(4)}, ${Number(s.jelenlet.gpsLng).toFixed(4)}`
                      : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${jelenletStatuszBadge(s.jelenlet.statusz)}`}
                    >
                      {s.jelenlet.statusz}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    {(s.jelenlet.statusz === 'rögzített' ||
                      s.jelenlet.statusz === 'partner_jóváhagyva') && (
                      <>
                        <button
                          type="button"
                          disabled={mentes}
                          onClick={() => statuszModosit(s.jelenlet.id, 'pv_véglegesített')}
                          className="mr-2 text-xs font-semibold text-success hover:underline"
                        >
                          ✔
                        </button>
                        <button
                          type="button"
                          disabled={mentes}
                          onClick={() => statuszModosit(s.jelenlet.id, 'elutasítva')}
                          className="mr-2 text-xs font-semibold text-danger hover:underline"
                        >
                          ✕
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => szerkesztNyit(s)}
                      className="text-xs font-semibold text-gold hover:underline"
                    >
                      Szerk.
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {szerkeszt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="w-full max-w-md rounded-card border border-border bg-card p-5 shadow-lg">
            <h2 className="text-lg font-bold text-navy">Jelenlét szerkesztése</h2>
            <p className="mt-1 text-sm text-text-muted">
              {szerkeszt.diak_nev} — {String(szerkeszt.muszak.datum).slice(0, 10)}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-text-muted">Érkezés</span>
                <input
                  type="datetime-local"
                  value={modErkezes}
                  onChange={(e) => setModErkezes(e.target.value)}
                  className="field-input mt-1 w-full"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Távozás</span>
                <input
                  type="datetime-local"
                  value={modTavozas}
                  onChange={(e) => setModTavozas(e.target.value)}
                  className="field-input mt-1 w-full"
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Megjegyzés</span>
                <textarea
                  value={modMegjegyzes}
                  onChange={(e) => setModMegjegyzes(e.target.value)}
                  rows={2}
                  className="field-input mt-1 w-full"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSzerkeszt(null)}
                className="rounded-btn px-4 py-2 text-sm font-semibold text-text-muted hover:bg-cream-muted"
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={mentes}
                onClick={() => idoadatMent()}
                className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535] disabled:opacity-50"
              >
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
