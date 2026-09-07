import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  CRM_STAGE_SZINEK,
  CRM_STATUSZOK,
  PARTNER_FELELOSOK,
  PARTNER_IRODAK,
  SZERZODES_STATUSZOK,
  SZERZODES_TIPUSOK,
  type CrmStatusz,
  type KapcsolattartoHozzaferes,
  type Partner,
  type PartnerKapcsolattarto,
  type PartnerKommunikacio,
  type PartnerSzerzodes,
} from '@coop/shared';
import {
  getCrmLeadek,
  getPartner,
  getPartnerSzerzodesek,
  getPartnerek,
  mentPartner,
  mentPartnerKapcsolattarto,
  partnerSzerzodesDokumentum,
  ujPartner,
  ujPartnerKapcsolattarto,
  ujPartnerKommunikacio,
  ujPartnerSzerzodes,
  ujProjekt,
} from '../../api/coop';
import { MuveletekMenu } from '../../components/belso/MuveletekMenu';
import {
  PartnerMeghivoKuldesModal,
  type PartnerMeghivoCel,
} from '../../components/belso/PartnerMeghivoKuldesModal';
import { letoltRiport } from '../../utils/riport';

const CRM_OSZLOPOK = CRM_STATUSZOK.filter((s) => s !== 'Megbízóvá alakítva');

function statuszBadge(statusz: string) {
  const map: Record<string, string> = {
    aktív: 'bg-success-bg text-success',
    inaktív: 'bg-danger-bg text-danger',
    aláírt: 'bg-success-bg text-success',
    piszkozat: 'bg-cream-muted text-text-muted',
    lejárt: 'bg-danger-bg text-danger',
    nyitva: 'bg-cream-muted text-text-muted',
    lezárva: 'bg-success-bg text-success',
  };
  return map[statusz] ?? 'bg-cream-muted text-text-muted';
}

function SegmentBar({ active }: { active: 'partnerek' | 'crm' | 'szerzodesek' }) {
  const base = 'rounded-lg px-4 py-2 text-sm font-semibold transition-colors';
  const activeCls = 'bg-card text-navy shadow-sm';
  const inactiveCls = 'text-text-muted hover:text-navy';
  return (
    <div className="inline-flex gap-0.5 rounded-btn bg-cream-muted p-1">
      <Link
        to="/belso/partnerek"
        className={`${base} ${active === 'partnerek' ? activeCls : inactiveCls}`}
      >
        Partnerek
      </Link>
      <Link
        to="/belso/partnerek/crm"
        className={`${base} ${active === 'crm' ? activeCls : inactiveCls}`}
      >
        CRM
      </Link>
      <Link
        to="/belso/partnerek/szerzodesek"
        className={`${base} ${active === 'szerzodesek' ? activeCls : inactiveCls}`}
      >
        Szerződések
      </Link>
    </div>
  );
}

