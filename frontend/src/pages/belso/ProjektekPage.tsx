import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getProjektek,
  getProjekt,
  patchProjektMeta,
  addProjektSzereplok,
  deleteProjektSzereplo,
  ujProjekt,
  getPartnerSzerzodesek,
  getPartnerek,
  type Projekt,
  type ProjektReszletValasz,
  type UjSzereploInput,
  type ProjektSorPatch,
} from '../../api/coop';
import { PRIORITASOK, PROJEKT_STATUSZOK, type FedezetOsszesito, type ProjektMetaPayload } from '@coop/shared';
import { ProjektAlapTab } from '../../components/belso/projekt/ProjektAlapTab';
import { ProjektDijakTab } from '../../components/belso/projekt/ProjektDijakTab';
import { ProjektKapcsolattartokTab } from '../../components/belso/projekt/ProjektKapcsolattartokTab';
import { ProjektDokumentumokTab } from '../../components/belso/projekt/ProjektDokumentumokTab';
import { ProjektKoltsegekTab } from '../../components/belso/projekt/ProjektKoltsegekTab';
import { ProjektKifizetesekTab } from '../../components/belso/projekt/ProjektKifizetesekTab';
import { ProjektTeljesitesTab } from '../../components/belso/projekt/ProjektTeljesitesTab';
import { ProjektSzereplokTab } from '../../components/belso/projekt/ProjektSzereplokTab';
import { ft } from '../../components/belso/projekt/utils';
import { MuveletekMenu } from '../../components/belso/MuveletekMenu';
import { SzerzodesSablonFeltolto } from '../../components/belso/SzerzodesSablonFeltolto';
import { letoltRiport } from '../../utils/riport';

