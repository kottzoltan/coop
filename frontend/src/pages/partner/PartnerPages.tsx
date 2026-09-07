import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getPartnerBeosztas,
  getPartnerJelenletek,
  partnerJelenletModosit,
  partnerMegrendeles,
  partnerMuszakModosit,
  partnerMuszakTorol,
  type PartnerBeosztasCsoport,
  type PartnerJelenletSor,
  type PartnerMuszak,
} from '../../api/coop';

const MUNKAKOROK = [
  'Adminisztratív, irodai',
  'Fizikai, gyári, raktári',
  'Vendéglátás, gyorsétterem, turizmus',
  'Promóciós, host/hostess, animátor',
  'Üzlet, bolt, értékesítés',
];

function statuszBadge(statusz: string) {
  const map: Record<string, string> = {
    publikus: 'bg-success-bg text-success',
    piszkozat: 'bg-warning-bg text-warning',
    lezárt: 'bg-cream-muted text-text-muted',
    törölve: 'bg-danger-bg text-danger',
    rögzített: 'bg-warning-bg text-warning',
    jóváhagyva: 'bg-[#EAF1F7] text-[#2C7BD6]',
    partner_jóváhagyva: 'bg-[#EAF1F7] text-[#2C7BD6]',
    pv_véglegesített: 'bg-success-bg text-success',
    elutasítva: 'bg-danger-bg text-danger',
  };
  return map[statusz] ?? 'bg-cream-muted text-text-muted';
}