function UjPartnerModal({
  nyitva,
  bezar,
  utana,
}: {
  nyitva: boolean;
  bezar: () => void;
  utana: (id: number) => void;
}) {
  const [nev, setNev] = useState('');
  const [ado, setAdo] = useState('');
  const [cim, setCim] = useState('');
  const [iroda, setIroda] = useState<string>(PARTNER_IRODAK[0]);
  const [ktNev, setKtNev] = useState('');
  const [ktEmail, setKtEmail] = useState('');
  const [ktTel, setKtTel] = useState('');
  const [ktHozzaferes, setKtHozzaferes] = useState('nincs');
  const [kuldes, setKuldes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  if (!nyitva) return null;

  async function mentes(e: React.FormEvent) {
    e.preventDefault();
    setKuldes(true);
    setHiba(null);
    try {
      const r = await ujPartner({
        nev,
        adoszam: ado,
        cim: cim || null,
        iroda,
        kt_nev: ktNev || undefined,
        kt_email: ktEmail || undefined,
        kt_mobil: ktTel || undefined,
        kt_hozzaferes: ktHozzaferes,
      });
      bezar();
      utana(r.partner.id);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form
        onSubmit={mentes}
        className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Új lead / partner</h2>
          <button type="button" onClick={bezar} className="text-text-muted hover:text-navy">
            ×
          </button>
        </div>
        {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase text-text-muted">
            Cégnév *
            <input
              required
              value={nev}
              onChange={(e) => setNev(e.target.value)}
              className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-text-muted">
            Adószám *
            <input
              required
              value={ado}
              onChange={(e) => setAdo(e.target.value)}
              className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-text-muted">
            Cím
            <input
              value={cim}
              onChange={(e) => setCim(e.target.value)}
              className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-text-muted">
            Iroda
            <select
              value={iroda}
              onChange={(e) => setIroda(e.target.value)}
              className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
            >
              {PARTNER_IRODAK.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold uppercase text-text-muted">
              Elsődleges kapcsolattartó
            </p>
            <div className="flex flex-col gap-2">
              <input
                placeholder="Név"
                value={ktNev}
                onChange={(e) => setKtNev(e.target.value)}
                className="rounded-btn border border-border-input px-3 py-2 text-sm"
              />
              <input
                placeholder="E-mail"
                value={ktEmail}
                onChange={(e) => setKtEmail(e.target.value)}
                className="rounded-btn border border-border-input px-3 py-2 text-sm"
              />
              <input
                placeholder="Telefonszám"
                value={ktTel}
                onChange={(e) => setKtTel(e.target.value)}
                className="rounded-btn border border-border-input px-3 py-2 text-sm"
              />
              <select
                value={ktHozzaferes}
                onChange={(e) => setKtHozzaferes(e.target.value)}
                className="rounded-btn border border-border-input px-3 py-2 text-sm"
              >
                <option value="nincs">Partnerfelület: nincs hozzáférés</option>
                <option value="olvasas">Partnerfelület: olvasási jog</option>
                <option value="iras">Partnerfelület: írási jog</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={bezar}
            className="rounded-btn border border-border-input px-4 py-2 text-sm font-semibold"
          >
            Mégse
          </button>
          <button
            type="submit"
            disabled={kuldes}
            className="rounded-btn bg-navy px-4 py-2 text-sm font-semibold text-cream hover:bg-navy-light disabled:opacity-50"
          >
            {kuldes ? 'Mentés…' : 'Létrehozás'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PartnerekListaPage() {
  const [sorok, setSorok] = useState<Partner[]>([]);
  const [osszes, setOsszes] = useState(0);
  const [keres, setKeres] = useState('');
  const [statusz, setStatusz] = useState('mind');
  const [iroda, setIroda] = useState('mind');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujNyitva, setUjNyitva] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      setToltes(true);
      getPartnerek({
        keres: keres || undefined,
        statusz: statusz !== 'mind' ? statusz : undefined,
        iroda: iroda !== 'mind' ? iroda : undefined,
      })
        .then((d) => {
          setSorok(d.sorok);
          setOsszes(d.osszes);
          setHiba(null);
        })
        .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
        .finally(() => setToltes(false));
    }, 200);
    return () => clearTimeout(t);
  }, [keres, statusz, iroda]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Partnerek</h1>
          <p className="text-sm text-text-muted">
            {sorok.length} partner a szűrésnek megfelelően · {osszes} összesen
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentBar active="partnerek" />
          <MuveletekMenu
            muveletek={[
              {
                label: 'Partner riport (CSV)',
                onClick: async () => {
                  try {
                    await letoltRiport('partnerek');
                  } catch (e) {
                    setHiba(e instanceof Error ? e.message : 'Riport hiba');
                  }
                },
              },
            ]}
          />
          <button
            type="button"
            onClick={() => setUjNyitva(true)}
            className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
          >
            + Új lead / partner
          </button>
        </div>
      </div>

      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-3 flex flex-wrap gap-2 rounded-card border border-border bg-card p-3">
        <input
          placeholder="Keresés cégnév vagy adószám alapján…"
          value={keres}
          onChange={(e) => setKeres(e.target.value)}
          className="min-w-[200px] flex-1 rounded-btn border border-border-input px-3 py-2 text-sm"
        />
        <select
          value={statusz}
          onChange={(e) => setStatusz(e.target.value)}
          className="rounded-btn border border-border-input px-3 py-2 text-sm"
        >
          <option value="mind">Minden státusz</option>
          <option value="aktív">aktív</option>
          <option value="inaktív">inaktív</option>
        </select>
        <select
          value={iroda}
          onChange={(e) => setIroda(e.target.value)}
          className="rounded-btn border border-border-input px-3 py-2 text-sm"
        >
          <option value="mind">Minden iroda</option>
          {PARTNER_IRODAK.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-muted text-left text-xs font-bold uppercase text-text-muted">
            <tr>
              <th className="px-3 py-2">Cégnév</th>
              <th className="px-3 py-2">Adószám</th>
              <th className="px-3 py-2">Kapcsolattartó</th>
              <th className="px-3 py-2">Iroda</th>
              <th className="px-3 py-2">Státusz</th>
            </tr>
          </thead>
          <tbody>
            {toltes ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                  Betöltés…
                </td>
              </tr>
            ) : sorok.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                  Nincs a szűrésnek megfelelő partner.
                </td>
              </tr>
            ) : (
              sorok.map((p) => {
                const primary = p.kapcsolattartok?.[0];
                const extra = (p.kapcsolattartok?.length ?? 0) - 1;
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/belso/partnerek/${p.id}`)}
                    className="cursor-pointer border-t border-border hover:bg-cream-muted/50"
                  >
                    <td className="px-3 py-2.5 font-semibold text-navy">{p.nev}</td>
                    <td className="px-3 py-2.5">{p.adoszam ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {primary?.nev ?? '—'}
                      {extra > 0 && (
                        <span className="ml-1 text-text-muted">+{extra}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{p.iroda}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statuszBadge(p.statusz)}`}
                      >
                        {p.statusz}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <UjPartnerModal
        nyitva={ujNyitva}
        bezar={() => setUjNyitva(false)}
        utana={(id) => navigate(`/belso/partnerek/${id}`)}
      />
    </div>
  );
}

export function CrmPage() {
  const [sorok, setSorok] = useState<Partner[]>([]);
  const [keres, setKeres] = useState('');
  const [felelos, setFelelos] = useState('mind');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujNyitva, setUjNyitva] = useState(false);
  const [huzottId, setHuzottId] = useState<number | null>(null);
  const navigate = useNavigate();

  const betolt = useCallback(() => {
    setToltes(true);
    getCrmLeadek({
      keres: keres || undefined,
      felelos: felelos !== 'mind' ? felelos : undefined,
    })
      .then((d) => {
        setSorok(d.sorok);
        setHiba(null);
      })
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [keres, felelos]);

  useEffect(() => {
    const t = setTimeout(betolt, 200);
    return () => clearTimeout(t);
  }, [betolt]);

  async function crmMozgat(partnerId: number, ujStatusz: CrmStatusz) {
    try {
      await mentPartner(partnerId, { crm_statusz: ujStatusz });
      betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  function onDrop(e: DragEvent, stage: CrmStatusz) {
    e.preventDefault();
    if (huzottId != null) crmMozgat(huzottId, stage);
    setHuzottId(null);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">CRM — érdeklődések</h1>
          <p className="text-sm text-text-muted">{sorok.length} aktív lead a pipeline-ban</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentBar active="crm" />
          <button
            type="button"
            onClick={() => setUjNyitva(true)}
            className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
          >
            + Új lead
          </button>
        </div>
      </div>

      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-3 flex flex-wrap gap-2 rounded-card border border-border bg-card p-3">
        <input
          placeholder="Keresés cégnév alapján…"
          value={keres}
          onChange={(e) => setKeres(e.target.value)}
          className="min-w-[200px] flex-1 rounded-btn border border-border-input px-3 py-2 text-sm"
        />
        <select
          value={felelos}
          onChange={(e) => setFelelos(e.target.value)}
          className="rounded-btn border border-border-input px-3 py-2 text-sm"
        >
          <option value="mind">Minden felelős</option>
          {PARTNER_FELELOSOK.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {toltes ? (
        <p className="text-text-muted">Betöltés…</p>
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
          {CRM_OSZLOPOK.map((stage) => {
            const items = sorok.filter((p) => p.crm_statusz === stage);
            const color = CRM_STAGE_SZINEK[stage];
            return (
              <div
                key={stage}
                className="flex w-56 shrink-0 flex-col rounded-card border border-border bg-cream-muted"
              >
                <div
                  className="flex items-center justify-between border-b border-border bg-card px-3 py-2 text-xs font-bold"
                  style={{ borderTop: `3px solid ${color}` }}
                >
                  <span>{stage}</span>
                  <span className="rounded-full bg-cream-muted px-2 py-0.5 text-[11px] text-text-muted">
                    {items.length}
                  </span>
                </div>
                <div
                  className="flex min-h-[80px] flex-col gap-2 p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, stage)}
                >
                  {items.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => setHuzottId(p.id)}
                      onDragEnd={() => setHuzottId(null)}
                      onClick={() => navigate(`/belso/partnerek/${p.id}`)}
                      className="cursor-grab rounded-lg border border-border bg-card p-2.5 hover:shadow-sm active:opacity-60"
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      <div className="text-sm font-semibold text-navy">{p.nev}</div>
                      {p.felelos && (
                        <div className="mt-1 text-[11px] text-text-muted">{p.felelos}</div>
                      )}
                      {p.utolso_kommunikacio ? (
                        <div className="mt-2 border-t border-border pt-2 text-[11px]">
                          <span className="font-semibold capitalize">
                            {p.utolso_kommunikacio.tipus}
                          </span>
                          {' · '}
                          {p.utolso_kommunikacio.datum}
                          <div className="text-text-muted">{p.utolso_kommunikacio.targy}</div>
                        </div>
                      ) : (
                        <div className="mt-2 border-t border-border pt-2 text-[11px] text-danger">
                          Még nincs rögzített kommunikáció
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="px-2 py-3 text-xs text-text-muted">Üres</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UjPartnerModal
        nyitva={ujNyitva}
        bezar={() => setUjNyitva(false)}
        utana={(id) => navigate(`/belso/partnerek/${id}`)}
      />
    </div>
  );
}

export function SzerzodesekPage() {
  const [sorok, setSorok] = useState<PartnerSzerzodes[]>([]);
  const [statusz, setStatusz] = useState('mind');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setToltes(true);
    getPartnerSzerzodesek({ statusz: statusz !== 'mind' ? statusz : undefined })
      .then((d) => {
        setSorok(d.sorok);
        setHiba(null);
      })
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [statusz]);

  async function dokumentumFeltolt(szerzodesId: number, fajl: File) {
    try {
      await partnerSzerzodesDokumentum(szerzodesId, fajl.name);
      const d = await getPartnerSzerzodesek({
        statusz: statusz !== 'mind' ? statusz : undefined,
      });
      setSorok(d.sorok);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Szerződések</h1>
          <p className="text-sm text-text-muted">
            {sorok.length} szerződés a szűrésnek megfelelően
          </p>
        </div>
        <SegmentBar active="szerzodesek" />
      </div>

      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-3 rounded-card border border-border bg-card p-3">
        <select
          value={statusz}
          onChange={(e) => setStatusz(e.target.value)}
          className="rounded-btn border border-border-input px-3 py-2 text-sm"
        >
          <option value="mind">Minden státusz</option>
          {SZERZODES_STATUSZOK.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-muted text-left text-xs font-bold uppercase text-text-muted">
            <tr>
              <th className="px-3 py-2">Partner</th>
              <th className="px-3 py-2">Típus</th>
              <th className="px-3 py-2">Státusz</th>
              <th className="px-3 py-2">Kezdete</th>
              <th className="px-3 py-2">Vége</th>
              <th className="px-3 py-2">Dokumentum</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {toltes ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                  Betöltés…
                </td>
              </tr>
            ) : (
              sorok.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/belso/partnerek/${s.partner_id}`)}
                  className="cursor-pointer border-t border-border hover:bg-cream-muted/50"
                >
                  <td className="px-3 py-2.5 font-semibold text-navy">{s.partner_nev}</td>
                  <td className="px-3 py-2.5">{s.tipus}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statuszBadge(s.statusz)}`}
                    >
                      {s.statusz}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{s.erv_kezdete ?? '—'}</td>
                  <td className="px-3 py-2.5">{s.erv_vege ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    {s.dokumentum_nev ? (
                      <span className="text-xs font-semibold text-success">
                        📄 {s.dokumentum_nev}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-danger">nincs dokumentum</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <label className="cursor-pointer text-text-muted hover:text-navy">
                      ⇪
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) dokumentumFeltolt(s.id, f);
                        }}
                      />
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PROFIL_TABOK = [
  ['alap', 'Alapadatok'],
  ['kapcsolattartok', 'Kapcsolattartók'],
  ['kommunikacio', 'Kommunikáció'],
  ['szerzodesek', 'Szerződések'],
  ['naplo', 'Változásnapló'],
] as const;

type ProfilTab = (typeof PROFIL_TABOK)[number][0];

const KOMM_SZIN: Record<string, string> = {
  ajánlat: '#2C5C8A',
  megbeszélés: '#6B4FA0',
  ügyfélértékelés: '#2F7A4E',
  reklamáció: '#B4402C',
  ticket: '#B4791F',
};

export function PartnerReszletPage() {
  const { id } = useParams();
  const partnerId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [tab, setTab] = useState<ProfilTab>('alap');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujKt, setUjKt] = useState(false);
  const [ujComm, setUjComm] = useState(false);
  const [ujSz, setUjSz] = useState(false);

  const vissza =
    location.pathname.includes('/crm') ? '/belso/partnerek/crm' : '/belso/partnerek';

  async function betolt() {
    setToltes(true);
    try {
      const d = await getPartner(partnerId);
      setPartner(d.partner);
      setHiba(null);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    if (partnerId) betolt();
  }, [partnerId]);

  async function megbizova() {
    try {
      const r = await mentPartner(partnerId, { megbizova: true });
      setPartner(r.partner);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function projektLetrehoz() {
    if (!partner) return;
    try {
      const r = await ujProjekt({
        nev: `${partner.nev} — projekt`,
        partner_id: partner.id,
        partner_nev: partner.nev,
        iroda: partner.iroda,
        statusz: 'aktív',
      });
      navigate(`/belso/projektek/${r.sor.id}`);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Projekt létrehozása sikertelen');
    }
  }

  if (toltes && !partner) {
    return (
      <div className="bg-cream p-6 text-text-muted">Betöltés…</div>
    );
  }

  if (!partner) {
    return (
      <div className="bg-cream p-6">
        <p className="text-danger">Partner nem található.</p>
        <Link to="/belso/partnerek" className="text-sm font-semibold text-[#2C7BD6]">
          ← Vissza
        </Link>
      </div>
    );
  }

  const kapcsolattartok = partner.kapcsolattartok ?? [];
  const kommunikacio = partner.kommunikacio ?? [];
  const szerzodesek = partner.szerzodesek ?? [];

  return (
    <div className="min-h-screen bg-cream p-6">
      <Link to={vissza} className="text-sm font-semibold text-[#2C7BD6] hover:underline">
        ← Vissza a listához
      </Link>

      {hiba && <p className="mt-2 text-sm text-danger">{hiba}</p>}

      <div className="mt-4 rounded-card border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-lg text-gold-light">
              🏢
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy">{partner.nev}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                {partner.kapcsolat_tipus === 'lead' ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: `${CRM_STAGE_SZINEK[partner.crm_statusz]}18`,
                      color: CRM_STAGE_SZINEK[partner.crm_statusz],
                    }}
                  >
                    {partner.crm_statusz}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#E6EEF6] px-2.5 py-0.5 text-xs font-semibold text-[#2C5C8A]">
                    Megbízó
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statuszBadge(partner.statusz)}`}
                >
                  {partner.statusz}
                </span>
                <span className="text-text-muted">
                  {partner.iroda}
                  {partner.adoszam && partner.adoszam !== '—' ? ` · ${partner.adoszam}` : ''}
                  {partner.felelos ? ` · felelős: ${partner.felelos}` : ''}
                </span>
              </div>
            </div>
          </div>
          {partner.kapcsolat_tipus === 'lead' ? (
            <button
              type="button"
              onClick={megbizova}
              className="rounded-btn bg-navy px-4 py-2 text-sm font-semibold text-cream hover:bg-navy-light"
            >
              → Megbízóvá alakítás
            </button>
          ) : (
            <button
              type="button"
              onClick={projektLetrehoz}
              className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
            >
              + Projekt létrehozása
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-1 border-b border-border">
          {PROFIL_TABOK.map(([tid, label]) => {
            const count =
              tid === 'kapcsolattartok'
                ? ` (${kapcsolattartok.length})`
                : tid === 'kommunikacio'
                  ? ` (${kommunikacio.length})`
                  : tid === 'szerzodesek'
                    ? ` (${szerzodesek.length})`
                    : '';
            return (
              <button
                key={tid}
                type="button"
                onClick={() => setTab(tid)}
                className={`border-b-2 px-3 py-2 text-sm font-semibold ${
                  tab === tid
                    ? 'border-gold text-navy'
                    : 'border-transparent text-text-muted hover:text-navy'
                }`}
              >
                {label}
                {count}
              </button>
            );
          })}
        </div>

        <div className="pt-5">
          {tab === 'alap' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Cégnév', partner.nev],
                ['Adószám', partner.adoszam ?? '—'],
                ['Iroda', partner.iroda],
                ['Cím', partner.cim ?? '—'],
                ['Létrehozva', partner.letrehozva.slice(0, 10)],
                ['Felelős', partner.felelos ?? '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs font-semibold uppercase text-text-muted">{label}</div>
                  <div className="mt-1 text-sm font-medium">{value}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'kapcsolattartok' && (
            <KapcsolattartokTab
              partnerId={partnerId}
              sorok={kapcsolattartok}
              ujNyitva={ujKt}
              setUjNyitva={setUjKt}
              frissit={betolt}
              setHiba={setHiba}
            />
          )}

          {tab === 'kommunikacio' && (
            <KommunikacioTab
              partnerId={partnerId}
              sorok={kommunikacio}
              ujNyitva={ujComm}
              setUjNyitva={setUjComm}
              frissit={betolt}
              setHiba={setHiba}
            />
          )}

          {tab === 'szerzodesek' && (
            <SzerzodesekTab
              partnerId={partnerId}
              partnerNev={partner.nev}
              sorok={szerzodesek}
              ujNyitva={ujSz}
              setUjNyitva={setUjSz}
              frissit={betolt}
              setHiba={setHiba}
            />
          )}

          {tab === 'naplo' && (
            <div className="flex flex-col gap-2 text-sm">
              <div className="rounded-lg border border-border px-3 py-2">
                <b>{partner.letrehozva.slice(0, 10)}</b> — Partner létrehozva
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KapcsolattartokTab({
  partnerId,
  sorok,
  ujNyitva,
  setUjNyitva,
  frissit,
  setHiba,
}: {
  partnerId: number;
  sorok: PartnerKapcsolattarto[];
  ujNyitva: boolean;
  setUjNyitva: (v: boolean) => void;
  frissit: () => void;
  setHiba: (v: string | null) => void;
}) {
  const accessLabel = { nincs: 'Nincs hozzáférés', olvasas: 'Olvasási jog', iras: 'Írási jog' };
  const [meghivoCel, setMeghivoCel] = useState<PartnerMeghivoCel | null>(null);
  const [szerkeszt, setSzerkeszt] = useState<PartnerKapcsolattarto | null>(null);
  const [mutatInaktiv, setMutatInaktiv] = useState(false);

  const lathato = mutatInaktiv ? sorok : sorok.filter((k) => k.aktiv !== false);

  async function inaktivva(kt: PartnerKapcsolattarto) {
    if (!confirm(`${kt.nev} inaktívvá tétele? A történeti adatok megmaradnak.`)) return;
    try {
      await mentPartnerKapcsolattarto({ id: kt.id, aktiv: false });
      frissit();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function aktivva(kt: PartnerKapcsolattarto) {
    try {
      await mentPartnerKapcsolattarto({ id: kt.id, aktiv: true });
      frissit();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-sm text-text-body">
        <input
          type="checkbox"
          checked={mutatInaktiv}
          onChange={(e) => setMutatInaktiv(e.target.checked)}
        />
        Inaktív kapcsolattartók mutatása
      </label>
      <div className="flex max-w-xl flex-col gap-3">
        {lathato.map((k) => (
          <div
            key={k.id}
            className={[
              'flex items-center gap-3 rounded-lg border p-3',
              k.aktiv === false ? 'border-dashed border-border bg-cream-muted opacity-75' : 'border-border',
            ].join(' ')}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-gold-light">
              {k.nev
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                {k.nev}
                {k.aktiv === false && (
                  <span className="rounded-full bg-cream-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                    Inaktív
                  </span>
                )}
                {k.beosztas && (
                  <span className="text-xs font-normal text-text-muted">{k.beosztas}</span>
                )}
                {k.szamlazasi && (
                  <span className="rounded-full bg-[#FBF0DF] px-2 py-0.5 text-[11px] font-semibold text-[#B4791F]">
                    Számlázási kapcsolattartó
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-text-body">
                {k.email && `📧 ${k.email}`}
                {k.mobil && ` · 📞 ${k.mobil}`}
              </div>
              <div className="mt-1 text-xs font-semibold text-gold">
                Partnerfelület: {accessLabel[k.hozzaferes]}
              </div>
              {k.megjegyzes && (
                <div className="mt-1 text-xs italic text-text-muted">{k.megjegyzes}</div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {k.email && k.aktiv !== false && (
                <button
                  type="button"
                  onClick={() =>
                    setMeghivoCel({
                      email: k.email!,
                      nev: k.nev,
                      forras: 'partner_crm',
                      partner_id: partnerId,
                      partner_kapcsolattarto_id: k.id,
                      hozzaferes:
                        k.hozzaferes === 'olvasas' || k.hozzaferes === 'iras'
                          ? k.hozzaferes
                          : 'iras',
                    })
                  }
                  className="rounded-btn border border-[#2C7BD6] px-2.5 py-1 text-[11px] font-semibold text-[#2C7BD6]"
                >
                  Meghívó
                </button>
              )}
              <button
                type="button"
                onClick={() => setSzerkeszt(k)}
                className="text-[11px] font-semibold text-gold hover:underline"
              >
                Szerkesztés
              </button>
              {k.aktiv === false ? (
                <button
                  type="button"
                  onClick={() => aktivva(k)}
                  className="text-[11px] font-semibold text-success hover:underline"
                >
                  Aktívvá
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => inaktivva(k)}
                  className="text-[11px] font-semibold text-text-muted hover:text-danger"
                >
                  Inaktívvá
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setUjNyitva(true)}
        className="mt-3 rounded-btn border border-border-input px-3 py-1.5 text-xs font-semibold"
      >
        + Új kapcsolattartó
      </button>
      {ujNyitva && (
        <UjKapcsolattartoModal
          partnerId={partnerId}
          bezar={() => setUjNyitva(false)}
          utana={() => {
            setUjNyitva(false);
            frissit();
          }}
          setHiba={setHiba}
        />
      )}
      <PartnerMeghivoKuldesModal
        open={!!meghivoCel}
        cel={meghivoCel}
        onClose={() => setMeghivoCel(null)}
      />
      {szerkeszt && (
        <KapcsolattartoSzerkesztesModal
          kapcsolattarto={szerkeszt}
          bezar={() => setSzerkeszt(null)}
          utana={() => {
            setSzerkeszt(null);
            frissit();
          }}
          setHiba={setHiba}
        />
      )}
    </div>
  );
}

function HozzaferesValaszto({
  value,
  onChange,
}: {
  value: KapcsolattartoHozzaferes;
  onChange: (v: KapcsolattartoHozzaferes) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as KapcsolattartoHozzaferes)}
      className="rounded-btn border border-border-input px-3 py-2 text-sm"
    >
      <option value="nincs">Partnerfelület: nincs hozzáférés</option>
      <option value="olvasas">Partnerfelület: olvasási jog</option>
      <option value="iras">Partnerfelület: írási jog</option>
    </select>
  );
}

function KapcsolattartoSzerkesztesModal({
  kapcsolattarto,
  bezar,
  utana,
  setHiba,
}: {
  kapcsolattarto: PartnerKapcsolattarto;
  bezar: () => void;
  utana: () => void;
  setHiba: (v: string | null) => void;
}) {
  const [nev, setNev] = useState(kapcsolattarto.nev);
  const [email, setEmail] = useState(kapcsolattarto.email ?? '');
  const [mobil, setMobil] = useState(kapcsolattarto.mobil ?? '');
  const [beosztas, setBeosztas] = useState(kapcsolattarto.beosztas ?? '');
  const [hozzaferes, setHozzaferes] = useState<KapcsolattartoHozzaferes>(kapcsolattarto.hozzaferes);
  const [szamlazasi, setSzamlazasi] = useState(kapcsolattarto.szamlazasi);
  const [megjegyzes, setMegjegyzes] = useState(kapcsolattarto.megjegyzes ?? '');
  const [kuldes, setKuldes] = useState(false);

  async function mentes(e: React.FormEvent) {
    e.preventDefault();
    setKuldes(true);
    try {
      await mentPartnerKapcsolattarto({
        id: kapcsolattarto.id,
        nev,
        email,
        mobil,
        beosztas,
        hozzaferes,
        szamlazasi,
        megjegyzes,
      });
      utana();
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form
        onSubmit={mentes}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card border border-border bg-card p-5 shadow-lg"
      >
        <h3 className="mb-3 font-bold text-navy">Kapcsolattartó szerkesztése</h3>
        <div className="flex flex-col gap-2">
          <input
            required
            placeholder="Név *"
            value={nev}
            onChange={(e) => setNev(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <input
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <input
            placeholder="Mobil"
            value={mobil}
            onChange={(e) => setMobil(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <input
            placeholder="Beosztás"
            value={beosztas}
            onChange={(e) => setBeosztas(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <HozzaferesValaszto value={hozzaferes} onChange={setHozzaferes} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={szamlazasi} onChange={(e) => setSzamlazasi(e.target.checked)} />
            Számlázási kapcsolattartó
          </label>
          <textarea
            placeholder="Megjegyzés"
            value={megjegyzes}
            onChange={(e) => setMegjegyzes(e.target.value)}
            className="min-h-[60px] rounded-btn border border-border-input px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={bezar} className="rounded-btn border px-3 py-1.5 text-sm">
            Mégse
          </button>
          <button
            type="submit"
            disabled={kuldes}
            className="rounded-btn bg-navy px-3 py-1.5 text-sm text-cream disabled:opacity-50"
          >
            {kuldes ? 'Mentés…' : 'Mentés'}
          </button>
        </div>
      </form>
    </div>
  );
}

function UjKapcsolattartoModal({
  partnerId,
  bezar,
  utana,
  setHiba,
}: {
  partnerId: number;
  bezar: () => void;
  utana: () => void;
  setHiba: (v: string | null) => void;
}) {
  const [nev, setNev] = useState('');
  const [email, setEmail] = useState('');
  const [mobil, setMobil] = useState('');
  const [beosztas, setBeosztas] = useState('');
  const [hozzaferes, setHozzaferes] = useState<KapcsolattartoHozzaferes>('nincs');
  const [szamlazasi, setSzamlazasi] = useState(false);
  const [kuldes, setKuldes] = useState(false);

  async function mentes(e: React.FormEvent) {
    e.preventDefault();
    setKuldes(true);
    try {
      await ujPartnerKapcsolattarto({
        partner_id: partnerId,
        nev,
        email,
        mobil,
        beosztas,
        hozzaferes,
        szamlazasi,
      });
      utana();
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form
        onSubmit={mentes}
        className="w-full max-w-sm rounded-card border border-border bg-card p-5 shadow-lg"
      >
        <h3 className="mb-3 font-bold text-navy">Új kapcsolattartó</h3>
        <div className="flex flex-col gap-2">
          <input
            required
            placeholder="Név *"
            value={nev}
            onChange={(e) => setNev(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <input
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <input
            placeholder="Mobil"
            value={mobil}
            onChange={(e) => setMobil(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <input
            placeholder="Beosztás"
            value={beosztas}
            onChange={(e) => setBeosztas(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <HozzaferesValaszto value={hozzaferes} onChange={setHozzaferes} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={szamlazasi} onChange={(e) => setSzamlazasi(e.target.checked)} />
            Számlázási kapcsolattartó
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={bezar} className="rounded-btn border px-3 py-1.5 text-sm">
            Mégse
          </button>
          <button
            type="submit"
            disabled={kuldes}
            className="rounded-btn bg-navy px-3 py-1.5 text-sm text-cream disabled:opacity-50"
          >
            Hozzáadás
          </button>
        </div>
      </form>
    </div>
  );
}

function KommunikacioTab({
  partnerId,
  sorok,
  ujNyitva,
  setUjNyitva,
  frissit,
  setHiba,
}: {
  partnerId: number;
  sorok: PartnerKommunikacio[];
  ujNyitva: boolean;
  setUjNyitva: (v: boolean) => void;
  frissit: () => void;
  setHiba: (v: string | null) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setUjNyitva(true)}
          className="rounded-btn border border-border-input px-3 py-1.5 text-xs font-semibold"
        >
          + Új bejegyzés
        </button>
      </div>
      <div className="max-w-2xl">
        {sorok.length === 0 ? (
          <p className="text-sm text-text-muted">Ehhez a partnerhez még nincs kommunikáció.</p>
        ) : (
          sorok.map((c) => {
            const color = KOMM_SZIN[c.tipus] ?? '#6B7286';
            return (
              <div key={c.id} className="flex gap-3 border-b border-border py-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ background: `${color}18`, color }}
                >
                  •
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">{c.targy}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
                      style={{ background: `${color}18`, color }}
                    >
                      {c.tipus}
                    </span>
                    {c.statusz && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statuszBadge(c.statusz)}`}
                      >
                        {c.statusz}
                      </span>
                    )}
                  </div>
                  {c.leiras && (
                    <p className="mt-1 text-sm leading-relaxed text-text-body">{c.leiras}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    {c.datum}
                    {c.szerzo ? ` · ${c.szerzo}` : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      {ujNyitva && (
        <UjKommunikacioModal
          partnerId={partnerId}
          bezar={() => setUjNyitva(false)}
          utana={() => {
            setUjNyitva(false);
            frissit();
          }}
          setHiba={setHiba}
        />
      )}
    </div>
  );
}

function UjKommunikacioModal({
  partnerId,
  bezar,
  utana,
  setHiba,
}: {
  partnerId: number;
  bezar: () => void;
  utana: () => void;
  setHiba: (v: string | null) => void;
}) {
  const [tipus, setTipus] = useState('ajánlat');
  const [targy, setTargy] = useState('');
  const [leiras, setLeiras] = useState('');
  const [statusz, setStatusz] = useState('nyitva');
  const [kuldes, setKuldes] = useState(false);
  const statuszKell = tipus === 'reklamáció' || tipus === 'ticket';

  async function mentes(e: React.FormEvent) {
    e.preventDefault();
    setKuldes(true);
    try {
      await ujPartnerKommunikacio({
        partner_id: partnerId,
        tipus,
        targy,
        leiras,
        ...(statuszKell ? { statusz } : {}),
      });
      utana();
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form
        onSubmit={mentes}
        className="w-full max-w-md rounded-card border border-border bg-card p-5 shadow-lg"
      >
        <h3 className="mb-3 font-bold text-navy">Új kommunikációs bejegyzés</h3>
        <div className="flex flex-col gap-3">
          <select
            value={tipus}
            onChange={(e) => setTipus(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          >
            <option value="ajánlat">Ajánlat</option>
            <option value="megbeszélés">Megbeszélés</option>
            <option value="ügyfélértékelés">Ügyfélértékelő megbeszélés</option>
            <option value="reklamáció">Reklamáció</option>
            <option value="ticket">Ticket</option>
          </select>
          <input
            required
            placeholder="Tárgy *"
            value={targy}
            onChange={(e) => setTargy(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Leírás"
            rows={3}
            value={leiras}
            onChange={(e) => setLeiras(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          />
          {statuszKell && (
            <select
              value={statusz}
              onChange={(e) => setStatusz(e.target.value)}
              className="rounded-btn border border-border-input px-3 py-2 text-sm"
            >
              <option value="nyitva">Nyitva</option>
              <option value="lezárva">Lezárva</option>
            </select>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={bezar} className="rounded-btn border px-3 py-1.5 text-sm">
            Mégse
          </button>
          <button
            type="submit"
            disabled={kuldes}
            className="rounded-btn bg-navy px-3 py-1.5 text-sm text-cream disabled:opacity-50"
          >
            Mentés
          </button>
        </div>
      </form>
    </div>
  );
}

function SzerzodesekTab({
  partnerId,
  partnerNev,
  sorok,
  ujNyitva,
  setUjNyitva,
  frissit,
  setHiba,
}: {
  partnerId: number;
  partnerNev: string;
  sorok: PartnerSzerzodes[];
  ujNyitva: boolean;
  setUjNyitva: (v: boolean) => void;
  frissit: () => void;
  setHiba: (v: string | null) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setUjNyitva(true)}
          className="rounded-btn border border-border-input px-3 py-1.5 text-xs font-semibold"
        >
          + Új szerződés
        </button>
      </div>
      <div className="overflow-hidden rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-cream-muted text-left text-xs font-bold uppercase text-text-muted">
            <tr>
              <th className="px-3 py-2">Típus</th>
              <th className="px-3 py-2">Státusz</th>
              <th className="px-3 py-2">Kezdete</th>
              <th className="px-3 py-2">Vége</th>
              <th className="px-3 py-2">Dokumentum</th>
            </tr>
          </thead>
          <tbody>
            {sorok.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                  Ehhez a partnerhez még nincs szerződés.
                </td>
              </tr>
            ) : (
              sorok.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold text-navy">{s.tipus}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statuszBadge(s.statusz)}`}
                    >
                      {s.statusz}
                    </span>
                  </td>
                  <td className="px-3 py-2">{s.erv_kezdete ?? '—'}</td>
                  <td className="px-3 py-2">{s.erv_vege ?? '—'}</td>
                  <td className="px-3 py-2">
                    {s.dokumentum_nev ? (
                      <span className="text-xs font-semibold text-success">
                        📄 {s.dokumentum_nev}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-danger">nincs dokumentum</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {ujNyitva && (
        <UjSzerzodesModal
          partnerId={partnerId}
          partnerNev={partnerNev}
          bezar={() => setUjNyitva(false)}
          utana={() => {
            setUjNyitva(false);
            frissit();
          }}
          setHiba={setHiba}
        />
      )}
    </div>
  );
}

function UjSzerzodesModal({
  partnerId,
  partnerNev,
  bezar,
  utana,
  setHiba,
}: {
  partnerId: number;
  partnerNev: string;
  bezar: () => void;
  utana: () => void;
  setHiba: (v: string | null) => void;
}) {
  const [tipus, setTipus] = useState<string>(SZERZODES_TIPUSOK[0]);
  const [kezdete, setKezdete] = useState('');
  const [vege, setVege] = useState('');
  const [kuldes, setKuldes] = useState(false);

  async function mentes(e: React.FormEvent) {
    e.preventDefault();
    setKuldes(true);
    try {
      await ujPartnerSzerzodes({
        partner_id: partnerId,
        tipus,
        erv_kezdete: kezdete,
        erv_vege: vege || undefined,
      });
      utana();
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form
        onSubmit={mentes}
        className="w-full max-w-md rounded-card border border-border bg-card p-5 shadow-lg"
      >
        <h3 className="mb-1 font-bold text-navy">Új szerződés</h3>
        <p className="mb-3 text-sm text-text-muted">{partnerNev}</p>
        <div className="flex flex-col gap-3">
          <select
            value={tipus}
            onChange={(e) => setTipus(e.target.value)}
            className="rounded-btn border border-border-input px-3 py-2 text-sm"
          >
            {SZERZODES_TIPUSOK.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              required
              type="date"
              value={kezdete}
              onChange={(e) => setKezdete(e.target.value)}
              className="flex-1 rounded-btn border border-border-input px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={vege}
              onChange={(e) => setVege(e.target.value)}
              className="flex-1 rounded-btn border border-border-input px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={bezar} className="rounded-btn border px-3 py-1.5 text-sm">
            Mégse
          </button>
          <button
            type="submit"
            disabled={kuldes}
            className="rounded-btn bg-navy px-3 py-1.5 text-sm text-cream disabled:opacity-50"
          >
            Létrehozás
          </button>
        </div>
      </form>
    </div>
  );
}
