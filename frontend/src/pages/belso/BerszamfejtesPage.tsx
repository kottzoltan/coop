import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MUNKALAP_STATUSZOK,
  MUNKALAP_STATUS_BETU,
  TAG_IRODAK,
  TAGSAG_STATUSZOK,
  diakBruttoOra,
  munkalapSzerkesztheto,
  type Munkalap,
  type MunkalapDiak,
  type MunkalapTagMeta,
  type SzovetkezetiTag,
} from '@coop/shared';
import {
  getMunkalapok,
  getMunkalap,
  getMunkalapJelenletek,
  mentMunkalap,
  munkalapDiakHozzaad,
  munkalapDiakTorol,
  munkalapJelenletHozzarendel,
  munkalapKorrekcioInditas,
  torolMunkalap,
  ujMunkalap,
  getProjektek,
  getTagok,
  type Projekt,
} from '../../api/coop';
import { MuveletekMenu } from '../../components/belso/MuveletekMenu';
import { BerszamfejtesNav } from '../../components/belso/berszamfejtes/BerszamfejtesNav';
import { letoltRiport } from '../../utils/riport';
import { MunkalapDiakNaptar } from '../../components/belso/berszamfejtes/MunkalapDiakNaptar';
import {
  controllingIkonok,
  MunkalapControllingPanel,
  passesControllingSzuro,
} from '../../components/belso/berszamfejtes/MunkalapControlling';

type BerKod = { id?: string; ar?: number; nev?: string };

function munkalapBontas(munkalap: Munkalap, berKodok: BerKod[]) {
  const map = new Map<
    string,
    { azonosito: string; megnevezes: string; egysegar: number; mennyiseg: number; osszesen: number }
  >();
  const kodInfo = (id?: string) => berKodok.find((k) => k.id === id);

  for (const diak of munkalap.diakok) {
    for (const [nap, e] of Object.entries(diak.idoadatok ?? {})) {
      const kod = kodInfo(e.kod);
      const azonosito = kod?.id ?? e.kod ?? `nap-${nap}`;
      const egysegar = kod?.ar ?? 0;
      const mennyiseg =
        e.tol && e.ig
          ? diakBruttoOra({ ...diak, idoadatok: { [nap]: e } as MunkalapDiak['idoadatok'] }, berKodok).orak
          : 0;
      const elozo = map.get(azonosito) ?? {
        azonosito,
        megnevezes: kod?.nev ?? azonosito,
        egysegar,
        mennyiseg: 0,
        osszesen: 0,
      };
      elozo.mennyiseg += mennyiseg;
      elozo.osszesen += mennyiseg * egysegar;
      map.set(azonosito, elozo);
    }
  }

  return [...map.values()].sort((a, b) => a.azonosito.localeCompare(b.azonosito, 'hu'));
}

function SegmentBar({ active }: { active: 'munkalapok' | 'folyoszamla' | 'jelenletek' }) {
  return (
    <BerszamfejtesNav
      active={active === 'munkalapok' ? 'munkalapok' : active === 'folyoszamla' ? 'folyoszamla' : 'jelenletek'}
    />
  );
}

function ft(n: number) {
  return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
}

type CtrlSzuro = 'mind' | 'igen' | 'nem';

const URES_CTRL_SZURO = {
  magas_brutto_ber: 'mind' as CtrlSzuro,
  magas_oraszam: 'mind' as CtrlSzuro,
  keves_alapber: 'mind' as CtrlSzuro,
  problemas_szunet: 'mind' as CtrlSzuro,
};