const TABS = [
  { id: 'alap', label: 'Alap adatok' },
  { id: 'kapcsolattartok', label: 'Kapcsolattartók' },
  { id: 'szereplok', label: 'Szereplők' },
  { id: 'dijak', label: 'Díjak' },
  { id: 'hirdetesek', label: 'Hirdetések' },
  { id: 'koltsegek', label: 'Költségek' },
  { id: 'eseti', label: 'Eseti szerződések' },
  { id: 'szerzodesek', label: 'Szerződések' },
  { id: 'teljesites', label: 'Teljesítés igazolások' },
  { id: 'kifizetesek', label: 'Kifizetések' },
  { id: 'dokumentumok', label: 'Dokumentumok' },
  { id: 'fedezet', label: 'Fedezet' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ProjektekListaPage() {
  const [sorok, setSorok] = useState<Projekt[]>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [keres, setKeres] = useState('');
  const [statusz, setStatusz] = useState('mind');
  const [riportToltes, setRiportToltes] = useState(false);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [ujNyitva, setUjNyitva] = useState(false);
  const navigate = useNavigate();

  async function riportLetoltes(tipus: 'projekt-lista' | 'teljesites-osszesito') {
    setRiportToltes(true);
    setUzenet(null);
    try {
      await letoltRiport(tipus);
      setUzenet('Riport letöltve.');
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Riport hiba');
    } finally {
      setRiportToltes(false);
    }
  }

  useEffect(() => {
    getProjektek()
      .then((d) => setSorok(d.sorok))
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, []);

  const szurt = useMemo(() => {
    const q = keres.toLowerCase();
    return sorok.filter((p) => {
      if (statusz !== 'mind' && p.statusz !== statusz) return false;
      if (
        q &&
        !p.nev.toLowerCase().includes(q) &&
        !p.azonosito.toLowerCase().includes(q) &&
        !(p.partner_nev ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [sorok, keres, statusz]);

  return (
    <div className="h-screen overflow-auto bg-cream p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Projektek</h1>
          <p className="mt-1 text-sm text-text-muted">
            Élő adatbázis — fedezet, díjak, hirdetések és riportok
          </p>
          {uzenet && <p className="mt-1 text-xs font-semibold text-success">{uzenet}</p>}
        </div>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setUjNyitva(true)}
            className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
          >
            + Új projekt
          </button>
          <MuveletekMenu
            muveletek={[
              {
                label: 'Projekt lista export (CSV)',
                onClick: () => riportLetoltes('projekt-lista'),
                disabled: riportToltes,
              },
              {
                label: 'Teljesítés összesítő export (CSV)',
                onClick: () => riportLetoltes('teljesites-osszesito'),
                disabled: riportToltes,
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={keres}
          onChange={(e) => setKeres(e.target.value)}
          placeholder="Keresés azonosító, név vagy partner alapján…"
          className="field-input min-w-[240px] flex-1"
        />
        <select
          value={statusz}
          onChange={(e) => setStatusz(e.target.value)}
          className="field-input w-auto"
        >
          <option value="mind">Minden státusz</option>
          <option value="aktív">aktív</option>
          <option value="inaktív">inaktív</option>
        </select>
      </div>

      {toltes ? (
        <p className="mt-6 text-sm text-text-muted">Betöltés…</p>
      ) : hiba ? (
        <p className="mt-6 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>
      ) : (
        <table className="mt-4 w-full rounded-card border border-border bg-card text-sm">
          <thead>
            <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
              <th className="px-3 py-2">Azonosító</th>
              <th className="px-3 py-2">Név</th>
              <th className="px-3 py-2">Partner</th>
              <th className="px-3 py-2">Iroda</th>
              <th className="px-3 py-2">Prioritás</th>
              <th className="px-3 py-2">Hirdetések</th>
              <th className="px-3 py-2">Jelentkezők</th>
              <th className="px-3 py-2">Fedezet</th>
              <th className="px-3 py-2">Státusz</th>
            </tr>
          </thead>
          <tbody>
            {szurt.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer border-b border-border hover:bg-cream-muted/50"
                onClick={() => navigate(`/belso/projektek/${p.id}`)}
              >
                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gold">{p.azonosito}</td>
                <td className="px-3 py-2.5 font-medium text-navy">{p.nev}</td>
                <td className="px-3 py-2.5 text-text-muted">{p.partner_nev ?? '—'}</td>
                <td className="px-3 py-2.5">{p.iroda ?? '—'}</td>
                <td className="px-3 py-2.5 text-xs">{p.prioritas ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <span className="font-semibold">{p.aktiv_hirdetes ?? 0}</span>
                  <span className="text-text-muted"> / {p.hirdetes_szam ?? 0}</span>
                </td>
                <td
                  className="px-3 py-2.5"
                  onClick={(e) => {
                    if ((p.jelentkezok ?? 0) > 0) {
                      e.stopPropagation();
                      navigate(`/belso/projektek/${p.id}?tab=hirdetesek`);
                    }
                  }}
                >
                  <span
                    className={[
                      'inline-flex items-center gap-1 font-semibold',
                      (p.jelentkezok ?? 0) > 0
                        ? 'cursor-pointer text-[#2C7BD6] hover:underline'
                        : 'text-text-muted',
                    ].join(' ')}
                  >
                    👥 {p.jelentkezok ?? 0}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-semibold tabular-nums">
                  {p.fedezet != null ? (
                    <span className={p.fedezet.fedezet >= 0 ? 'text-success' : 'text-danger'}>
                      {ft(p.fedezet.fedezet)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-md bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                    {p.statusz}
                  </span>
                </td>
              </tr>
            ))}
            {szurt.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-text-muted">
                  Nincs találat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-text-muted">
        {szurt.length} projekt · {sorok.length} összesen
      </p>
      <UjProjektModal
        nyitva={ujNyitva}
        bezar={() => setUjNyitva(false)}
        onLetrehoz={(projektId) => {
          setUjNyitva(false);
          navigate(`/belso/projektek/${projektId}`);
        }}
      />
    </div>
  );
}

function UjProjektModal({
  nyitva,
  bezar,
  onLetrehoz,
}: {
  nyitva: boolean;
  bezar: () => void;
  onLetrehoz: (projektId: number) => void;
}) {
  const [nev, setNev] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [partnerek, setPartnerek] = useState<Array<{ id: number; nev: string }>>([]);
  const [iroda, setIroda] = useState('');
  const [statusz, setStatusz] = useState<string>(PROJEKT_STATUSZOK[0] ?? 'aktív');
  const [prioritas, setPrioritas] = useState<string>(PRIORITASOK[0] ?? 'Elsődleges');
  const [belsoMunka, setBelsoMunka] = useState(false);

  const [agazat, setAgazat] = useState('');
  const [kategoria, setKategoria] = useState('');
  const [varmegye, setVarmegye] = useState('');
  const [nemzgazd, setNemzgazd] = useState('');
  const [cimkek, setCimkek] = useState('');
  const [kezdete, setKezdete] = useState('');
  const [vege, setVege] = useState('');
  const [leiras, setLeiras] = useState('');

  const [kuldes, setKuldes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  useEffect(() => {
    if (!nyitva) return;
    getPartnerek()
      .then((d) => setPartnerek(d.sorok.map((p) => ({ id: p.id, nev: p.nev }))))
      .catch(() => setPartnerek([]));
  }, [nyitva]);

  useEffect(() => {
    if (!nyitva) return;
    setNev('');
    setPartnerId('');
    setIroda('');
    setStatusz(PROJEKT_STATUSZOK[0] ?? 'aktív');
    setPrioritas(PRIORITASOK[0] ?? 'Elsődleges');
    setBelsoMunka(false);
    setAgazat('');
    setKategoria('');
    setVarmegye('');
    setNemzgazd('');
    setCimkek('');
    setKezdete('');
    setVege('');
    setLeiras('');
    setKuldes(false);
    setHiba(null);
  }, [nyitva]);

  async function ment(e: FormEvent) {
    e.preventDefault();
    if (!nev.trim()) {
      setHiba('Projekt megnevezés (nev) kötelező.');
      return;
    }
    if (!partnerId) {
      setHiba('Partner kiválasztása kötelező.');
      return;
    }

    setKuldes(true);
    setHiba(null);
    try {
      const meta: ProjektMetaPayload = {
        agazat: agazat || undefined,
        kategoria: kategoria || undefined,
        varmegye: varmegye || undefined,
        nemzgazd: nemzgazd || undefined,
        cimkek: cimkek || undefined,
        kezdete: kezdete || undefined,
        vege: vege || undefined,
        leiras: leiras || undefined,
      };

      const friss = await ujProjekt({
        nev: nev.trim(),
        partner_id: Number(partnerId),
        iroda: iroda || null,
        statusz,
        prioritas,
        belso_munka: belsoMunka,
        meta,
      });

      onLetrehoz(Number(friss.sor.id));
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Mentés sikertelen');
    } finally {
      setKuldes(false);
    }
  }

  if (!nyitva) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={bezar}
    >
      <form
        className="w-full max-w-3xl rounded-card border border-border bg-card p-6 shadow-lg"
        onClick={(ev) => ev.stopPropagation()}
        onSubmit={ment}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-navy">Új projekt felvétele</h2>
          <button type="button" onClick={bezar} className="text-xl text-text-muted hover:text-navy">
            ×
          </button>
        </div>

        {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase text-text-muted">Projekt megnevezése *</span>
            <input
              className="field-input"
              value={nev}
              onChange={(e) => setNev(e.target.value)}
              placeholder="pl. GreenPark nyári diák"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Partner *</span>
            <select
              className="field-input"
              value={partnerId}
              required
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">— válassz partnert —</option>
              {partnerek.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nev}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Iroda</span>
            <input
              className="field-input"
              value={iroda}
              onChange={(e) => setIroda(e.target.value)}
              placeholder="pl. Budapest"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Státusz</span>
            <select className="field-input" value={statusz} onChange={(e) => setStatusz(e.target.value)}>
              {PROJEKT_STATUSZOK.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Prioritás</span>
            <select className="field-input" value={prioritas} onChange={(e) => setPrioritas(e.target.value)}>
              {PRIORITASOK.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 pt-2 text-sm">
            <input type="checkbox" checked={belsoMunka} onChange={(e) => setBelsoMunka(e.target.checked)} />
            Belső munka
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Ágazat</span>
            <input className="field-input" value={agazat} onChange={(e) => setAgazat(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Kategória</span>
            <input className="field-input" value={kategoria} onChange={(e) => setKategoria(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Vármegye</span>
            <input className="field-input" value={varmegye} onChange={(e) => setVarmegye(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Nemzetgazdasági ágazat</span>
            <input className="field-input" value={nemzgazd} onChange={(e) => setNemzgazd(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase text-text-muted">Címkék (vesszővel elválasztva)</span>
            <input className="field-input" value={cimkek} onChange={(e) => setCimkek(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Projekt kezdete</span>
            <input className="field-input" type="date" value={kezdete} onChange={(e) => setKezdete(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-text-muted">Projekt vége</span>
            <input className="field-input" type="date" value={vege} onChange={(e) => setVege(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase text-text-muted">Leírás</span>
            <textarea
              className="field-input"
              value={leiras}
              onChange={(e) => setLeiras(e.target.value)}
              rows={3}
              placeholder="Rövid kontextus a projektről"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={bezar} className="rounded-btn border px-4 py-2 text-sm">
            Mégse
          </button>
          <button
            type="submit"
            disabled={kuldes}
            className="rounded-btn bg-navy px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50"
          >
            {kuldes ? 'Mentés…' : 'Projekt létrehozása'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProjektReszletPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [adat, setAdat] = useState<ProjektReszletValasz | null>(null);
  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam && TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'alap';
  const [tab, setTab] = useState<TabId>(initialTab);
  const [mentes, setMentes] = useState(false);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getProjekt(Number(id)).then(setAdat).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setTab(tabParam as TabId);
    }
  }, [tabParam]);

  async function metaMentes(meta: ProjektMetaPayload, sor?: ProjektSorPatch) {
    if (!id) return;
    setMentes(true);
    setHiba(null);
    setUzenet(null);
    try {
      const friss = await patchProjektMeta(Number(id), meta, sor);
      setAdat(friss);
      setUzenet('Mentve.');
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  async function szereploHozzaad(lista: UjSzereploInput[]) {
    if (!id) return;
    setMentes(true);
    setHiba(null);
    try {
      const friss = await addProjektSzereplok(Number(id), lista);
      setAdat(friss);
      setUzenet(`${lista.length} szereplő hozzáadva.`);
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  async function szereploTorol(szereploId: number) {
    setMentes(true);
    setHiba(null);
    try {
      const friss = await deleteProjektSzereplo(szereploId);
      setAdat(friss);
      setUzenet('Szereplő törölve.');
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Törlés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  if (!adat) {
    return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  }

  const { sor, meta, fedezet, szereplok, hirdetesek } = adat;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream">
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <Link to="/belso/projektek" className="text-sm font-semibold text-gold hover:underline">
          ← Vissza a projektekhez
        </Link>
        <h1 className="mt-2 text-xl font-bold text-navy">
          {sor.azonosito} — {sor.nev}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {sor.partner_nev} · {sor.iroda} ·{' '}
          <span className="rounded-md bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
            {sor.statusz}
          </span>
          {mentes && <span className="ml-2 text-xs text-text-muted">Mentés…</span>}
          {uzenet && <span className="ml-2 text-xs font-semibold text-success">{uzenet}</span>}
          {hiba && <span className="ml-2 text-xs text-danger">{hiba}</span>}
        </p>
        <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-border pb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'shrink-0 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
                tab === t.id
                  ? 'border-gold text-navy'
                  : 'border-transparent text-text-muted hover:text-navy',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'alap' && (
          <ProjektAlapTab sor={sor} meta={meta} mentes={mentes} onMentes={metaMentes} />
        )}
        {tab === 'kapcsolattartok' && (
          <ProjektKapcsolattartokTab
            meta={meta}
            projektId={sor.id}
            partnerId={sor.partner_id ?? null}
            mentes={mentes}
            onMentes={metaMentes}
          />
        )}
        {tab === 'szereplok' && (
          <ProjektSzereplokTab
            meta={meta}
            szereplok={szereplok}
            mentes={mentes}
            onHozzaad={szereploHozzaad}
            onTorol={szereploTorol}
          />
        )}
        {tab === 'dijak' && (
          <ProjektDijakTab meta={meta} mentes={mentes} onMentes={metaMentes} />
        )}
        {tab === 'hirdetesek' && <TabHirdetesek sor={sor} hirdetesek={hirdetesek} />}
        {tab === 'koltsegek' && (
          <ProjektKoltsegekTab meta={meta} mentes={mentes} onMentes={metaMentes} />
        )}
        {tab === 'eseti' && (
          <TabEsetiSzerzodesek
            projektId={sor.id}
            partnerId={sor.partner_id ?? null}
            partnerNev={sor.partner_nev}
          />
        )}
        {tab === 'szerzodesek' && <TabSzerzodesek partnerId={sor.partner_id ?? null} partnerNev={sor.partner_nev} />}
        {tab === 'teljesites' && (
          <ProjektTeljesitesTab
            key={meta.teljesitesek?.length}
            meta={meta}
            projektAzonosito={sor.azonosito}
            projektId={sor.id}
            mentes={mentes}
            onMentes={metaMentes}
          />
        )}
        {tab === 'kifizetesek' && (
          <ProjektKifizetesekTab meta={meta} mentes={mentes} onMentes={metaMentes} />
        )}
        {tab === 'dokumentumok' && (
          <ProjektDokumentumokTab projektId={sor.id} meta={meta} mentes={mentes} onMentes={metaMentes} />
        )}
        {tab === 'fedezet' && <TabFedezet fedezet={fedezet} meta={meta} />}
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-card p-5">{children}</div>
  );
}

function TabSzerzodesek({
  partnerId,
  partnerNev,
}: {
  partnerId: number | null;
  partnerNev: string | null;
}) {
  const [sorok, setSorok] = useState<Array<import('@coop/shared').PartnerSzerzodes>>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId) {
      setSorok([]);
      setToltes(false);
      return;
    }

    setToltes(true);
    setHiba(null);
    getPartnerSzerzodesek({ partner_id: partnerId })
      .then((d) => setSorok(d.sorok))
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [partnerId]);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-navy">Szerződések</h3>
        <span className="text-xs font-semibold text-text-muted">{partnerNev ?? '—'}</span>
      </div>

      {hiba && <p className="mt-4 text-sm text-danger">{hiba}</p>}
      {toltes ? (
        <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
      ) : sorok.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          {partnerId ? 'Ehhez a partnerhez nincs szerződés.' : 'Nincs partner hozzárendelve a projekthez.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase text-text-muted">
                <th className="py-2">Típus</th>
                <th className="py-2">Státusz</th>
                <th className="py-2">Időszak</th>
                <th className="py-2">Dokumentum</th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2">{s.tipus}</td>
                  <td className="py-2">{s.statusz}</td>
                  <td className="py-2">{[s.erv_kezdete, s.erv_vege].filter(Boolean).join(' → ') || '—'}</td>
                  <td className="py-2">{s.dokumentum_nev ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TabEsetiSzerzodesek({
  projektId,
  partnerId,
  partnerNev,
}: {
  projektId: number;
  partnerId: number | null;
  partnerNev: string | null;
}) {
  const [sorok, setSorok] = useState<Array<import('@coop/shared').PartnerSzerzodes>>([]);
  const [esetiSablon, setEsetiSablon] = useState<import('@coop/shared').SzerzodesSablonMeta | null>(
    null,
  );
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);

  async function betolt() {
    setToltes(true);
    setHiba(null);
    try {
      const sablonRes = await fetch(`/api/szerzodes-sablonok?projekt_id=${projektId}`);
      const sablonJson = (await sablonRes.json()) as {
        sablonok?: { eseti_projekt?: import('@coop/shared').SzerzodesSablonMeta | null };
      };
      setEsetiSablon(sablonJson.sablonok?.eseti_projekt ?? null);

      if (!partnerId) {
        setSorok([]);
        return;
      }
      const d = await getPartnerSzerzodesek({ partner_id: partnerId });
      setSorok(d.sorok.filter((s) => s.tipus === 'Eseti szerződés'));
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    betolt().catch(() => setToltes(false));
  }, [projektId, partnerId]);

  return (
    <div className="space-y-4">
      <SzerzodesSablonFeltolto
        cim="Digitális eseti szerződés sablon"
        leiras="Ehhez a projekthez tartozó Word sablon — felvétel után a diák ezt írja alá (ha nincs, az alap eseti sablon érvényes)."
        tipus="eseti_projekt"
        projektId={projektId}
        sablon={esetiSablon}
        onFeltoltve={() => betolt().catch(() => null)}
      />

      <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-navy">Partner eseti szerződések (CRM)</h3>
        <span className="text-xs font-semibold text-text-muted">{partnerNev ?? '—'}</span>
      </div>

      {hiba && <p className="mt-4 text-sm text-danger">{hiba}</p>}
      {toltes ? (
        <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
      ) : sorok.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          {partnerId
            ? 'Nincs feltöltve eseti szerződés ehhez a partnerhez.'
            : 'Nincs partner hozzárendelve a projekthez.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase text-text-muted">
                <th className="py-2">Státusz</th>
                <th className="py-2">Időszak</th>
                <th className="py-2">Dokumentum</th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2">{s.statusz}</td>
                  <td className="py-2">
                    {([s.erv_kezdete, s.erv_vege].filter(Boolean).join(' → ') || '—') as string}
                  </td>
                  <td className="py-2">{s.dokumentum_nev ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
    </div>
  );
}

function TabHirdetesek({
  sor,
  hirdetesek,
}: {
  sor: Projekt;
  hirdetesek: Array<{
    id: number;
    cim: string;
    aktiv: boolean;
    varos: string;
    jelentkezok: number;
  }>;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-navy">Élő hirdetések</h3>
        <Link
          to={`/belso/toborzas/hirdetesek?projekt_id=${sor.id}`}
          className="text-sm font-semibold text-gold hover:underline"
        >
          Összes / új →
        </Link>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase text-text-muted">
            <th className="py-2">Cím</th>
            <th className="py-2">Város</th>
            <th className="py-2">Státusz</th>
            <th className="py-2">Jelentkezők</th>
          </tr>
        </thead>
        <tbody>
          {hirdetesek.map((h) => (
            <tr key={h.id} className="border-b border-border">
              <td className="py-2">
                <Link
                  to={`/belso/toborzas/hirdetesek/${h.id}`}
                  className="font-medium text-navy hover:text-gold"
                >
                  {h.cim}
                </Link>
              </td>
              <td className="py-2">{h.varos}</td>
              <td className="py-2">{h.aktiv ? 'aktív' : 'inaktív'}</td>
              <td className="py-2">
                {(h.jelentkezok ?? 0) > 0 ? (
                  <Link
                    to={`/belso/toborzas/jelentkezesek?hirdetes=${h.id}`}
                    className="font-semibold text-[#2C7BD6] hover:underline"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    👥 {h.jelentkezok}
                  </Link>
                ) : (
                  <span className="text-text-muted">0</span>
                )}
              </td>
            </tr>
          ))}
          {hirdetesek.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-text-muted">
                Még nincs hirdetés —{' '}
                <Link to="/belso/toborzas/hirdetesek" className="text-gold underline">
                  hirdetés felvétele
                </Link>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function TabFedezet({
  fedezet,
  meta,
}: {
  fedezet: FedezetOsszesito;
  meta: ProjektMetaPayload;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <FedezetKartya label="Bevétel (teljig)" ertek={fedezet.bevetel} />
        <FedezetKartya label="Tagi bér (kifizetés)" ertek={fedezet.tagi_ber} />
        <FedezetKartya label="Közvetlen költségek" ertek={fedezet.kozvetlen_koltsegek} />
        <FedezetKartya
          label="Fedezet"
          ertek={fedezet.fedezet}
          kiemelt={fedezet.fedezet >= 0}
        />
      </div>
      <Card>
        <p className="text-sm text-text-muted">
          A fedezet a teljesítés igazolások bevétele − kifizetések − teljig költségek alapján
          számítódik (spec 3.3).
        </p>
        {(meta.kifizetesek ?? []).length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-text-muted">
                <th className="py-1">Témavezető</th>
                <th className="py-1">Időszak</th>
                <th className="py-1">Összeg</th>
                <th className="py-1">Státusz</th>
              </tr>
            </thead>
            <tbody>
              {meta.kifizetesek!.map((k, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2">{k.temavezeto}</td>
                  <td className="py-2">{k.szf_idoszak}</td>
                  <td className="py-2">{k.osszesen != null ? ft(k.osszesen) : '—'}</td>
                  <td className="py-2">{k.statusz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function FedezetKartya({
  label,
  ertek,
  kiemelt,
}: {
  label: string;
  ertek: number;
  kiemelt?: boolean;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase text-text-muted">{label}</p>
      <p
        className={[
          'mt-1 text-xl font-bold',
          kiemelt === false ? 'text-danger' : kiemelt ? 'text-success' : 'text-navy',
        ].join(' ')}
      >
        {ft(ertek)}
      </p>
    </div>
  );
}
