import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getMunkak,
  getMunka,
  getProjektek,
  getProjekt,
  mentHirdetes,
  hirdetesTomeges,
  ujMunka,
  type MunkaHirdetes,
  type Projekt,
  type ProjektSzereplo,
} from '../../api/coop';
import type { ProjektSzamfejtesiBerMeta } from '@coop/shared';

const BEREZESEK = ['Alapbér', 'Pótlékos', 'Megegyezés szerint', 'Egyéni'];
const NYELVEK = ['HU', 'EN', 'HU+EN'];
const VAROSOK = ['Budapest', 'Székesfehérvár', 'Pécs', 'Sopron', 'Debrecen', 'Győr', 'Biatorbágy'];
const NAPOK = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];
const NEM_ERTEM_EL_OPCIOK = ['1 óra', '6 óra', '24 óra', '48 óra'];

type Tab = 'alap' | 'munka' | 'tartalom' | 'kep';

export function HirdetesListaPage() {
  const [munkak, setMunkak] = useState<MunkaHirdetes[]>([]);
  const [toltes, setToltes] = useState(true);
  const [kijelolt, setKijelolt] = useState<Set<number>>(new Set());
  const [bulkAkcio, setBulkAkcio] = useState<'aktiv' | 'inaktiv' | 'erv_plus_14' | 'torol'>('aktiv');
  const [searchParams] = useSearchParams();
  const projektFilter = searchParams.get('projekt_id');
  const navigate = useNavigate();

  async function betolt() {
    setToltes(true);
    const params: Record<string, string> = { belso: '1' };
    if (projektFilter) params.projekt_id = projektFilter;
    const d = await getMunkak(params);
    setMunkak(d.sorok);
    setToltes(false);
  }

  useEffect(() => {
    setKijelolt(new Set());
    betolt().catch(console.error);
  }, [projektFilter]);

  async function tomegesMuvelet() {
    if (kijelolt.size === 0) return;
    await hirdetesTomeges([...kijelolt], bulkAkcio);
    setKijelolt(new Set());
    await betolt();
  }

  function toggleKijelolt(id: number) {
    setKijelolt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function ujHirdetes() {
    const { sor } = await ujMunka({
      cim: 'Új hirdetés',
      varos: 'Budapest',
      munkakor: 'Adminisztratív, irodai',
      ber: 2000,
      eloszo_torzs: 'Új hirdetés',
      fobb_feladatok: '',
    });
    navigate(`/belso/toborzas/hirdetesek/${sor.id}`);
  }

  async function aktivValtas(e: React.MouseEvent, m: MunkaHirdetes) {
    e.stopPropagation();
    await mentHirdetes(m.id, { aktiv: !m.aktiv });
    await betolt();
  }

  function jelentkezokMegnyit(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    navigate(`/belso/toborzas/jelentkezesek?hirdetes=${id}`);
  }

  function szerkesztes(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    navigate(`/belso/toborzas/hirdetesek/${id}`);
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">Hirdetések</h2>
          <p className="mt-1 text-sm text-text-muted">
            {munkak.length} hirdetés
            {projektFilter && (
              <>
                {' '}
                — projekt #{projektFilter}{' '}
                <Link to="/belso/toborzas/hirdetesek" className="text-gold underline">
                  összes
                </Link>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={ujHirdetes}
          className="rounded-btn border border-navy bg-navy px-4 py-2 text-sm font-semibold text-cream"
        >
          + Új hirdetés
        </button>
      </div>

      {toltes ? (
        <p className="mt-4 text-sm text-text-muted">Betöltés…</p>
      ) : munkak.length === 0 ? (
        <p className="mt-4 rounded-card border border-border bg-card p-8 text-center text-sm text-text-muted">
          Még nincs hirdetés. Hozz létre egyet — megjelenik a{' '}
          <a href="/diak/munkak" className="text-gold underline">
            diákportálon
          </a>
          .
        </p>
      ) : (
        <>
        {munkak.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm">
            <span className="text-text-muted">Tömeges művelet:</span>
            <select
              className="field-input w-auto py-1"
              value={bulkAkcio}
              onChange={(e) => setBulkAkcio(e.target.value as typeof bulkAkcio)}
            >
              <option value="aktiv">Aktiválás</option>
              <option value="inaktiv">Inaktiválás</option>
              <option value="erv_plus_14">Érvényesség +14 nap</option>
              <option value="torol">Inaktiválás (törlés helyett)</option>
            </select>
            <button
              type="button"
              onClick={tomegesMuvelet}
              disabled={kijelolt.size === 0}
              className="rounded-btn border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              Alkalmaz ({kijelolt.size})
            </button>
          </div>
        )}
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                <th className="w-8 px-2 py-2" />
                <th className="px-3 py-2">Státusz</th>
                <th className="px-3 py-2">Projekt</th>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Hirdetés címe</th>
                <th className="px-3 py-2">Toborzó</th>
                <th className="px-3 py-2">Város</th>
                <th className="px-3 py-2">👁</th>
                <th className="px-3 py-2">👥</th>
                <th className="px-3 py-2">Létrehozva</th>
                <th className="px-3 py-2 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {munkak.map((m) => (
                <tr
                  key={m.id}
                  className="cursor-pointer border-b border-border hover:bg-cream-muted/50"
                  onClick={() => navigate(`/belso/toborzas/hirdetesek/${m.id}`)}
                >
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={kijelolt.has(m.id)}
                      onChange={() => toggleKijelolt(m.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                        m.aktiv ? 'bg-success-bg text-success' : 'bg-draft-bg text-draft'
                      }`}
                    >
                      {m.aktiv ? 'aktív' : 'inaktív'}
                    </span>
                  </td>
              <td className="px-3 py-2.5 font-semibold text-gold">
                {m.projekt_azonosito ? (
                  <Link
                    to={`/belso/projektek/${m.projekt_id}`}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="hover:underline"
                  >
                    {m.projekt_azonosito}
                  </Link>
                ) : (
                  '—'
                )}
              </td>
                  <td className="max-w-[140px] px-3 py-2.5 text-text-muted">
                    {m.partner ?? '—'}
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5 font-semibold text-navy">
                    {m.cim}
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">{m.toborzo ?? m.felelos ?? '—'}</td>
                  <td className="px-3 py-2.5">{m.varos}</td>
                  <td className="px-3 py-2.5 text-text-muted">{m.megtekintesek ?? 0}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => jelentkezokMegnyit(e, m.id)}
                      className="font-semibold text-[#2C7BD6] hover:underline"
                      title="Jelentkezők megtekintése"
                    >
                      👥 {m.jelentkezok ?? 0}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-text-muted">
                    {new Date(m.letrehozva).toLocaleDateString('hu-HU')}
                  </td>
                  <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Jelentkezők"
                        onClick={(e) => jelentkezokMegnyit(e, m.id)}
                        className="rounded px-2 py-1 hover:bg-cream-muted"
                      >
                        👥
                      </button>
                      <button
                        type="button"
                        title="Szerkesztés"
                        onClick={(e) => szerkesztes(e, m.id)}
                        className="rounded px-2 py-1 hover:bg-cream-muted"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        title={m.aktiv ? 'Inaktiválás' : 'Aktiválás'}
                        onClick={(e) => aktivValtas(e, m)}
                        className="rounded px-2 py-1 hover:bg-cream-muted"
                      >
                        {m.aktiv ? '⏸' : '▶'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

export function HirdetesSzerkesztesPage() {
  const { id } = useParams<{ id: string }>();
  const [hirdetes, setHirdetes] = useState<MunkaHirdetes | null>(null);
  const [projektek, setProjektek] = useState<Projekt[]>([]);
  const [szfBerek, setSzfBerek] = useState<ProjektSzamfejtesiBerMeta[]>([]);
  const [szereplok, setSzereplok] = useState<ProjektSzereplo[]>([]);
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [tab, setTab] = useState<Tab>('alap');
  const [mentes, setMentes] = useState(false);
  const [uzenet, setUzenet] = useState('');

  useEffect(() => {
    getProjektek().then((d) => setProjektek(d.sorok));
  }, []);

  useEffect(() => {
    if (!id) return;
    getMunka(Number(id), true).then((d) => {
      setHirdetes(d.sor);
      if (d.projekt) setProjekt(d.projekt);
    });
  }, [id]);

  useEffect(() => {
    if (!hirdetes?.projekt_id) return;
    getProjekt(hirdetes.projekt_id).then((d) => {
      setProjekt(d.sor);
      setSzfBerek(d.meta.szamfejtesi_berek ?? []);
      setSzereplok(d.szereplok);
    });
  }, [hirdetes?.projekt_id]);

  function frissit(patch: Partial<MunkaHirdetes>) {
    setHirdetes((h) => (h ? { ...h, ...patch } : h));
  }

  async function projektValtas(projektId: number) {
    const d = await getProjekt(projektId);
    setProjekt(d.sor);
    setSzfBerek(d.meta.szamfejtesi_berek ?? []);
    setSzereplok(d.szereplok);
    const elsoKod = d.meta.szamfejtesi_berek?.[0];
    frissit({
      projekt_id: projektId,
      partner: d.sor.partner_nev,
      felelos: d.szereplok[0]?.nev ?? null,
      toborzo: d.szereplok[0]?.nev ?? null,
      kifizetesi_kod: elsoKod?.id ?? null,
      ber: elsoKod?.ar ?? hirdetes?.ber ?? 2000,
      munkakor: elsoKod?.munkakor ?? hirdetes?.munkakor ?? '',
    });
  }

  async function ment() {
    if (!hirdetes) return;
    setMentes(true);
    setUzenet('');
    try {
      await mentHirdetes(hirdetes.id, hirdetes);
      setUzenet('Mentve.');
    } catch (e) {
      setUzenet(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setMentes(false);
    }
  }

  if (!hirdetes) {
    return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  }

  const napSet = new Set(hirdetes.munkanapok.split(',').map((s) => s.trim()));

  return (
    <div className="p-6">
      <Link to="/belso/toborzas/hirdetesek" className="text-sm font-semibold text-gold hover:underline">
        ← Vissza a listához
      </Link>

      <div className="mt-4 rounded-card border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-navy">
              {projekt?.azonosito ?? '—'} — {hirdetes.cim}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {hirdetes.partner} · {hirdetes.varos} · 👥 {hirdetes.jelentkezok ?? 0} jelentkező
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/belso/toborzas/jelentkezesek?hirdetes=${hirdetes.id}`}
              className="rounded-btn border border-border px-3 py-2 text-sm font-semibold hover:bg-cream-muted"
            >
              👥 Jelentkezők ({hirdetes.jelentkezok ?? 0})
            </Link>
            <a
              href={`/diak/munkak/${hirdetes.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-btn border border-border px-3 py-2 text-sm font-semibold hover:bg-cream-muted"
            >
              Előnézet ↗
            </a>
            <button
              type="button"
              onClick={() => frissit({ aktiv: !hirdetes.aktiv })}
              className="rounded-btn border border-border px-3 py-2 text-sm font-semibold"
            >
              {hirdetes.aktiv ? 'Inaktiválás' : 'Aktiválás'}
            </button>
            <button
              type="button"
              onClick={ment}
              disabled={mentes}
              className="rounded-btn border border-navy bg-navy px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
            >
              {mentes ? 'Mentés…' : 'Mentés'}
            </button>
          </div>
        </div>

        {uzenet && <p className="mt-2 text-sm text-success">{uzenet}</p>}

        <div className="mt-4 flex flex-wrap gap-1 border-b border-border pb-1">
          {(
            [
              ['alap', 'Alapadatok'],
              ['munka', 'Munka adatok'],
              ['tartalom', 'Tartalom'],
              ['kep', 'Hirdetés kép'],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                'rounded-t-md px-4 py-2 text-sm font-semibold',
                tab === t ? 'bg-cream-muted text-navy' : 'text-text-muted hover:text-navy',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {tab === 'alap' && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Cím *</span>
                  <input
                    className="field-input"
                    value={hirdetes.cim}
                    onChange={(e) => frissit({ cim: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Projekt *</span>
                  <select
                    className="field-input"
                    value={hirdetes.projekt_id ?? ''}
                    onChange={(e) => projektValtas(Number(e.target.value))}
                  >
                    <option value="" disabled>Válassz projektet…</option>
                    {projektek.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.azonosito} — {p.nev}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase text-text-muted">Partner</span>
                  <p className="mt-1">{projekt?.partner_nev ?? hirdetes.partner ?? '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-text-muted">Iroda</span>
                  <p className="mt-1">{projekt?.iroda ?? '—'}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Toborzásért felelős</span>
                  <select
                    className="field-input"
                    value={hirdetes.felelos ?? ''}
                    onChange={(e) => frissit({ felelos: e.target.value, toborzo: e.target.value })}
                    disabled={!szereplok.length}
                  >
                    <option value="">{szereplok.length ? '— válassz —' : 'Nincs szereplő a projekten'}</option>
                    {szereplok.map((s) => (
                      <option key={s.id} value={s.nev}>{s.nev}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Kifizetési kód (számfejtési bér)</span>
                  <select
                    className="field-input"
                    value={hirdetes.kifizetesi_kod ?? ''}
                    onChange={(e) => {
                      const kod = szfBerek.find((k) => k.id === e.target.value);
                      frissit({
                        kifizetesi_kod: e.target.value,
                        ber: kod?.ar ?? hirdetes.ber,
                        munkakor: kod?.munkakor ?? hirdetes.munkakor,
                      });
                    }}
                    disabled={!szfBerek.length}
                  >
                    <option value="">
                      {szfBerek.length ? '— válassz —' : 'Nincs számfejtési bér — Díjak & bérek fül'}
                    </option>
                    {szfBerek.map((k) => (
                      <option key={k.id} value={k.id}>{k.nev}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Bérezés</span>
                  <select
                    className="field-input"
                    value={hirdetes.berezes ?? 'Alapbér'}
                    onChange={(e) => frissit({ berezes: e.target.value })}
                  >
                    {BEREZESEK.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </label>
                {hirdetes.berezes === 'Egyéni' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-text-muted">Egyéni bér szöveg</span>
                    <input
                      className="field-input"
                      value={hirdetes.egyeni_ber ?? ''}
                      onChange={(e) => frissit({ egyeni_ber: e.target.value })}
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Város</span>
                  <select
                    className="field-input"
                    value={hirdetes.varos}
                    onChange={(e) => frissit({ varos: e.target.value })}
                  >
                    {VAROSOK.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Extra város</span>
                  <input
                    className="field-input"
                    value={hirdetes.extra_varos ?? ''}
                    onChange={(e) => frissit({ extra_varos: e.target.value })}
                    placeholder="Kattints ide a kereséshez"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Extra vármegye</span>
                  <input
                    className="field-input"
                    value={hirdetes.extra_varmegye ?? ''}
                    onChange={(e) => frissit({ extra_varmegye: e.target.value })}
                    placeholder="Kattints ide a választáshoz"
                  />
                </label>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-text-muted">Munkanapok</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {NAPOK.map((nap, i) => (
                    <label key={`${nap}-${i}`} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={napSet.has(nap)}
                        onChange={(e) => {
                          const next = new Set(napSet);
                          if (e.target.checked) next.add(nap);
                          else next.delete(nap);
                          frissit({ munkanapok: [...next].join(',') });
                        }}
                      />
                      {nap}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-2 self-end text-sm">
                  <input
                    type="checkbox"
                    checked={!!hirdetes.szoveges_munkaido}
                    onChange={(e) => frissit({ szoveges_munkaido: e.target.checked })}
                  />
                  Szöveges munkaidő
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Munkaidő leírás</span>
                  <input
                    className="field-input"
                    value={hirdetes.munkaido_leiras ?? hirdetes.munkaido ?? ''}
                    onChange={(e) =>
                      frissit({ munkaido_leiras: e.target.value, munkaido: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Címkék</span>
                <input
                  className="field-input"
                  value={hirdetes.cimkek ?? ''}
                  onChange={(e) => frissit({ cimkek: e.target.value })}
                  placeholder="gyakornoki, hétvégi munkák"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Min. korhatár</span>
                  <input
                    type="number"
                    className="field-input"
                    value={hirdetes.min_korhatar ?? 16}
                    onChange={(e) => frissit({ min_korhatar: Number(e.target.value) })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Nyelv</span>
                  <select
                    className="field-input"
                    value={hirdetes.nyelv ?? 'HU'}
                    onChange={(e) => frissit({ nyelv: e.target.value })}
                  >
                    {NYELVEK.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Érvényesség</span>
                  <input
                    type="date"
                    className="field-input"
                    value={hirdetes.erv_datum ?? ''}
                    onChange={(e) => frissit({ erv_datum: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!hirdetes.oneletrajz}
                    onChange={(e) => frissit({ oneletrajz: e.target.checked })}
                  />
                  Önéletrajz szükséges?
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hirdetes.telefonszam !== false}
                    onChange={(e) => frissit({ telefonszam: e.target.checked })}
                  />
                  Telefonszám mutatása?
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Megjegyzés</span>
                <textarea
                  rows={2}
                  className="field-input resize-y"
                  value={hirdetes.megjegyzes ?? ''}
                  onChange={(e) => frissit({ megjegyzes: e.target.value })}
                />
              </label>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-bold text-navy">Jelentkezés beállítások</p>
                <label className="mt-3 flex max-w-xs flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">
                    „Nem értem el” limit
                  </span>
                  <select
                    className="field-input"
                    value={hirdetes.nem_ertem_el ?? '24 óra'}
                    onChange={(e) => frissit({ nem_ertem_el: e.target.value })}
                  >
                    {NEM_ERTEM_EL_OPCIOK.map((o) => (
                      <option key={o} value={o}>
                        {o === '24 óra' ? `${o} (alapértelmezett)` : o}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 max-w-xl text-xs text-text-muted">
                  Ha a jelentkező „Nem érem el” állapotot kap, ennyi idő után automatikusan
                  kezeletlen státuszba kerül.
                </p>
              </div>
            </>
          )}

          {tab === 'munka' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Munkavégzés helye</span>
                <textarea
                  rows={3}
                  className="field-input resize-y"
                  value={hirdetes.munkavegzes_helye ?? ''}
                  onChange={(e) => frissit({ munkavegzes_helye: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Munkavégzés időpontja</span>
                <textarea
                  rows={2}
                  className="field-input resize-y"
                  value={hirdetes.munkavegzes_idopontja ?? ''}
                  onChange={(e) => frissit({ munkavegzes_idopontja: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Munkaidő leírás</span>
                <input
                  className="field-input"
                  value={hirdetes.munkaido_leiras ?? hirdetes.munkaido ?? ''}
                  onChange={(e) => frissit({ munkaido_leiras: e.target.value, munkaido: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Bérezés szöveg</span>
                <textarea
                  rows={2}
                  className="field-input resize-y"
                  value={hirdetes.berezes_szoveg ?? ''}
                  onChange={(e) => frissit({ berezes_szoveg: e.target.value })}
                  placeholder="pl. 2350 Ft/óra"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Befejező szöveg</span>
                <textarea
                  rows={2}
                  className="field-input resize-y"
                  value={hirdetes.befejezo_szoveg ?? ''}
                  onChange={(e) => frissit({ befejezo_szoveg: e.target.value })}
                  placeholder="Jelentkezni a … címre lehet önéletrajzzal."
                />
              </label>
            </>
          )}

          {tab === 'tartalom' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Előszó fejléc</span>
                <textarea
                  rows={2}
                  className="field-input resize-y"
                  value={hirdetes.eloszo_fejlec ?? ''}
                  onChange={(e) => frissit({ eloszo_fejlec: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Előszó törzs *</span>
                <textarea
                  rows={2}
                  className="field-input resize-y"
                  value={hirdetes.eloszo_torzs ?? ''}
                  onChange={(e) => frissit({ eloszo_torzs: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Előszó lábléc</span>
                <textarea
                  rows={2}
                  className="field-input resize-y"
                  value={hirdetes.eloszo_lablec ?? ''}
                  onChange={(e) => frissit({ eloszo_lablec: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Amit kínálunk</span>
                <textarea
                  rows={3}
                  className="field-input resize-y"
                  value={hirdetes.amit_kinalunk ?? hirdetes.leiras ?? ''}
                  onChange={(e) => frissit({ amit_kinalunk: e.target.value, leiras: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Főbb feladatok *</span>
                <textarea
                  rows={4}
                  className="field-input resize-y"
                  value={hirdetes.fobb_feladatok ?? ''}
                  onChange={(e) => frissit({ fobb_feladatok: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Elvárások</span>
                <textarea
                  rows={3}
                  className="field-input resize-y"
                  value={hirdetes.elvarasok ?? ''}
                  onChange={(e) => frissit({ elvarasok: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-text-muted">Előnyt jelent</span>
                <textarea
                  rows={2}
                  className="field-input resize-y"
                  value={hirdetes.elonyt_jelent ?? ''}
                  onChange={(e) => frissit({ elonyt_jelent: e.target.value })}
                />
              </label>
            </>
          )}

          {tab === 'kep' && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Kép főcím</span>
                  <input
                    className="field-input"
                    value={hirdetes.kep_focim ?? hirdetes.cim}
                    onChange={(e) => frissit({ kep_focim: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-text-muted">Kép alcím</span>
                  <input
                    className="field-input"
                    value={hirdetes.kep_alcim ?? ''}
                    onChange={(e) => frissit({ kep_alcim: e.target.value })}
                  />
                </label>
              </div>
              <p className="text-sm text-text-muted">
                A hirdetés megjelenik a diákportál munkakeresőjében és részletező oldalán.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
