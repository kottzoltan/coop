import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  TAG_IRODAK,
  TAG_ISKOLAK,
  DIAKIG_MUNKARENDEK,
  DIAKIG_TIPUS_LABEL,
  DIAKIG_TIPUSOK,
  tagDiakigFigyelmeztetes,
  tagHianyossagok,
  type SzovetkezetiTag,
} from '@coop/shared';
import { TAGSAG_STATUSZOK } from '@coop/shared';
import { getTagok, getTag, mentTag, tagAtembeles, tagTomegesMuvelet, ujTag } from '../../api/coop';
import { MuveletekMenu } from '../../components/belso/MuveletekMenu';
import { TagDokumentumokPanel } from '../../components/belso/tag/TagDokumentumokPanel';
import { TagHianyossagPanel } from '../../components/belso/tag/TagHianyossagPanel';
import { TagSzjaKedvezmenyek } from '../../components/belso/tag/TagSzjaKedvezmenyek';
import { TagJogviszonyPanel } from '../../components/belso/tag/TagJogviszonyPanel';
import { letoltRiport } from '../../utils/riport';

function tagsagBadge(statusz: string) {
  const map: Record<string, string> = {
    érvényes: 'bg-success-bg text-success',
    érvénytelen: 'bg-danger-bg text-danger',
    piszkozat: 'bg-cream-muted text-text-muted',
  };
  return map[statusz] ?? 'bg-cream-muted text-text-muted';
}