function formatIdo(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('hu-HU', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PartnerDashboard() {
  const { me } = useAuth();
  const [stats, setStats] = useState({
    fuggőJelenlet: 0,
    kovetkezo2Het: 0,
    nyitottIgeny: 0,
  });

  useEffect(() => {
    getPartnerBeosztas()
      .then((d) =>
        setStats({
          fuggőJelenlet: d.statistikak.fuggőJelenlet,
          kovetkezo2Het: d.statistikak.kovetkezo2Het,
          nyitottIgeny: d.muszakok.filter((m) => m.statusz === 'piszkozat').length,
        }),
      )
      .catch(() => {});
  }, []);

  const teendok = [
    stats.fuggőJelenlet > 0
      ? {
          cim: 'Jelenléti ív jóváhagyása',
          leiras: `${stats.fuggőJelenlet} rögzített jelenlét vár rád`,
          db: stats.fuggőJelenlet,
          link: '/partner/jelenletek',
        }
      : null,
    stats.nyitottIgeny > 0
      ? {
          cim: 'Piszkozat megrendelés',
          leiras: `${stats.nyitottIgeny} műszak még nincs publikálva`,
          db: stats.nyitottIgeny,
          link: '/partner/igeny',
        }
      : null,
  ].filter(Boolean) as Array<{ cim: string; leiras: string; db: number; link: string }>;

  const kartyak = [
    {
      cim: 'Függő jelenléti ívek',
      ertek: String(stats.fuggőJelenlet),
      leiras: 'Jóváhagyásra vár',
      link: '/partner/jelenletek',
    },
    {
      cim: 'Aktív beosztások',
      ertek: String(stats.kovetkezo2Het),
      leiras: 'A következő 2 hétben',
      link: '/partner/beosztas',
    },
    {
      cim: 'Piszkozat megrendelések',
      ertek: String(stats.nyitottIgeny),
      leiras: 'Még nem publikált műszak',
      link: '/partner/igeny',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Üdvözöljük a partnerfelületen!</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-body">
        Beosztások, megrendelések és jelenléti ívek kezelése
        {me?.partner?.cegnev ? ` — ${me.partner.cegnev}` : ''}.
      </p>

      {teendok.length > 0 && (
        <div className="mt-6 rounded-card border border-[#2C7BD6]/40 bg-card p-5">
          <h2 className="font-bold text-navy">Teendőid</h2>
          <p className="mt-1 text-xs text-text-muted">Jóváhagyásra vagy döntésre váró feladatok</p>
          <ul className="mt-4 space-y-2">
            {teendok.map((t) => (
              <li key={t.cim}>
                <Link
                  to={t.link}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition hover:border-[#2C7BD6]"
                >
                  <div>
                    <p className="font-semibold text-navy">{t.cim}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{t.leiras}</p>
                  </div>
                  <span className="rounded-full bg-[#EAF1F7] px-2.5 py-1 text-sm font-bold text-[#2C7BD6]">
                    {t.db}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {kartyak.map((k) => (
          <Link
            key={k.cim}
            to={k.link}
            className="rounded-card border border-border bg-card p-5 transition hover:border-[#2C7BD6]"
          >
            <p className="text-3xl font-bold text-[#2C7BD6]">{k.ertek}</p>
            <p className="mt-1 font-bold text-navy">{k.cim}</p>
            <p className="mt-1 text-xs text-text-muted">{k.leiras}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-border bg-card p-6">
        <h2 className="font-bold text-navy">Gyorsműveletek</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/partner/igeny"
            className="rounded-btn border border-[#2C7BD6] bg-[#2C7BD6] px-4 py-2 text-sm font-semibold text-white"
          >
            + Új megrendelés
          </Link>
          <Link
            to="/partner/jelenletek"
            className="rounded-btn border border-border-input bg-card px-4 py-2 text-sm font-semibold text-text-body"
          >
            Jelenléti ívek jóváhagyása
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PartnerBeosztasPage() {
  const [beosztasok, setBeosztasok] = useState<PartnerBeosztasCsoport[]>([]);
  const [muszakok, setMuszakok] = useState<PartnerMuszak[]>([]);
  const [stats, setStats] = useState({ osszesMuszak: 0, beosztottOsszesen: 0, kovetkezo2Het: 0 });
  const [lezarasOra, setLezarasOra] = useState(24);
  const [toltes, setToltes] = useState(true);
  const [nezet, setNezet] = useState<'lista' | 'naptar'>('lista');
  const [szerkeszt, setSzerkeszt] = useState<PartnerMuszak | null>(null);
  const [modKezdet, setModKezdet] = useState('');
  const [modVege, setModVege] = useState('');
  const [modLetszam, setModLetszam] = useState(1);
  const [modCim, setModCim] = useState('');
  const [modHely, setModHely] = useState('');
  const [modStatusz, setModStatusz] = useState<'piszkozat' | 'publikus' | 'zárt'>('publikus');
  const [mentes, setMentes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  async function betolt() {
    setToltes(true);
    try {
      const d = await getPartnerBeosztas();
      setBeosztasok(d.beosztasok);
      setMuszakok(d.muszakok);
      setStats({
        osszesMuszak: d.statistikak.osszesMuszak,
        beosztottOsszesen: d.statistikak.beosztottOsszesen,
        kovetkezo2Het: d.statistikak.kovetkezo2Het,
      });
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    getPartnerBeosztas()
      .then((d) => {
        setBeosztasok(d.beosztasok);
        setMuszakok(d.muszakok);
        setLezarasOra((d as { lezarasOra?: number }).lezarasOra ?? 24);
        setStats({
          osszesMuszak: d.statistikak.osszesMuszak,
          beosztottOsszesen: d.statistikak.beosztottOsszesen,
          kovetkezo2Het: d.statistikak.kovetkezo2Het,
        });
      })
      .finally(() => setToltes(false));
  }, []);

  function szerkesztNyit(m: PartnerMuszak) {
    setSzerkeszt(m);
    setModKezdet(m.kezdet);
    setModVege(m.vege);
    setModLetszam(m.letszamMegrendelt ?? 1);
    setModCim(m.cim);
    setModHely(m.hely ?? '');
    setModStatusz(
      m.statusz === 'piszkozat' || m.statusz === 'zárt' ? m.statusz : 'publikus',
    );
    setHiba(null);
  }

  async function muszakMent() {
    if (!szerkeszt) return;
    setMentes(true);
    setHiba(null);
    try {
      await partnerMuszakModosit({
        muszak_id: szerkeszt.id,
        kezdet: modKezdet,
        vege: modVege,
        letszam: modLetszam,
        cim: modCim,
        hely: modHely,
        statusz: modStatusz,
      });
      setSzerkeszt(null);
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  async function muszakTorol(m: PartnerMuszak) {
    if (!m.torolheto) return;
    if (!confirm(`Biztosan törli a műszakot? (${m.datum} ${m.kezdet}–${m.vege})`)) return;
    setHiba(null);
    try {
      await partnerMuszakTorol(m.id);
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Törlés sikertelen');
    }
  }

  const csoport = beosztasok[0];

  const hetiNaptar = useMemo(() => {
    const napok: Record<string, PartnerMuszak[]> = {};
    for (const m of muszakok) {
      const k = String(m.datum).slice(0, 10);
      (napok[k] ??= []).push(m);
    }
    return Object.entries(napok).sort(([a], [b]) => a.localeCompare(b));
  }, [muszakok]);

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Beosztáskezelő</h1>
          <p className="mt-1 text-sm text-text-body">
            Műszakok listája és naptár — szerkesztés és törlés a kezdés előtt {lezarasOra} órával
          </p>
        </div>
        <Link
          to="/partner/igeny"
          className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
        >
          + Új megrendelés
        </Link>
      </div>

      {csoport && (
        <div className="mt-6 rounded-card border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase text-text-muted">Beosztás</p>
          <h2 className="mt-1 text-lg font-bold text-navy">{csoport.nev}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {csoport.projekt_azonosito} · {csoport.projekt_nev} · {csoport.statusz}
          </p>
          {csoport.leiras && <p className="mt-2 text-sm text-text-body">{csoport.leiras}</p>}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-cream-muted p-3">
              <p className="text-xl font-bold text-navy">{stats.osszesMuszak}</p>
              <p className="text-[11px] text-text-muted">Összes műszak</p>
            </div>
            <div className="rounded-lg bg-cream-muted p-3">
              <p className="text-xl font-bold text-navy">{stats.kovetkezo2Het}</p>
              <p className="text-[11px] text-text-muted">Következő 2 hét</p>
            </div>
            <div className="rounded-lg bg-cream-muted p-3">
              <p className="text-xl font-bold text-navy">{stats.beosztottOsszesen}</p>
              <p className="text-[11px] text-text-muted">Beosztott diák</p>
            </div>
          </div>
        </div>
      )}

      {hiba && (
        <p className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>
      )}

      <div className="mt-4 flex gap-1 rounded-lg border border-border bg-cream-muted p-1">
        {(['lista', 'naptar'] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNezet(n)}
            className={[
              'flex-1 rounded-md px-3 py-2 text-xs font-semibold',
              nezet === n ? 'bg-card text-navy shadow-sm' : 'text-text-muted',
            ].join(' ')}
          >
            {n === 'lista' ? 'Listanézet' : 'Naptár nézet'}
          </button>
        ))}
      </div>

      {toltes ? (
        <p className="mt-6 text-sm text-text-muted">Betöltés…</p>
      ) : nezet === 'lista' ? (
        <table className="mt-4 w-full rounded-card border border-border bg-card text-sm">
          <thead>
            <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
              <th className="px-3 py-2">Dátum</th>
              <th className="px-3 py-2">Műszak</th>
              <th className="px-3 py-2">Idő</th>
              <th className="px-3 py-2">Létszám</th>
              <th className="px-3 py-2">Státusz</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {muszakok.map((m) => (
              <tr key={m.id} className="border-b border-border">
                <td className="px-3 py-2.5 whitespace-nowrap">{m.datum}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-navy">{m.cim}</p>
                  <p className="text-xs text-text-muted">{m.hely}</p>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {m.kezdet}–{m.vege}
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-semibold">{m.beosztott}</span>
                  <span className="text-text-muted"> / {m.letszamMegrendelt ?? 1}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={[
                      'rounded-md px-2 py-0.5 text-xs font-semibold',
                      statuszBadge(m.statusz),
                    ].join(' ')}
                  >
                    {m.statusz}
                  </span>
                  {m.muveletIndok && !m.modosithato && (
                    <p className="mt-1 text-[10px] text-text-muted">{m.muveletIndok}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {m.modosithato ? (
                    <button
                      type="button"
                      onClick={() => szerkesztNyit(m)}
                      className="mr-2 text-xs font-semibold text-[#2C7BD6] hover:underline"
                    >
                      szerk.
                    </button>
                  ) : (
                    <span className="mr-2 text-xs text-text-muted" title={m.muveletIndok ?? ''}>
                      —
                    </span>
                  )}
                  {m.torolheto ? (
                    <button
                      type="button"
                      onClick={() => muszakTorol(m)}
                      className="text-xs font-semibold text-danger hover:underline"
                    >
                      töröl
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-4 space-y-3">
          {hetiNaptar.map(([nap, lista]) => (
            <div key={nap} className="rounded-card border border-border bg-card p-4">
              <p className="text-sm font-bold text-navy">{nap}</p>
              <div className="mt-2 space-y-2">
                {lista.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream-muted px-3 py-2 text-sm"
                  >
                    <span>
                      {m.kezdet}–{m.vege} · {m.cim}
                    </span>
                    <span className="text-xs text-text-muted">
                      {m.beosztott}/{m.letszamMegrendelt} fő · {m.statusz}
                    </span>
                    {m.modosithato && (
                      <button
                        type="button"
                        onClick={() => szerkesztNyit(m)}
                        className="text-xs font-semibold text-[#2C7BD6] hover:underline"
                      >
                        szerk.
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {szerkeszt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setSzerkeszt(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-card bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="font-bold text-navy">Műszak szerkesztése</h3>
            <p className="mt-1 text-sm text-text-muted">
              {szerkeszt.datum} · {szerkeszt.beosztott} beosztott diák
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Megnevezés
                <input
                  className="field-input mt-1"
                  value={modCim}
                  onChange={(e) => setModCim(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Helyszín
                <input
                  className="field-input mt-1"
                  value={modHely}
                  onChange={(e) => setModHely(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Kezdet
                  <input
                    type="time"
                    className="field-input mt-1"
                    value={modKezdet}
                    onChange={(e) => setModKezdet(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Vég
                  <input
                    type="time"
                    className="field-input mt-1"
                    value={modVege}
                    onChange={(e) => setModVege(e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-sm">
                Létszám
                <input
                  type="number"
                  min={1}
                  className="field-input mt-1 w-24"
                  value={modLetszam}
                  onChange={(e) => setModLetszam(Number(e.target.value))}
                />
              </label>
              <label className="block text-sm">
                Állapot
                <select
                  className="field-input mt-1"
                  value={modStatusz}
                  onChange={(e) =>
                    setModStatusz(e.target.value as 'piszkozat' | 'publikus' | 'zárt')
                  }
                >
                  <option value="piszkozat">Piszkozat</option>
                  <option value="publikus">Publikus</option>
                  <option value="zárt">Zárt</option>
                </select>
              </label>
              {hiba && <p className="text-sm text-danger">{hiba}</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={muszakMent}
                disabled={mentes}
                className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {mentes ? 'Mentés…' : 'Mentés'}
              </button>
              <button
                type="button"
                onClick={() => setSzerkeszt(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PartnerIgenyPage() {
  const [beosztasok, setBeosztasok] = useState<PartnerBeosztasCsoport[]>([]);
  const [napok, setNapok] = useState<string[]>([]);
  const [kezdet, setKezdet] = useState('07:00');
  const [vege, setVege] = useState('11:00');
  const [letszam, setLetszam] = useState(2);
  const [munkakor, setMunkakor] = useState(MUNKAKOROK[0]);
  const [cim, setCim] = useState('Kertész gyakornok — megrendelés');
  const [hely, setHely] = useState('Budapest Expo tér');
  const [leiras, setLeiras] = useState('');
  const [kuldes, setKuldes] = useState(false);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);

  useEffect(() => {
    getPartnerBeosztas().then((d) => setBeosztasok(d.beosztasok)).catch(() => {});
    const ma = new Date();
    const alap: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date(ma);
      d.setDate(d.getDate() + i);
      alap.push(d.toISOString().slice(0, 10));
    }
    setNapok(alap);
  }, []);

  function napValtas(datum: string) {
    setNapok((prev) =>
      prev.includes(datum) ? prev.filter((d) => d !== datum) : [...prev, datum].sort(),
    );
  }

  async function leadas(e: React.FormEvent) {
    e.preventDefault();
    if (!napok.length) {
      setHiba('Válassz legalább egy napot.');
      return;
    }
    setKuldes(true);
    setHiba(null);
    setUzenet(null);
    try {
      const r = await partnerMegrendeles({
        napok,
        kezdet,
        vege,
        letszam,
        munkakor,
        cim,
        hely,
        leiras: leiras || undefined,
        beosztas_csoport_id: beosztasok[0]?.id,
      });
      setUzenet(`${r.count} műszak megrendelve — piszkozat státuszban. A projektvezető értesítést kap.`);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  const kovetkezoHet = useMemo(() => {
    const ma = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(ma);
      d.setDate(d.getDate() + i + 1);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-navy">Megrendelés leadása</h1>
      <p className="mt-2 text-sm text-text-body">
        Új műszakok rendelése — napok, időpont, létszám és munkakör megadásával (SAM
        partnerfelület).
      </p>

      <form onSubmit={leadas} className="mt-6 space-y-5 rounded-card border border-border bg-card p-6">
        <div>
          <p className="text-xs font-bold uppercase text-text-muted">Napok kiválasztása</p>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {kovetkezoHet.map((d) => {
              const aktiv = napok.includes(d);
              const dow = new Date(d).toLocaleDateString('hu-HU', { weekday: 'short' });
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => napValtas(d)}
                  className={[
                    'rounded-lg border px-1 py-2 text-center text-[11px] font-semibold transition-colors',
                    aktiv
                      ? 'border-[#2C7BD6] bg-[#EAF1F7] text-[#2C7BD6]'
                      : 'border-border bg-cream-muted text-text-muted hover:border-[#2C7BD6]/40',
                  ].join(' ')}
                >
                  <span className="block">{d.slice(5)}</span>
                  <span className="block text-[10px] font-normal">{dow}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-text-muted">{napok.length} nap kijelölve</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold text-navy">Műszak kezdete</span>
            <input
              type="time"
              className="field-input mt-1"
              value={kezdet}
              onChange={(e) => setKezdet(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-navy">Műszak vége</span>
            <input
              type="time"
              className="field-input mt-1"
              value={vege}
              onChange={(e) => setVege(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-semibold text-navy">Megrendelt létszám</span>
          <input
            type="number"
            min={1}
            max={50}
            className="field-input mt-1 w-24"
            value={letszam}
            onChange={(e) => setLetszam(Number(e.target.value))}
          />
        </label>

        <label className="block text-sm">
          <span className="font-semibold text-navy">Munkakör</span>
          <select
            className="field-input mt-1"
            value={munkakor}
            onChange={(e) => setMunkakor(e.target.value)}
          >
            {MUNKAKOROK.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold text-navy">Műszak megnevezése</span>
          <input className="field-input mt-1" value={cim} onChange={(e) => setCim(e.target.value)} />
        </label>

        <label className="block text-sm">
          <span className="font-semibold text-navy">Helyszín</span>
          <input className="field-input mt-1" value={hely} onChange={(e) => setHely(e.target.value)} />
        </label>

        <label className="block text-sm">
          <span className="font-semibold text-navy">Megjegyzés (opcionális)</span>
          <textarea
            className="field-input mt-1 min-h-[80px]"
            value={leiras}
            onChange={(e) => setLeiras(e.target.value)}
          />
        </label>

        {hiba && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}
        {uzenet && (
          <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">{uzenet}</p>
        )}

        <button
          type="submit"
          disabled={kuldes}
          className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {kuldes ? 'Leadás…' : `Megrendelés leadása (${napok.length} nap)`}
        </button>
      </form>
    </div>
  );
}

export function PartnerJelenletekPage() {
  const [sorok, setSorok] = useState<PartnerJelenletSor[]>([]);
  const [statuszSzuro, setStatuszSzuro] = useState('');
  const [toltes, setToltes] = useState(true);
  const [szerkeszt, setSzerkeszt] = useState<PartnerJelenletSor | null>(null);
  const [modErkezes, setModErkezes] = useState('');
  const [modTavozas, setModTavozas] = useState('');
  const [modMegjegyzes, setModMegjegyzes] = useState('');

  async function betolt() {
    setToltes(true);
    try {
      const d = await getPartnerJelenletek(statuszSzuro || undefined);
      setSorok(d.sorok);
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => setToltes(false));
  }, [statuszSzuro]);

  async function statuszModosit(id: number, statusz: 'partner_jóváhagyva' | 'elutasítva') {
    await partnerJelenletModosit({ id, statusz });
    setSzerkeszt(null);
    await betolt();
  }

  function szerkesztNyit(s: PartnerJelenletSor) {
    setSzerkeszt(s);
    setModErkezes(s.jelenlet.erkezes?.slice(0, 16) ?? '');
    setModTavozas(s.jelenlet.tavozas?.slice(0, 16) ?? '');
    setModMegjegyzes(s.jelenlet.megjegyzes ?? '');
  }

  async function idoadatMent() {
    if (!szerkeszt) return;
    await partnerJelenletModosit({
      id: szerkeszt.jelenlet.id,
      erkezes: modErkezes || null,
      tavozas: modTavozas || null,
      megjegyzes: modMegjegyzes || null,
    });
    setSzerkeszt(null);
    await betolt();
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-navy">Jelenléti ívek</h1>
      <p className="mt-2 text-sm text-text-body">
        Diákok digitálisan rögzített időadatai — áttekintés, szerkesztés, elfogadás vagy
        elutasítás.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
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
                ? 'bg-[#2C7BD6] text-white'
                : 'bg-cream-muted text-text-muted hover:bg-[#EAF1F7]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {toltes ? (
        <p className="mt-6 text-sm text-text-muted">Betöltés…</p>
      ) : sorok.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-border bg-cream-muted p-8 text-center text-sm text-text-muted">
          Nincs rögzített jelenlét a szűrőre.
        </div>
      ) : (
        <table className="mt-4 w-full rounded-card border border-border bg-card text-sm">
          <thead>
            <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
              <th className="px-3 py-2">Diák neve</th>
              <th className="px-3 py-2">Műszak</th>
              <th className="px-3 py-2">Munkanap</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">Stop</th>
              <th className="px-3 py-2">Státusz</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorok.map((s) => (
              <tr key={s.jelenlet.id} className="border-b border-border">
                <td className="px-3 py-2.5 font-medium text-navy">{s.diak_nev}</td>
                <td className="px-3 py-2.5 text-text-body">{s.muszak.cim}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{s.muszak.datum}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                  {formatIdo(s.jelenlet.erkezes)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                  {formatIdo(s.jelenlet.tavozas)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={[
                      'rounded-md px-2 py-0.5 text-xs font-semibold',
                      statuszBadge(s.jelenlet.statusz),
                    ].join(' ')}
                  >
                    {s.jelenlet.statusz}
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => szerkesztNyit(s)}
                    className="mr-2 text-xs font-semibold text-[#2C7BD6] hover:underline"
                  >
                    szerk.
                  </button>
                  {s.jelenlet.statusz === 'rögzített' && (
                    <>
                      <button
                        type="button"
                        onClick={() => statuszModosit(s.jelenlet.id, 'partner_jóváhagyva')}
                        className="mr-2 text-xs font-semibold text-success hover:underline"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => statuszModosit(s.jelenlet.id, 'elutasítva')}
                        className="text-xs font-semibold text-danger hover:underline"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {szerkeszt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setSzerkeszt(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-card bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="font-bold text-navy">Időadat szerkesztése</h3>
            <p className="mt-1 text-sm text-text-muted">{szerkeszt.diak_nev}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Érkezés
                <input
                  type="datetime-local"
                  className="field-input mt-1"
                  value={modErkezes}
                  onChange={(e) => setModErkezes(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Távozás
                <input
                  type="datetime-local"
                  className="field-input mt-1"
                  value={modTavozas}
                  onChange={(e) => setModTavozas(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Megjegyzés
                <textarea
                  className="field-input mt-1"
                  value={modMegjegyzes}
                  onChange={(e) => setModMegjegyzes(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={idoadatMent}
                className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-white"
              >
                Mentés
              </button>
              <button
                type="button"
                onClick={() => setSzerkeszt(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