export function BerszamfejtesListaPage() {
  const [sorok, setSorok] = useState<Munkalap[]>([]);
  const [szf, setSzf] = useState('');
  const [statusz, setStatusz] = useState('mind');
  const [ctrlSzuro, setCtrlSzuro] = useState(URES_CTRL_SZURO);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujNyitva, setUjNyitva] = useState(false);
  const [listaMentes, setListaMentes] = useState<number | null>(null);
  const [riportToltes, setRiportToltes] = useState(false);
  const navigate = useNavigate();

  const szurtSorok = sorok.filter((ml) => {
    const resolved = ml.statusz !== 'Piszkozat';
    return passesControllingSzuro(ml.controlling, resolved, ctrlSzuro);
  });

  async function listaStatuszValtas(e: React.MouseEvent, mlId: number, uj: string) {
    e.stopPropagation();
    setListaMentes(mlId);
    try {
      await mentMunkalap(mlId, { statusz: uj });
      const d = await getMunkalapok({
        szf_idoszak: szf || undefined,
        statusz: statusz !== 'mind' ? statusz : undefined,
      });
      setSorok(d.sorok);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Státusz váltás sikertelen');
    } finally {
      setListaMentes(null);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setToltes(true);
      getMunkalapok({
        szf_idoszak: szf || undefined,
        statusz: statusz !== 'mind' ? statusz : undefined,
      })
        .then((d) => {
          setSorok(d.sorok);
          setHiba(null);
        })
        .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
        .finally(() => setToltes(false));
    }, 200);
    return () => clearTimeout(t);
  }, [szf, statusz]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <SegmentBar active="munkalapok" />
          <h1 className="mt-3 text-xl font-bold text-navy">Bérszámfejtés — munkalapok</h1>
          <p className="text-sm text-text-muted">
            {szurtSorok.length} / {sorok.length} munkalap
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUjNyitva(true)}
          className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
        >
          + Új munkalap
        </button>
        <MuveletekMenu
          muveletek={[
            {
              label: 'Munkalapok export (CSV)',
              onClick: async () => {
                setRiportToltes(true);
                try {
                  await letoltRiport('munkalapok');
                } catch (e) {
                  setHiba(e instanceof Error ? e.message : 'Export sikertelen');
                } finally {
                  setRiportToltes(false);
                }
              },
              disabled: riportToltes,
            },
            {
              label: 'Tag hiányosság export (CSV)',
              onClick: async () => {
                setRiportToltes(true);
                try {
                  await letoltRiport('tag-hianyossag');
                } catch (e) {
                  setHiba(e instanceof Error ? e.message : 'Export sikertelen');
                } finally {
                  setRiportToltes(false);
                }
              },
              disabled: riportToltes,
            },
          ]}
        />
      </div>

      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          placeholder="Számfejtési időszak (ÉÉÉÉ-HH)…"
          value={szf}
          onChange={(e) => setSzf(e.target.value)}
          className="field-input min-w-[180px] flex-1"
        />
        <select
          value={statusz}
          onChange={(e) => setStatusz(e.target.value)}
          className="field-input w-auto"
        >
          <option value="mind">Minden státusz</option>
          {MUNKALAP_STATUSZOK.slice(0, 5).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={ctrlSzuro.magas_brutto_ber}
          onChange={(e) =>
            setCtrlSzuro((s) => ({ ...s, magas_brutto_ber: e.target.value as CtrlSzuro }))
          }
          className="field-input w-auto text-xs"
          title="Magas bruttó bér?"
        >
          <option value="mind">$ bruttó: mind</option>
          <option value="igen">$ bruttó: igen</option>
          <option value="nem">$ bruttó: nem</option>
        </select>
        <select
          value={ctrlSzuro.magas_oraszam}
          onChange={(e) =>
            setCtrlSzuro((s) => ({ ...s, magas_oraszam: e.target.value as CtrlSzuro }))
          }
          className="field-input w-auto text-xs"
        >
          <option value="mind">Óra: mind</option>
          <option value="igen">Óra: igen</option>
          <option value="nem">Óra: nem</option>
        </select>
        <select
          value={ctrlSzuro.keves_alapber}
          onChange={(e) =>
            setCtrlSzuro((s) => ({ ...s, keves_alapber: e.target.value as CtrlSzuro }))
          }
          className="field-input w-auto text-xs"
        >
          <option value="mind">Alapbér: mind</option>
          <option value="igen">Alapbér: igen</option>
          <option value="nem">Alapbér: nem</option>
        </select>
        <select
          value={ctrlSzuro.problemas_szunet}
          onChange={(e) =>
            setCtrlSzuro((s) => ({ ...s, problemas_szunet: e.target.value as CtrlSzuro }))
          }
          className="field-input w-auto text-xs"
        >
          <option value="mind">Szünet: mind</option>
          <option value="igen">Szünet: igen</option>
          <option value="nem">Szünet: nem</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-muted text-left text-[11px] font-bold uppercase text-text-muted">
            <tr>
              <th className="px-2 py-2">St.</th>
              <th className="px-2 py-2">Azonosító</th>
              <th className="px-2 py-2">Projekt</th>
              <th className="px-2 py-2">Név</th>
              <th className="px-2 py-2">Témavezető</th>
              <th className="px-2 py-2">Telj.</th>
              <th className="px-2 py-2">Sz.f.</th>
              <th className="px-2 py-2">Diákok</th>
              <th className="px-2 py-2">Bruttó</th>
              <th className="px-2 py-2">Ctrl</th>
              <th className="px-2 py-2 text-right">Művelet</th>
            </tr>
          </thead>
          <tbody>
            {toltes ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-text-muted">
                  Betöltés…
                </td>
              </tr>
            ) : sorok.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-text-muted">
                  Nincs munkalap.
                </td>
              </tr>
            ) : szurtSorok.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-text-muted">
                  Nincs a szűrésnek megfelelő munkalap.
                </td>
              </tr>
            ) : (
              szurtSorok.map((ml) => {
                const st = MUNKALAP_STATUS_BETU[ml.statusz] ?? { l: '?', c: '#8A8570' };
                const resolved = ml.statusz !== 'Piszkozat';
                return (
                  <tr
                    key={ml.id}
                    onClick={() => navigate(`/belso/berszamfejtes/${ml.id}`)}
                    className="cursor-pointer border-t border-border hover:bg-cream-muted/50"
                  >
                    <td className="px-2 py-2">
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                        style={{ background: st.c }}
                        title={ml.statusz}
                      >
                        {st.l}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs font-semibold">{ml.azonosito}</td>
                    <td className="max-w-[140px] truncate px-2 py-2 text-xs">
                      {ml.projekt_azonosito}
                    </td>
                    <td className="max-w-[160px] truncate px-2 py-2">{ml.nev || '—'}</td>
                    <td className="px-2 py-2 text-xs">{ml.temavezeto ?? '—'}</td>
                    <td className="px-2 py-2 text-xs">{ml.telj_idoszak}</td>
                    <td className="px-2 py-2 text-xs">{ml.szf_idoszak}</td>
                    <td className="px-2 py-2">{ml.diakok.length}</td>
                    <td className="px-2 py-2 tabular-nums font-semibold">
                      {ml.ossz_brutto != null ? ft(ml.ossz_brutto) : '—'}
                    </td>
                    <td className="px-2 py-2 text-xs" title="Bruttó / óra / alapbér / szünet">
                      {controllingIkonok(ml.controlling, resolved)}
                    </td>
                    <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {ml.statusz === 'Piszkozat' && (
                          <button
                            type="button"
                            disabled={listaMentes === ml.id}
                            title="Lezárás"
                            onClick={(e) => listaStatuszValtas(e, ml.id, 'Lezárt')}
                            className="rounded px-1.5 py-0.5 text-xs hover:bg-cream-muted"
                          >
                            🔒
                          </button>
                        )}
                        {ml.statusz === 'Lezárt' && (
                          <>
                            <button
                              type="button"
                              disabled={listaMentes === ml.id}
                              title="Jóváhagyás"
                              onClick={(e) => listaStatuszValtas(e, ml.id, 'Jóváhagyott')}
                              className="rounded px-1.5 py-0.5 text-xs hover:bg-cream-muted"
                            >
                              ✔
                            </button>
                            <button
                              type="button"
                              disabled={listaMentes === ml.id}
                              title="Elutasítás"
                              onClick={(e) => listaStatuszValtas(e, ml.id, 'Elutasított')}
                              className="rounded px-1.5 py-0.5 text-xs hover:bg-cream-muted"
                            >
                              ➖
                            </button>
                          </>
                        )}
                        {ml.statusz === 'Jóváhagyott' && (
                          <button
                            type="button"
                            disabled={listaMentes === ml.id}
                            title="Folyószámlára emelés"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                !confirm(
                                  'Folyószámlára emelés — végleges művelet, nem vonható vissza. Folytatod?',
                                )
                              ) {
                                return;
                              }
                              listaStatuszValtas(e, ml.id, 'Számfejtett');
                            }}
                            className="rounded px-1.5 py-0.5 text-xs hover:bg-cream-muted"
                          >
                            $
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {ujNyitva && (
        <UjMunkalapModal
          bezar={() => setUjNyitva(false)}
          utana={(id) => {
            setUjNyitva(false);
            navigate(`/belso/berszamfejtes/${id}`);
          }}
          setHiba={setHiba}
        />
      )}
    </div>
  );
}

function UjMunkalapModal({
  bezar,
  utana,
  setHiba,
}: {
  bezar: () => void;
  utana: (id: number) => void;
  setHiba: (v: string | null) => void;
}) {
  const [projektek, setProjektek] = useState<Projekt[]>([]);
  const [projektId, setProjektId] = useState('');
  const [nev, setNev] = useState('');
  const [szf, setSzf] = useState('2026-06');
  const [telj, setTelj] = useState('2026-06');
  const [kuldes, setKuldes] = useState(false);

  useEffect(() => {
    getProjektek()
      .then((d) => setProjektek(d.sorok))
      .catch(() => setProjektek([]));
  }, []);

  async function mentes(e: React.FormEvent) {
    e.preventDefault();
    setKuldes(true);
    try {
      const r = await ujMunkalap({
        projekt_id: Number(projektId),
        nev: nev || undefined,
        szf_idoszak: szf,
        telj_idoszak: telj,
      });
      if (r.munkalap) utana(r.munkalap.id);
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
        <h2 className="mb-4 text-lg font-bold text-navy">Új munkalap</h2>
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase text-text-muted">
            Projekt *
            <select
              required
              value={projektId}
              onChange={(e) => setProjektId(e.target.value)}
              className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
            >
              <option value="">Válassz…</option>
              {projektek.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.azonosito} — {p.nev}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-text-muted">
            Megnevezés
            <input
              value={nev}
              onChange={(e) => setNev(e.target.value)}
              className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold uppercase text-text-muted">
              Telj. időszak
              <input
                required
                value={telj}
                onChange={(e) => setTelj(e.target.value)}
                placeholder="2026-06"
                className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold uppercase text-text-muted">
              Sz.f. időszak *
              <input
                required
                value={szf}
                onChange={(e) => setSzf(e.target.value)}
                placeholder="2026-06"
                className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={bezar} className="rounded-btn border px-4 py-2 text-sm">
            Mégse
          </button>
          <button
            type="submit"
            disabled={kuldes}
            className="rounded-btn bg-navy px-4 py-2 text-sm text-cream disabled:opacity-50"
          >
            Létrehozás
          </button>
        </div>
      </form>
    </div>
  );
}

export function FolyoszamlaListaPage() {
  const [sorok, setSorok] = useState<Munkalap[]>([]);
  const [szf, setSzf] = useState('');
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      setToltes(true);
      getMunkalapok({ szf_idoszak: szf || undefined, nezet: 'folyoszamla' })
        .then((d) => {
          setSorok(d.sorok);
          setHiba(null);
        })
        .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
        .finally(() => setToltes(false));
    }, 200);
    return () => clearTimeout(t);
  }, [szf]);

  const osszBrutto = sorok.reduce((s, ml) => s + (ml.ossz_brutto ?? 0), 0);
  const osszOra = sorok.reduce((s, ml) => s + (ml.ossz_ora ?? 0), 0);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4">
        <SegmentBar active="folyoszamla" />
        <h1 className="mt-3 text-xl font-bold text-navy">Bérszámfejtés — folyószámla</h1>
        <p className="text-sm text-text-muted">
          Számfejtett munkalapok ledger nézet — {sorok.length} tétel, {osszOra.toFixed(1)} óra,{' '}
          {ft(osszBrutto)}
        </p>
      </div>

      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-3">
        <input
          placeholder="Számfejtési időszak (ÉÉÉÉ-HH)…"
          value={szf}
          onChange={(e) => setSzf(e.target.value)}
          className="field-input min-w-[180px]"
        />
      </div>

      <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-muted text-left text-[11px] font-bold uppercase text-text-muted">
            <tr>
              <th className="px-2 py-2">Azonosító</th>
              <th className="px-2 py-2">Projekt</th>
              <th className="px-2 py-2">Sz.f. időszak</th>
              <th className="px-2 py-2">Diákok</th>
              <th className="px-2 py-2">Óra</th>
              <th className="px-2 py-2">Bruttó</th>
              <th className="px-2 py-2">Lezárva</th>
            </tr>
          </thead>
          <tbody>
            {toltes ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                  Betöltés…
                </td>
              </tr>
            ) : sorok.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                  Nincs folyószámlán szereplő munkalap.
                </td>
              </tr>
            ) : (
              sorok.map((ml) => (
                <tr
                  key={ml.id}
                  className="cursor-pointer border-t border-border hover:bg-cream-muted/40"
                  onClick={() => navigate(`/belso/berszamfejtes/${ml.id}`)}
                >
                  <td className="px-2 py-2 font-mono text-xs font-semibold text-[#1C4E7A]">
                    {ml.azonosito}
                  </td>
                  <td className="px-2 py-2">
                    {ml.projekt_azonosito} — {ml.projekt_nev}
                  </td>
                  <td className="px-2 py-2 tabular-nums">{ml.szf_idoszak}</td>
                  <td className="px-2 py-2 tabular-nums">{ml.diakok.length}</td>
                  <td className="px-2 py-2 tabular-nums">{(ml.ossz_ora ?? 0).toFixed(1)}</td>
                  <td className="px-2 py-2 tabular-nums font-semibold">{ft(ml.ossz_brutto ?? 0)}</td>
                  <td className="px-2 py-2 text-xs text-text-muted">
                    {new Date(ml.letrehozva).toLocaleDateString('hu-HU')}
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

export function MunkalapReszletPage() {
  const { id } = useParams();
  const mlId = Number(id);
  const navigate = useNavigate();
  const [ml, setMl] = useState<Munkalap | null>(null);
  const [berKodok, setBerKodok] = useState<BerKod[]>([]);
  const [tagMeta, setTagMeta] = useState<Record<string, MunkalapTagMeta>>({});
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [kinyitottDiak, setKinyitottDiak] = useState<number | null>(null);
  const [diakKeresMod, setDiakKeresMod] = useState<'munkalapon' | 'kereses'>('munkalapon');
  const [tagKeres, setTagKeres] = useState('');
  const [tagKeresIroda, setTagKeresIroda] = useState('mind');
  const [tagKeresTagsag, setTagKeresTagsag] = useState('mind');
  const [tagKeresIskola, setTagKeresIskola] = useState('');
  const [tagEredmeny, setTagEredmeny] = useState<SzovetkezetiTag[]>([]);
  const [kijeloltTagok, setKijeloltTagok] = useState<Set<number>>(new Set());
  const [jelenletNyitva, setJelenletNyitva] = useState(false);

  function alkalmazReszlet(d: {
    munkalap: Munkalap;
    ber_kodok: BerKod[];
    tag_meta?: Record<string, MunkalapTagMeta>;
  }) {
    setMl(d.munkalap);
    setBerKodok(d.ber_kodok);
    setTagMeta(d.tag_meta ?? {});
  }

  async function betolt() {
    setToltes(true);
    try {
      const d = await getMunkalap(mlId);
      alkalmazReszlet(d);
      setHiba(null);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    if (mlId) betolt();
  }, [mlId]);

  useEffect(() => {
    if (diakKeresMod !== 'kereses') return;
    const t = setTimeout(() => {
      getTagok({
        keres: tagKeres || undefined,
        iroda: tagKeresIroda !== 'mind' ? tagKeresIroda : undefined,
        tagsag: tagKeresTagsag !== 'mind' ? tagKeresTagsag : undefined,
        iskola: tagKeresIskola || undefined,
      })
        .then((d) => setTagEredmeny(d.sorok))
        .catch(() => setTagEredmeny([]));
    }, 250);
    return () => clearTimeout(t);
  }, [tagKeres, tagKeresIroda, tagKeresTagsag, tagKeresIskola, diakKeresMod]);

  async function korrekcioInditas() {
    if (!confirm('Korrekciós munkalap indítása a számfejtett munkalap alapján?')) return;
    try {
      const r = await munkalapKorrekcioInditas(mlId);
      navigate(`/belso/berszamfejtes/${r.munkalap.id}`);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function statuszValtas(uj: string) {
    if (uj === 'Számfejtett') {
      if (
        !confirm('Folyószámlára emelés — végleges művelet, nem vonható vissza. Folytatod?')
      ) {
        return;
      }
    }
    try {
      const r = await mentMunkalap(mlId, { statusz: uj });
      alkalmazReszlet({ munkalap: r.munkalap, ber_kodok: r.ber_kodok ?? berKodok });
      setUzenet(`Státusz: ${uj}`);
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function torles() {
    if (!confirm('Munkalap törlése?')) return;
    try {
      await torolMunkalap(mlId);
      navigate('/belso/berszamfejtes');
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function mentDiakNaptar(frissitett: MunkalapDiak) {
    if (!ml) return;
    const diakok = ml.diakok.map((d) =>
      d.student_id === frissitett.student_id ? frissitett : d,
    );
    const r = await mentMunkalap(mlId, { diakok });
    alkalmazReszlet({ munkalap: r.munkalap, ber_kodok: r.ber_kodok ?? berKodok });
    setUzenet('Naptár mentve');
    setTimeout(() => setUzenet(null), 2000);
  }

  async function hozzaadKijeloltTagok() {
    const ids = [...kijeloltTagok];
    if (!ids.length) return;
    try {
      const r = await munkalapDiakHozzaad(mlId, ids);
      alkalmazReszlet(r);
      setKijeloltTagok(new Set());
      setUzenet(`${ids.length} diák hozzáadva`);
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function torolDiak(studentId: number) {
    if (!confirm('Diák eltávolítása a munkalapról?')) return;
    try {
      const r = await munkalapDiakTorol(mlId, studentId);
      alkalmazReszlet(r);
      if (kinyitottDiak === studentId) setKinyitottDiak(null);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  async function jelenletHozzarendel(jelenletIds: number[], defaultKod: string) {
    try {
      const r = await munkalapJelenletHozzarendel(mlId, jelenletIds, defaultKod);
      alkalmazReszlet(r);
      setJelenletNyitva(false);
      setUzenet('Jelenlétek hozzárendelve');
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    }
  }

  if (toltes && !ml) {
    return <p className="bg-cream p-6 text-text-muted">Betöltés…</p>;
  }

  if (!ml) {
    return (
      <div className="bg-cream p-6">
        <p className="text-danger">Munkalap nem található.</p>
        <Link to="/belso/berszamfejtes" className="text-sm text-[#2C7BD6]">
          ← Vissza
        </Link>
      </div>
    );
  }

  const st = MUNKALAP_STATUS_BETU[ml.statusz] ?? { l: '?', c: '#8A8570' };
  const resolved = ml.statusz !== 'Piszkozat' && ml.statusz !== 'Korrekció Piszkozat';
  const szerkesztheto = munkalapSzerkesztheto(ml.statusz);
  const bontas = munkalapBontas(ml, berKodok);
  const bontasOra = bontas.reduce((s, r) => s + r.mennyiseg, 0);
  const bontasBrutto = bontas.reduce((s, r) => s + r.osszesen, 0);

  return (
    <div className="min-h-screen bg-cream p-6">
      <Link to="/belso/berszamfejtes" className="text-sm font-semibold text-[#2C7BD6] hover:underline">
        ← Munkalapok
      </Link>

      {hiba && <p className="mt-2 text-sm text-danger">{hiba}</p>}
      {uzenet && <p className="mt-2 text-sm text-success">{uzenet}</p>}

      {ml.korrekcio_szulo_id && (
        <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-navy">
          Korrekciós munkalap —{' '}
          <Link
            to={`/belso/berszamfejtes/${ml.korrekcio_szulo_id}`}
            className="font-semibold text-[#2C7BD6] hover:underline"
          >
            szülő munkalap megnyitása
          </Link>
        </div>
      )}

      {ml.statusz === 'Számfejtett' && (
        <div className="mt-3 rounded-lg border border-[#1C4E7A]/30 bg-[#1C4E7A]/10 px-4 py-3 text-sm text-navy">
          Ez a munkalap folyószámlán van — végleges állapot, nem módosítható.
        </div>
      )}

      <div className="mt-4 rounded-card border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white"
              style={{ background: st.c }}
            >
              {st.l}
            </span>
            <div>
              <h1 className="text-xl font-bold text-navy">{ml.azonosito}</h1>
              <p className="text-sm text-text-muted">
                {ml.projekt_azonosito} — {ml.projekt_nev} · {ml.statusz}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ml.statusz === 'Piszkozat' && (
              <button
                type="button"
                onClick={() => statuszValtas('Lezárt')}
                className="rounded-btn bg-navy px-3 py-1.5 text-xs font-semibold text-cream"
              >
                Lezárás
              </button>
            )}
            {ml.statusz === 'Lezárt' && (
              <>
                <button
                  type="button"
                  onClick={() => statuszValtas('Piszkozat')}
                  className="rounded-btn border px-3 py-1.5 text-xs font-semibold"
                >
                  ↺ Piszkozat
                </button>
                <button
                  type="button"
                  onClick={() => statuszValtas('Jóváhagyott')}
                  className="rounded-btn bg-success px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Jóváhagyás
                </button>
                <button
                  type="button"
                  onClick={() => statuszValtas('Elutasított')}
                  className="rounded-btn border border-danger px-3 py-1.5 text-xs font-semibold text-danger"
                >
                  Elutasítás
                </button>
              </>
            )}
            {ml.statusz === 'Jóváhagyott' && (
              <>
                <button
                  type="button"
                  onClick={() => statuszValtas('Számfejtett')}
                  className="rounded-btn bg-[#1C4E7A] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Folyószámlára emelés
                </button>
                <button
                  type="button"
                  onClick={() => statuszValtas('Lezárt')}
                  className="rounded-btn border px-3 py-1.5 text-xs font-semibold"
                >
                  ↺ Lezárt
                </button>
              </>
            )}
            {ml.statusz === 'Elutasított' && (
              <button
                type="button"
                onClick={() => statuszValtas('Piszkozat')}
                className="rounded-btn border px-3 py-1.5 text-xs font-semibold"
              >
                Vissza piszkozatba
              </button>
            )}
            {ml.statusz === 'Számfejtett' && !ml.korrekcio_szulo_id && (
              <button
                type="button"
                onClick={korrekcioInditas}
                className="rounded-btn border border-gold bg-gold/10 px-3 py-1.5 text-xs font-semibold text-navy"
              >
                Korrekció indítása
              </button>
            )}
            {ml.statusz === 'Korrekció Piszkozat' && (
              <button
                type="button"
                onClick={() => statuszValtas('Korrekció Lezárt')}
                className="rounded-btn bg-navy px-3 py-1.5 text-xs font-semibold text-cream"
              >
                Korrekció lezárása
              </button>
            )}
            {ml.statusz === 'Korrekció Lezárt' && (
              <>
                <button
                  type="button"
                  onClick={() => statuszValtas('Korrekció Piszkozat')}
                  className="rounded-btn border px-3 py-1.5 text-xs font-semibold"
                >
                  ↺ Korrekció piszkozat
                </button>
                <button
                  type="button"
                  onClick={() => statuszValtas('Korrekció Jóváhagyott')}
                  className="rounded-btn bg-success px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Korrekció jóváhagyása
                </button>
                <button
                  type="button"
                  onClick={() => statuszValtas('Korrekció Elutasított')}
                  className="rounded-btn border border-danger px-3 py-1.5 text-xs font-semibold text-danger"
                >
                  Korrekció elutasítása
                </button>
              </>
            )}
            {ml.statusz === 'Korrekció Jóváhagyott' && (
              <>
                <button
                  type="button"
                  onClick={() => statuszValtas('Számfejtett')}
                  className="rounded-btn bg-[#1C4E7A] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Folyószámlára emelés
                </button>
                <button
                  type="button"
                  onClick={() => statuszValtas('Korrekció Lezárt')}
                  className="rounded-btn border px-3 py-1.5 text-xs font-semibold"
                >
                  ↺ Korrekció lezárt
                </button>
              </>
            )}
            {ml.statusz === 'Korrekció Elutasított' && (
              <button
                type="button"
                onClick={() => statuszValtas('Korrekció Piszkozat')}
                className="rounded-btn border px-3 py-1.5 text-xs font-semibold"
              >
                Vissza korrekció piszkozatba
              </button>
            )}
            {ml.statusz !== 'Számfejtett' && (
              <button
                type="button"
                onClick={torles}
                className="rounded-btn border border-danger px-3 py-1.5 text-xs text-danger"
              >
                Törlés
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoKartya label="Teljesítési időszak" value={ml.telj_idoszak} />
          <InfoKartya label="Számfejtési időszak" value={ml.szf_idoszak} />
          <InfoKartya label="Összes bruttó" value={ml.ossz_brutto != null ? ft(ml.ossz_brutto) : '—'} />
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-navy">Controlling ellenőrzés</h2>
          <MunkalapControllingPanel controlling={ml.controlling} resolved={resolved} />
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-navy">Kifizetés bontás</h2>
          <div className="overflow-auto rounded-card border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-cream-muted text-left text-[11px] uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2">Azonosító</th>
                  <th className="px-3 py-2">Megnevezés</th>
                  <th className="px-3 py-2">Egységár</th>
                  <th className="px-3 py-2">Mennyiség</th>
                  <th className="px-3 py-2">Összesen</th>
                </tr>
              </thead>
              <tbody>
                {bontas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                      Nincs rögzített kifizetés.
                    </td>
                  </tr>
                ) : (
                  <>
                    {bontas.map((sor) => (
                      <tr key={sor.azonosito} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">{sor.azonosito}</td>
                        <td className="px-3 py-2">{sor.megnevezes}</td>
                        <td className="px-3 py-2 tabular-nums">{ft(sor.egysegar)}</td>
                        <td className="px-3 py-2 tabular-nums">{sor.mennyiseg.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular-nums font-semibold">{ft(sor.osszesen)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border bg-cream-muted/50 font-semibold">
                      <td className="px-3 py-2" colSpan={3} />
                      <td className="px-3 py-2 tabular-nums">{bontasOra.toFixed(1)}</td>
                      <td className="px-3 py-2 tabular-nums">{ft(bontasBrutto)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-navy">Diákok ({ml.diakok.length})</h2>
            {szerkesztheto && (
              <button
                type="button"
                onClick={() => setJelenletNyitva(true)}
                className="rounded-btn border border-border px-3 py-1.5 text-xs font-semibold text-navy"
              >
                Jelenlétek hozzárendelése
              </button>
            )}
          </div>

          <div className="mb-3 inline-flex gap-0.5 rounded-btn bg-cream-muted p-1">
            <button
              type="button"
              onClick={() => setDiakKeresMod('munkalapon')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                diakKeresMod === 'munkalapon' ? 'bg-card text-navy shadow-sm' : 'text-text-muted'
              }`}
            >
              Munkalapon lévők ({ml.diakok.length})
            </button>
            <button
              type="button"
              disabled={!szerkesztheto}
              onClick={() => setDiakKeresMod('kereses')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                diakKeresMod === 'kereses' ? 'bg-card text-navy shadow-sm' : 'text-text-muted'
              }`}
            >
              Teljes tagságból keresés
            </button>
          </div>

          {diakKeresMod === 'kereses' && szerkesztheto ? (
            <div className="rounded-card border border-border bg-card p-4">
              <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  placeholder="Keresés név vagy azonosító alapján…"
                  value={tagKeres}
                  onChange={(e) => setTagKeres(e.target.value)}
                  className="field-input w-full sm:col-span-2"
                />
                <select
                  value={tagKeresIroda}
                  onChange={(e) => setTagKeresIroda(e.target.value)}
                  className="field-input w-full"
                >
                  <option value="mind">Minden iroda</option>
                  {TAG_IRODAK.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <select
                  value={tagKeresTagsag}
                  onChange={(e) => setTagKeresTagsag(e.target.value)}
                  className="field-input w-full"
                >
                  <option value="mind">Minden tagság</option>
                  {TAGSAG_STATUSZOK.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <input
                placeholder="Iskola szűrő…"
                value={tagKeresIskola}
                onChange={(e) => setTagKeresIskola(e.target.value)}
                className="field-input mb-3 w-full"
              />
              <div className="max-h-[280px] space-y-1 overflow-auto">
                {tagEredmeny.map((t) => {
                  const marRajta = ml.diakok.some((d) => d.student_id === t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                        marRajta ? 'bg-cream-muted/80 opacity-60' : 'hover:bg-cream-muted/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={marRajta}
                        checked={kijeloltTagok.has(t.id)}
                        onChange={(e) => {
                          setKijeloltTagok((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(t.id);
                            else next.delete(t.id);
                            return next;
                          });
                        }}
                      />
                      <span className="font-medium">{t.nev}</span>
                      <span className="text-xs text-text-muted">{t.adoszam}</span>
                      <span className="rounded bg-cream-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                        {t.tagsag_statusz}
                      </span>
                      <span className="rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-navy">
                        {t.iroda}
                      </span>
                      {t.iskola && (
                        <span className="truncate text-[10px] text-text-muted">{t.iskola}</span>
                      )}
                      {marRajta && (
                        <span className="ml-auto text-[10px] font-semibold text-success">már a munkalapon</span>
                      )}
                    </label>
                  );
                })}
                {tagEredmeny.length === 0 && (
                  <p className="py-4 text-center text-sm text-text-muted">Nincs találat.</p>
                )}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={kijeloltTagok.size === 0}
                  onClick={hozzaadKijeloltTagok}
                  className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Kijelöltek hozzáadása ({kijeloltTagok.size})
                </button>
              </div>
            </div>
          ) : ml.diakok.length === 0 ? (
            <p className="text-sm text-text-muted">
              {szerkesztheto
                ? 'Még nincs diák — keress a tagságból, vagy rendelj hozzá jelenléteket.'
                : 'Nincs diák a munkalapon.'}
            </p>
          ) : (
            <div className="space-y-2">
              {ml.diakok.map((d) => {
                const { brutto, orak } = diakBruttoOra(d, berKodok);
                const napok = Object.keys(d.idoadatok ?? {}).length;
                const nyitva = kinyitottDiak === d.student_id;
                return (
                  <div key={d.student_id} className="rounded-card border border-border bg-card">
                    <div
                      className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3"
                      onClick={() =>
                        setKinyitottDiak(nyitva ? null : d.student_id)
                      }
                    >
                      <span className="text-text-muted">{nyitva ? '▾' : '▸'}</span>
                      <span className="flex-1 font-medium">
                        {d.student_nev ?? `Tag #${d.student_id}`}
                      </span>
                      {tagMeta[String(d.student_id)] && (
                        <span className="hidden text-[10px] text-text-muted lg:inline">
                          NAV: {tagMeta[String(d.student_id)].nav_bejelentes ?? '—'} · Adószám:{' '}
                          {tagMeta[String(d.student_id)].adoszam ?? '—'}
                        </span>
                      )}
                      <span className="text-xs text-text-muted">{napok} nap</span>
                      <span className="tabular-nums text-sm">{orak.toFixed(1)} óra</span>
                      <span className="tabular-nums text-sm font-semibold">{ft(brutto)}</span>
                      {szerkesztheto && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            torolDiak(d.student_id);
                          }}
                          className="text-xs text-danger hover:underline"
                        >
                          Eltávolítás
                        </button>
                      )}
                    </div>
                    {nyitva && (
                      <div className="border-t border-border px-4 pb-4">
                        {tagMeta[String(d.student_id)] && (
                          <div className="mb-3 mt-3 grid gap-2 rounded-lg bg-cream-muted/50 p-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
                            <div>
                              <span className="text-text-muted">Azonosító</span>
                              <p className="font-semibold text-navy">
                                {tagMeta[String(d.student_id)].azonosito}
                              </p>
                            </div>
                            <div>
                              <span className="text-text-muted">Születési dátum</span>
                              <p className="font-semibold">{tagMeta[String(d.student_id)].szuldat ?? '—'}</p>
                            </div>
                            <div>
                              <span className="text-text-muted">Adószám</span>
                              <p className="font-semibold">{tagMeta[String(d.student_id)].adoszam ?? '—'}</p>
                            </div>
                            <div>
                              <span className="text-text-muted">NAV bejelentés</span>
                              <p className="font-semibold">
                                {tagMeta[String(d.student_id)].nav_bejelentes ?? '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-text-muted">Tagság kezdete</span>
                              <p className="font-semibold">
                                {tagMeta[String(d.student_id)].tagsag_kezdete ?? '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-text-muted">Tagság vége</span>
                              <p className="font-semibold">
                                {tagMeta[String(d.student_id)].tagsag_vege ?? '—'}
                              </p>
                            </div>
                          </div>
                        )}
                        <MunkalapDiakNaptar
                          szfIdoszak={ml.szf_idoszak}
                          diak={d}
                          berKodok={berKodok}
                          szerkesztheto={szerkesztheto}
                          onMentes={mentDiakNaptar}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {jelenletNyitva && ml && (
          <JelenletHozzarendelesModal
            munkalap={ml}
            berKodok={berKodok}
            bezar={() => setJelenletNyitva(false)}
            mentes={jelenletHozzarendel}
          />
        )}

      </div>
    </div>
  );
}

function InfoKartya({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-cream-muted/50 p-3">
      <p className="text-[11px] font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

function JelenletHozzarendelesModal({
  munkalap,
  berKodok,
  bezar,
  mentes,
}: {
  munkalap: Munkalap;
  berKodok: BerKod[];
  bezar: () => void;
  mentes: (ids: number[], defaultKod: string) => Promise<void>;
}) {
  const [sorok, setSorok] = useState<
    Awaited<ReturnType<typeof getMunkalapJelenletek>>['sorok']
  >([]);
  const [kijelolt, setKijelolt] = useState<Set<number>>(new Set());
  const [defaultKod, setDefaultKod] = useState(berKodok[0]?.id ?? '1');
  const [toltes, setToltes] = useState(true);
  const [kuldes, setKuldes] = useState(false);

  useEffect(() => {
    getMunkalapJelenletek({ projekt_id: munkalap.projekt_id })
      .then((d) => {
        const szf = munkalap.szf_idoszak;
        setSorok(
          d.sorok.filter(
            (s) =>
              s.muszak_datum?.startsWith(szf) &&
              (s.statusz === 'pv_véglegesített' || s.statusz === 'jóváhagyva'),
          ),
        );
      })
      .catch(() => setSorok([]))
      .finally(() => setToltes(false));
  }, [munkalap.projekt_id, munkalap.szf_idoszak]);

  async function submit() {
    setKuldes(true);
    try {
      await mentes([...kijelolt], defaultKod);
    } finally {
      setKuldes(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-card border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-bold text-navy">Jelenlétek hozzárendelése</h2>
        <p className="mb-4 text-sm text-text-muted">
          {munkalap.projekt_azonosito} · {munkalap.szf_idoszak} időszak · csak PV véglegesített jelenlétek
        </p>
        <label className="mb-3 text-xs font-semibold uppercase text-text-muted">
          Alapértelmezett kifizetési kód
          <select
            value={defaultKod}
            onChange={(e) => setDefaultKod(e.target.value)}
            className="mt-1 w-full rounded-btn border border-border-input px-3 py-2 text-sm"
          >
            {berKodok.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nev ?? k.id} ({k.ar} Ft)
              </option>
            ))}
          </select>
        </label>
        <div className="flex-1 overflow-auto rounded-lg border border-border">
          {toltes ? (
            <p className="p-6 text-center text-text-muted">Betöltés…</p>
          ) : sorok.length === 0 ? (
            <p className="p-6 text-center text-sm text-text-muted">
              Nincs jóváhagyott jelenlét ebben az időszakban ehhez a projekthez.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-cream-muted text-left text-[10px] uppercase text-text-muted">
                <tr>
                  <th className="px-2 py-2" />
                  <th className="px-2 py-2">Diák</th>
                  <th className="px-2 py-2">Dátum</th>
                  <th className="px-2 py-2">Műszak</th>
                  <th className="px-2 py-2">HRM érkezés</th>
                  <th className="px-2 py-2">HRM távozás</th>
                  <th className="px-2 py-2">QR érkezés</th>
                  <th className="px-2 py-2">QR távozás</th>
                  <th className="px-2 py-2">Státusz</th>
                </tr>
              </thead>
              <tbody>
                {sorok.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={kijelolt.has(s.id)}
                        onChange={(e) => {
                          setKijelolt((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(s.id);
                            else next.delete(s.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="px-2 py-2">{s.diak_nev}</td>
                    <td className="px-2 py-2 text-xs">{s.muszak_datum}</td>
                    <td className="px-2 py-2 text-xs">
                      {s.muszak_kezdet}–{s.muszak_vege}
                    </td>
                    <td className="px-2 py-2 text-xs">{s.erkezes_ora ?? '—'}</td>
                    <td className="px-2 py-2 text-xs">{s.tavozas_ora ?? '—'}</td>
                    <td className="px-2 py-2 text-xs">{s.qr_erkezes_ora ?? '—'}</td>
                    <td className="px-2 py-2 text-xs">{s.qr_tavozas_ora ?? '—'}</td>
                    <td className="px-2 py-2 text-xs">{s.statusz}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={bezar} className="rounded-btn border px-4 py-2 text-sm">
            Mégse
          </button>
          <button
            type="button"
            disabled={kuldes || kijelolt.size === 0}
            onClick={submit}
            className="rounded-btn bg-navy px-4 py-2 text-sm text-cream disabled:opacity-50"
          >
            Hozzárendelés ({kijelolt.size})
          </button>
        </div>
      </div>
    </div>
  );
}

export function JelenletekListaPage() {
  const [sorok, setSorok] = useState<
    Awaited<ReturnType<typeof getMunkalapJelenletek>>['sorok']
  >([]);
  const [projektId, setProjektId] = useState('');
  const [projektek, setProjektek] = useState<Projekt[]>([]);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);

  useEffect(() => {
    getProjektek()
      .then((d) => setProjektek(d.sorok))
      .catch(() => setProjektek([]));
  }, []);

  useEffect(() => {
    setToltes(true);
    getMunkalapJelenletek(projektId ? { projekt_id: Number(projektId) } : undefined)
      .then((d) => {
        setSorok(d.sorok);
        setHiba(null);
      })
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [projektId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4">
        <SegmentBar active="jelenletek" />
        <h1 className="mt-3 text-xl font-bold text-navy">Bérszámfejtés — jelenlétek</h1>
        <p className="text-sm text-text-muted">
          Beosztáskezelőből származó jelenlétek — hozzárendelés munkalaphoz a munkalap részleten.
        </p>
      </div>

      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}

      <div className="mb-3">
        <select
          value={projektId}
          onChange={(e) => setProjektId(e.target.value)}
          className="field-input w-auto min-w-[240px]"
        >
          <option value="">Minden projekt</option>
          {projektek.map((p) => (
            <option key={p.id} value={p.id}>
              {p.azonosito} — {p.nev}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-muted text-left text-[11px] font-bold uppercase text-text-muted">
            <tr>
              <th className="px-2 py-2">Diák</th>
              <th className="px-2 py-2">Projekt</th>
              <th className="px-2 py-2">Dátum</th>
              <th className="px-2 py-2">Műszak</th>
              <th className="px-2 py-2">HRM érkezés</th>
              <th className="px-2 py-2">HRM távozás</th>
              <th className="px-2 py-2">QR érkezés</th>
              <th className="px-2 py-2">QR távozás</th>
              <th className="px-2 py-2">Státusz</th>
            </tr>
          </thead>
          <tbody>
            {toltes ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-text-muted">
                  Betöltés…
                </td>
              </tr>
            ) : sorok.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-text-muted">
                  Nincs jelenlét.
                </td>
              </tr>
            ) : (
              sorok.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-2 py-2 font-medium">{s.diak_nev}</td>
                  <td className="px-2 py-2 text-xs">{s.projekt_azonosito ?? '—'}</td>
                  <td className="px-2 py-2 text-xs">{s.muszak_datum ?? '—'}</td>
                  <td className="px-2 py-2 text-xs">
                    {s.muszak_kezdet}–{s.muszak_vege}
                  </td>
                  <td className="px-2 py-2 text-xs">{s.erkezes_ora ?? '—'}</td>
                  <td className="px-2 py-2 text-xs">{s.tavozas_ora ?? '—'}</td>
                  <td className="px-2 py-2 text-xs">{s.qr_erkezes_ora ?? '—'}</td>
                  <td className="px-2 py-2 text-xs">{s.qr_tavozas_ora ?? '—'}</td>
                  <td className="px-2 py-2 text-xs">{s.statusz}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