export function TagokListaPage() {
  const [sorok, setSorok] = useState<SzovetkezetiTag[]>([]);
  const [osszes, setOsszes] = useState(0);
  const [keres, setKeres] = useState('');
  const [tagsag, setTagsag] = useState('mind');
  const [iroda, setIroda] = useState('mind');
  const [csakHiany, setCsakHiany] = useState(false);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [ujNyitva, setUjNyitva] = useState(false);
  const [ujNev, setUjNev] = useState('');
  const [ujAdo, setUjAdo] = useState('');
  const [ujEmail, setUjEmail] = useState('');
  const [ujTel, setUjTel] = useState('');
  const [ujIroda, setUjIroda] = useState<string>(TAG_IRODAK[0]);
  const [ujIskola, setUjIskola] = useState<string>(TAG_ISKOLAK[0]);
  const [kuldes, setKuldes] = useState(false);
  const [kijelolt, setKijelolt] = useState<Set<number>>(new Set());
  const [tomegesKuldes, setTomegesKuldes] = useState(false);
  const navigate = useNavigate();

  async function betolt() {
    setToltes(true);
    setHiba(null);
    try {
      const d = await getTagok({
        keres: keres || undefined,
        tagsag: tagsag !== 'mind' ? tagsag : undefined,
        iroda: iroda !== 'mind' ? iroda : undefined,
        hianyossag: csakHiany || undefined,
      });
      setSorok(d.sorok);
      setOsszes(d.osszes);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setToltes(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      betolt().catch(() => setToltes(false));
    }, 200);
    return () => clearTimeout(t);
  }, [keres, tagsag, iroda, csakHiany]);

  async function letrehoz(e: React.FormEvent) {
    e.preventDefault();
    setKuldes(true);
    setHiba(null);
    try {
      const r = await ujTag({
        nev: ujNev,
        adoszam: ujAdo,
        email: ujEmail,
        telefon: ujTel || null,
        iroda: ujIroda,
        iskola: ujIskola,
        tagsag_statusz: 'piszkozat',
      });
      setUjNyitva(false);
      navigate(`/belso/tagok/${r.tag.id}`);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  async function tomegesMuvelet(akcio: 'lezaras' | 'kileptetes' | 'ervenyes') {
    if (!kijelolt.size) return;
    setTomegesKuldes(true);
    setHiba(null);
    try {
      await tagTomegesMuvelet([...kijelolt], akcio);
      setKijelolt(new Set());
      await betolt();
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Tömeges művelet sikertelen');
    } finally {
      setTomegesKuldes(false);
    }
  }

  function toggleKijelolt(id: number) {
    setKijelolt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Szövetkezeti tagok</h1>
          <p className="text-sm text-text-muted">
            {sorok.length} tag a szűrésnek megfelelően · {osszes} összesen
          </p>
        </div>
        <div className="flex gap-2">
          <MuveletekMenu
            muveletek={[
              {
                label: 'Tag adat export (CSV)',
                onClick: async () => {
                  try {
                    await letoltRiport('tagok');
                  } catch (e) {
                    setHiba(e instanceof Error ? e.message : 'Riport hiba');
                  }
                },
              },
              ...(kijelolt.size
                ? ([
                    {
                      label: `Tagság érvényes (${kijelolt.size})`,
                      onClick: () => tomegesMuvelet('ervenyes'),
                    },
                    {
                      label: `Tagság lezárás (${kijelolt.size})`,
                      onClick: () => tomegesMuvelet('lezaras'),
                    },
                    {
                      label: `Kiléptetés (${kijelolt.size})`,
                      onClick: () => tomegesMuvelet('kileptetes'),
                    },
                  ] as const)
                : []),
            ]}
          />
          <button
            type="button"
            onClick={() => setUjNyitva(true)}
            className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-[#a67535]"
          >
            + Új tag
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-card border border-border bg-card p-3">
        <input
          className="field-input min-w-[200px] flex-1"
          placeholder="Keresés név, adószám vagy e-mail alapján…"
          value={keres}
          onChange={(e) => setKeres(e.target.value)}
        />
        <select className="field-input" value={tagsag} onChange={(e) => setTagsag(e.target.value)}>
          <option value="mind">Minden tagság státusz</option>
          {TAGSAG_STATUSZOK.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="field-input" value={iroda} onChange={(e) => setIroda(e.target.value)}>
          <option value="mind">Minden iroda</option>
          {TAG_IRODAK.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-cream-muted px-3 py-2 text-sm font-semibold text-navy">
          <input
            type="checkbox"
            checked={csakHiany}
            onChange={(e) => setCsakHiany(e.target.checked)}
            className="rounded"
          />
          Csak hiányosság
        </label>
      </div>

      {hiba && (
        <p className="mb-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>
      )}

      {toltes ? (
        <p className="text-sm text-text-muted">Betöltés…</p>
      ) : sorok.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
          Nincs a szűrésnek megfelelő tag.
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-card border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-cream-muted">
              <tr>
                <th className="border-b border-border px-3 py-2 w-8" />
                {['Név', 'Adószám', 'Iroda', 'Iskola', 'Tagság', 'Figyelmeztetések'].map((h) => (
                  <th
                    key={h}
                    className="border-b border-border px-3 py-2 text-left text-[11px] font-bold uppercase text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorok.map((s) => {
                const w = tagHianyossagok(s);
                return (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-b border-border hover:bg-cream-muted/50"
                    onClick={() => navigate(`/belso/tagok/${s.id}`)}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={kijelolt.has(s.id)}
                        disabled={tomegesKuldes}
                        onChange={() => toggleKijelolt(s.id)}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-navy">{s.nev}</td>
                    <td className="px-3 py-2.5">{s.adoszam}</td>
                    <td className="px-3 py-2.5">{s.iroda}</td>
                    <td className="px-3 py-2.5">{s.iskola ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          tagsagBadge(s.tagsag_statusz),
                        ].join(' ')}
                      >
                        {s.tagsag_statusz}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {w.length ? (
                        <div className="flex flex-wrap gap-1">
                          {w.map((x) => (
                            <span
                              key={x}
                              className="rounded-md bg-danger-bg px-1.5 py-0.5 text-[10px] font-semibold text-danger"
                            >
                              {x}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ujNyitva && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setUjNyitva(false)}
          role="presentation"
        >
          <form
            className="w-full max-w-md rounded-card bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={letrehoz}
          >
            <h3 className="font-bold text-navy">Új tag felvétele</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Név *
                <input className="field-input mt-1" value={ujNev} onChange={(e) => setUjNev(e.target.value)} required />
              </label>
              <label className="block text-sm">
                Adószám *
                <input className="field-input mt-1" value={ujAdo} onChange={(e) => setUjAdo(e.target.value)} required />
              </label>
              <label className="block text-sm">
                E-mail *
                <input type="email" className="field-input mt-1" value={ujEmail} onChange={(e) => setUjEmail(e.target.value)} required />
              </label>
              <label className="block text-sm">
                Telefon
                <input className="field-input mt-1" value={ujTel} onChange={(e) => setUjTel(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Iroda
                  <select className="field-input mt-1" value={ujIroda} onChange={(e) => setUjIroda(e.target.value)}>
                    {TAG_IRODAK.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Iskola
                  <select className="field-input mt-1" value={ujIskola} onChange={(e) => setUjIskola(e.target.value)}>
                    {TAG_ISKOLAK.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={kuldes}
                className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {kuldes ? 'Létrehozás…' : 'Tag létrehozása'}
              </button>
              <button type="button" onClick={() => setUjNyitva(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
                Mégse
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const TABS = [
  ['alap', 'Alapadatok'],
  ['tagsag', 'Tagsági adatok'],
  ['tanulmany', 'Tanulmányi adatok'],
  ['szja', 'SZJA kedvezmények'],
  ['hianyossag', 'Hiányosságok'],
  ['munka', 'Munkavégzési adatok'],
  ['dokumentum', 'Dokumentumok'],
] as const;

type TabId = (typeof TABS)[number][0];

function hianyPill(v: string) {
  if (v === 'van') return 'bg-success-bg text-success';
  if (v === 'lejárt') return 'bg-warning-bg text-warning';
  return 'bg-danger-bg text-danger';
}

export function TagReszletPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const [tag, setTag] = useState<SzovetkezetiTag | null>(null);
  const [draft, setDraft] = useState<SzovetkezetiTag | null>(null);
  const [tab, setTab] = useState<TabId>('alap');
  const [szerkeszt, setSzerkeszt] = useState(false);
  const [toltes, setToltes] = useState(true);
  const [mentes, setMentes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [atembelesNyitva, setAtembelesNyitva] = useState(false);
  const [atembelesForras, setAtembelesForras] = useState('');
  const [atembelesKuldes, setAtembelesKuldes] = useState(false);

  useEffect(() => {
    if (!id) return;
    setToltes(true);
    getTag(id)
      .then((d) => setTag(d.tag))
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'))
      .finally(() => setToltes(false));
  }, [id]);

  const d = szerkeszt && draft ? draft : tag;

  function mezo<K extends keyof SzovetkezetiTag>(kulcs: K, label: string, type: string = 'text') {
    if (!d) return null;
  const val = d[kulcs];
    if (szerkeszt) {
      if (kulcs === 'diakig_tipus') {
        return (
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase text-text-muted">{label}</span>
            <select
              className="field-input mt-1"
              value={draft!.diakig_tipus ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft!,
                  diakig_tipus: (e.target.value || null) as SzovetkezetiTag['diakig_tipus'],
                })
              }
            >
              <option value="">—</option>
              {DIAKIG_TIPUSOK.map((t) => (
                <option key={t} value={t}>
                  {DIAKIG_TIPUS_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        );
      }
      if (kulcs === 'diakig_munkarend') {
        return (
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase text-text-muted">{label}</span>
            <select
              className="field-input mt-1"
              value={draft!.diakig_munkarend ?? ''}
              onChange={(e) =>
                setDraft({ ...draft!, diakig_munkarend: e.target.value || null })
              }
            >
              <option value="">—</option>
              {DIAKIG_MUNKARENDEK.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        );
      }
      if (kulcs === 'tagsag_statusz') {
        return (
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase text-text-muted">{label}</span>
            <select
              className="field-input mt-1"
              value={String(draft![kulcs])}
              onChange={(e) => setDraft({ ...draft!, tagsag_statusz: e.target.value as SzovetkezetiTag['tagsag_statusz'] })}
            >
              {TAGSAG_STATUSZOK.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        );
      }
      if (['bank', 'eszerz', 'uzemorv', 'tudo'].includes(kulcs)) {
        return (
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase text-text-muted">{label}</span>
            <select
              className="field-input mt-1"
              value={String(draft![kulcs])}
              onChange={(e) =>
                setDraft({
                  ...draft!,
                  [kulcs]: e.target.value as SzovetkezetiTag['bank'],
                })
              }
            >
              {['van', 'nincs', 'lejárt'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        );
      }
      return (
        <label className="block text-sm">
          <span className="text-xs font-bold uppercase text-text-muted">{label}</span>
          <input
            type={type}
            className="field-input mt-1"
            value={val == null ? '' : String(val)}
            onChange={(e) =>
              setDraft({
                ...draft!,
                [kulcs]: type === 'number' ? Number(e.target.value) : e.target.value || null,
              } as SzovetkezetiTag)
            }
          />
        </label>
      );
    }
    return (
      <div>
        <p className="text-xs font-bold uppercase text-text-muted">{label}</p>
        <p className="mt-1 text-sm font-medium text-navy">
          {kulcs === 'diakig_tipus' && d.diakig_tipus
            ? DIAKIG_TIPUS_LABEL[d.diakig_tipus]
            : val == null || val === ''
              ? '—'
              : String(val)}
        </p>
      </div>
    );
  }

  async function ment() {
    if (!draft) return;
    setMentes(true);
    setHiba(null);
    try {
      const r = await mentTag(draft.id, draft);
      setTag(r.tag);
      setSzerkeszt(false);
      setDraft(null);
      setUzenet('Mentve.');
      setTimeout(() => setUzenet(null), 2000);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setMentes(false);
    }
  }

  async function atembelesMent() {
    if (!tag || !atembelesForras.trim()) return;
    setAtembelesKuldes(true);
    setHiba(null);
    try {
      const r = await tagAtembeles(tag.id, atembelesForras.trim());
      setTag(r.tag);
      setAtembelesNyitva(false);
      setAtembelesForras('');
      setUzenet('Tag átemelés kész.');
      setTimeout(() => setUzenet(null), 2500);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Átemelés sikertelen');
    } finally {
      setAtembelesKuldes(false);
    }
  }

  if (toltes) return <p className="p-6 text-sm text-text-muted">Betöltés…</p>;
  if (!tag || !d) {
    return (
      <div className="p-6">
        <p className="text-sm text-danger">{hiba ?? 'Tag nem található'}</p>
        <Link to="/belso/tagok" className="mt-2 inline-block text-sm font-semibold text-[#2C7BD6]">
          ← Vissza
        </Link>
      </div>
    );
  }

  const monogram = tag.nev
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  let tabTartalom: React.ReactNode = null;
  if (tab === 'alap') {
    tabTartalom = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mezo('nev', 'Név')}
        {mezo('adoszam', 'Adószám')}
        {mezo('taj', 'TAJ szám')}
        {mezo('szuldat', 'Születési dátum', 'date')}
        {mezo('email', 'E-mail')}
        {mezo('telefon', 'Telefonszám')}
        {mezo('lakcim', 'Lakcím')}
      </div>
    );
  } else if (tab === 'tagsag') {
    tabTartalom = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mezo('tagsag_statusz', 'Tagság státusz')}
        {mezo('iroda', 'Iroda')}
        {mezo('belepes', 'Belépés dátuma', 'date')}
        {mezo('kilepes', 'Kilépés dátuma', 'date')}
        {mezo('reszjegy', 'Részjegy összeg', 'number')}
      </div>
    );
  } else if (tab === 'tanulmany') {
    const diakigWarn = tagDiakigFigyelmeztetes(d);
    tabTartalom = (
      <div className="space-y-4">
        {diakigWarn && (
          <div className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning">
            {diakigWarn}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mezo('iskola', 'Iskola')}
          {mezo('diakig_tipus', 'Igazolvány típus')}
          {mezo('diakig', 'Diákigazolvány szám')}
          {mezo('diakig_munkarend', 'Munkarend')}
          {mezo('diakig_ervenyes', 'Érvényesség', 'date')}
          {szerkeszt ? (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft?.diakig_online_hosszabbitas ?? false}
                onChange={(e) =>
                  setDraft({ ...draft!, diakig_online_hosszabbitas: e.target.checked })
                }
              />
              <span>Online hosszabbítás folyamatban (FK #06)</span>
            </label>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase text-text-muted">Online hosszabbítás</p>
              <p className="mt-1 text-sm font-medium text-navy">
                {d.diakig_online_hosszabbitas ? 'Igen' : 'Nem'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  } else if (tab === 'szja') {
    tabTartalom = (
      <TagSzjaKedvezmenyek
        tag={d}
        szerkeszt={szerkeszt}
        onChange={(kedvezmenyek) => {
          if (szerkeszt && draft) setDraft({ ...draft, szja_kedvezmenyek: kedvezmenyek });
        }}
      />
    );
  } else if (tab === 'hianyossag') {
    tabTartalom = <TagHianyossagPanel tag={d} />;
  } else if (tab === 'munka') {
    tabTartalom = (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {szerkeszt ? (
            <>
              {mezo('bankszamlaszam', 'Bankszámlaszám')}
              {mezo('bank', 'Bankszámla státusz')}
              {mezo('eszerz', 'Eseti szerződés')}
              {mezo('eszerz_lejar', 'Eseti szerződés lejárata', 'date')}
              {mezo('uzemorv', 'Üzemorvosi')}
              {mezo('uzemorv_lejar', 'Üzemorvosi lejárata', 'date')}
              {mezo('tudo', 'Tüdőszűrő')}
              {mezo('tudo_lejar', 'Tüdőszűrő lejárata', 'date')}
            </>
          ) : (
            <>
              {(
                [
                  ['bank', 'Bankszámla'],
                  ['eszerz', 'Eseti szerződés'],
                  ['uzemorv', 'Üzemorvosi'],
                  ['tudo', 'Tüdőszűrő'],
                ] as const
              ).map(([kulcs, label]) => (
                <div key={kulcs}>
                  <p className="text-xs font-bold uppercase text-text-muted">{label}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${hianyPill(d[kulcs])}`}
                  >
                    {d[kulcs] === 'van' ? 'megvan' : d[kulcs]}
                  </span>
                </div>
              ))}
              {mezo('bankszamlaszam', 'Bankszámlaszám')}
              {mezo('eszerz_lejar', 'Eseti szerződés lejárata')}
              {mezo('uzemorv_lejar', 'Üzemorvosi lejárata')}
              {mezo('tudo_lejar', 'Tüdőszűrő lejárata')}
            </>
          )}
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <TagJogviszonyPanel tagId={id} szerkeszt={szerkeszt} />
        </div>
      </div>
    );
  } else {
    tabTartalom = (
      <TagDokumentumokPanel
        tag={d}
        onFrissit={(friss) => {
          setTag(friss);
          if (draft) setDraft({ ...draft, dokumentumok: friss.dokumentumok });
        }}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-auto bg-cream p-6">
      <Link to="/belso/tagok" className="text-sm font-semibold text-[#2C7BD6] hover:underline">
        ← Vissza a listához
      </Link>

      {uzenet && <p className="mt-3 text-sm font-semibold text-success">{uzenet}</p>}
      {hiba && <p className="mt-3 text-sm text-danger">{hiba}</p>}

      <div className="mt-4 rounded-card border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-sm font-bold text-gold-light">
              {monogram}
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy">{tag.nev}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tagsagBadge(tag.tagsag_statusz)}`}>
                  {tag.tagsag_statusz}
                </span>
                <span className="text-xs text-text-muted">
                  {tag.iroda} · {tag.iskola ?? '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {szerkeszt ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSzerkeszt(false);
                    setDraft(null);
                  }}
                  className="rounded-btn border border-border px-3 py-2 text-sm font-semibold"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  disabled={mentes}
                  onClick={ment}
                  className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {mentes ? 'Mentés…' : 'Mentés'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAtembelesNyitva(true)}
                  className="rounded-btn border border-border px-3 py-2 text-sm font-semibold"
                >
                  Tag átemelés
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSzerkeszt(true);
                    setDraft({ ...tag, szja_kedvezmenyek: tag.szja_kedvezmenyek ?? [] });
                  }}
                  className="rounded-btn border border-border px-3 py-2 text-sm font-semibold"
                >
                  Szerkesztés
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-1 border-b border-border">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'border-b-2 px-3 py-2 text-sm font-semibold',
                tab === id ? 'border-gold text-navy' : 'border-transparent text-text-muted',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">{tabTartalom}</div>

        {tag.diak_regisztracio_id && (
          <p className="mt-6 text-xs text-text-muted">
            Kapcsolt érdeklődő:{' '}
            <Link to={`/belso/erdeklodok/${tag.diak_regisztracio_id}`} className="font-semibold text-[#2C7BD6]">
              #{tag.diak_regisztracio_id}
            </Link>
          </p>
        )}
      </div>

      {atembelesNyitva && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setAtembelesNyitva(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-card bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-navy">Tag átemelés</h3>
            <p className="mt-1 text-sm text-text-muted">
              A forrás tag (e-mail vagy adószám) adatai beolvadnak ebbe a tagbe: {tag.nev}
            </p>
            <label className="mt-4 block text-sm">
              Forrás tag e-mail vagy adószám
              <input
                className="field-input mt-1"
                value={atembelesForras}
                onChange={(e) => setAtembelesForras(e.target.value)}
                placeholder="email@pelda.hu vagy adószám"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={atembelesKuldes || !atembelesForras.trim()}
                onClick={atembelesMent}
                className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {atembelesKuldes ? 'Átemelés…' : 'Átemelés'}
              </button>
              <button
                type="button"
                onClick={() => setAtembelesNyitva(false)}
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
