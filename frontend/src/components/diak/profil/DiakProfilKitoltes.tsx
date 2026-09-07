import { useState } from 'react';
import type { DiakProfilPayload, DiakTanulmany } from '@coop/shared';
import { HET_NAPOK } from '@coop/shared';
import { feltoltDiakDokumentum, dokumentumLetoltesUrl } from '../../../api/coop';
import { ProfilSzekcio, ProfilUresAllapot } from './ProfilSzekcio';
import { TanulmanyModal } from './TanulmanyModal';

const SOCIAL_TIPUSOK = ['LinkedIn', 'GitHub', 'Portfólió', 'Instagram', 'Egyéb'];

type Props = {
  diakId: number;
  profil: DiakProfilPayload;
  mentes: boolean;
  onMent: (profil: DiakProfilPayload, azonnal?: boolean) => void;
};

function honapSzoveg(ym?: string) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  const datum = new Date(Number(y), Number(m) - 1, 1);
  return datum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
}

export function DiakProfilKitoltes({ diakId, profil, mentes, onMent }: Props) {
  const [cvToltes, setCvToltes] = useState(false);
  const [tanulmanyModal, setTanulmanyModal] = useState(false);
  const [szerkesztettTanulmany, setSzerkesztettTanulmany] = useState<DiakTanulmany | null>(null);
  const [socialSzerk, setSocialSzerk] = useState(false);
  const [rareresSzerk, setRareresSzerk] = useState(false);
  const [bemutatkozasSzerk, setBemutatkozasSzerk] = useState(false);

  function patch(partial: Partial<DiakProfilPayload>, azonnal = false) {
    onMent({ ...profil, ...partial }, azonnal);
  }

  function tanulmanyMent(t: DiakTanulmany) {
    const lista = [...(profil.tanulmanyok ?? [])];
    const idx = lista.findIndex((x) => x.id === t.id);
    if (idx >= 0) lista[idx] = t;
    else lista.push(t);
    patch({ tanulmanyok: lista }, true);
    setTanulmanyModal(false);
    setSzerkesztettTanulmany(null);
  }

  function tanulmanyTorol(id: string) {
    patch({ tanulmanyok: (profil.tanulmanyok ?? []).filter((t) => t.id !== id) }, true);
  }

  function oneletrajzFeltoltes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,image/*';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      setCvToltes(true);
      try {
        const { blob_key, meret } = await feltoltDiakDokumentum(diakId, f);
        patch(
          {
            oneletrajz: {
              fajlnev: f.name,
              feltoltve: new Date().toISOString(),
              blob_key,
            },
          },
          true,
        );
        void meret;
      } catch {
        patch({
          oneletrajz: { fajlnev: f.name, feltoltve: new Date().toISOString() },
        }, true);
      } finally {
        setCvToltes(false);
      }
    };
    input.click();
  }

  return (
    <div className="space-y-5">
      <ProfilSzekcio
        id="szekcio-tanulmany"
        cim="Tanulmányok"
        leiras="Add meg az aktuális és korábbi egyetemi vagy középiskolai tanulmányaidat."
      >
        {(profil.tanulmanyok ?? []).length === 0 ? (
          <ProfilUresAllapot szoveg="Még nem adtál meg tanulmányt." />
        ) : (
          <ul className="space-y-3">
            {(profil.tanulmanyok ?? []).map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-cream-muted/40 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-navy">
                    {t.tipus === 'kozepiskola' && (
                      <span className="mr-2 rounded bg-[#EAF1F7] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#2C7BD6]">
                        Középiskola
                      </span>
                    )}
                    {t.intezmeny}
                  </p>
                  <p className="text-sm text-text-body">{t.szak}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {honapSzoveg(t.elso_felev)}
                    {t.aktualis ? ' – aktuális' : t.utolso_felev ? ` – ${honapSzoveg(t.utolso_felev)}` : ''}
                    {t.specializacio ? ` · ${t.specializacio}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#2C7BD6]"
                    onClick={() => {
                      setSzerkesztettTanulmany(t);
                      setTanulmanyModal(true);
                    }}
                  >
                    Szerkesztés
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-danger"
                    onClick={() => tanulmanyTorol(t.id)}
                  >
                    Törlés
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => {
            setSzerkesztettTanulmany(null);
            setTanulmanyModal(true);
          }}
          className="mt-3 text-sm font-semibold text-[#2C7BD6]"
        >
          + Új tanulmány
        </button>
      </ProfilSzekcio>

      <ProfilSzekcio
        id="szekcio-social"
        cim="Social linkek"
        leiras="Add meg a publikus profiljaidat és portfólió linkjeidet."
        szerkesztes={() => setSocialSzerk((v) => !v)}
      >
        {socialSzerk ? (
          <div className="space-y-3">
            {(profil.social_linkek ?? []).map((link, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <select
                  className="field-input w-36"
                  value={link.tipus}
                  onChange={(e) => {
                    const lista = [...(profil.social_linkek ?? [])];
                    lista[i] = { ...lista[i], tipus: e.target.value };
                    patch({ social_linkek: lista });
                  }}
                >
                  {SOCIAL_TIPUSOK.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  className="field-input min-w-[200px] flex-1"
                  placeholder="https://…"
                  value={link.url}
                  onChange={(e) => {
                    const lista = [...(profil.social_linkek ?? [])];
                    lista[i] = { ...lista[i], url: e.target.value };
                    patch({ social_linkek: lista });
                  }}
                />
                <button
                  type="button"
                  className="text-sm text-danger"
                  onClick={() =>
                    patch({
                      social_linkek: (profil.social_linkek ?? []).filter((_, j) => j !== i),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm font-semibold text-[#2C7BD6]"
              onClick={() =>
                patch({
                  social_linkek: [...(profil.social_linkek ?? []), { tipus: 'LinkedIn', url: '' }],
                })
              }
            >
              + Link hozzáadása
            </button>
            <button
              type="button"
              onClick={() => {
                setSocialSzerk(false);
                patch({}, true);
              }}
              className="block rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={mentes}
            >
              {mentes ? 'Mentés…' : 'Kész'}
            </button>
          </div>
        ) : (profil.social_linkek ?? []).some((l) => l.url.trim()) ? (
          <ul className="space-y-2 text-sm">
            {(profil.social_linkek ?? [])
              .filter((l) => l.url.trim())
              .map((l, i) => (
                <li key={i}>
                  <span className="font-semibold text-navy">{l.tipus}: </span>
                  <a href={l.url} className="text-[#2C7BD6] hover:underline" target="_blank" rel="noreferrer">
                    {l.url}
                  </a>
                </li>
              ))}
          </ul>
        ) : (
          <ProfilUresAllapot szoveg="Nincs megadva social link." />
        )}
      </ProfilSzekcio>

      <ProfilSzekcio
        id="szekcio-oneletrajz"
        cim="Alapértelmezett önéletrajz"
        leiras="Munkára jelentkezéskor lehetőséged van ezt választani, vagy újat feltölteni."
      >
        {profil.oneletrajz?.fajlnev ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-cream-muted/40 px-4 py-3">
            <div>
              <p className="font-semibold text-navy">{profil.oneletrajz.fajlnev}</p>
              <p className="text-xs text-text-muted">
                Feltöltve: {new Date(profil.oneletrajz.feltoltve).toLocaleString('hu-HU')}
              </p>
              {profil.oneletrajz.blob_key && (
                <a
                  href={dokumentumLetoltesUrl(profil.oneletrajz.blob_key)}
                  className="mt-1 inline-block text-xs font-semibold text-gold underline"
                >
                  Letöltés
                </a>
              )}
            </div>
            <button
              type="button"
              disabled={cvToltes || mentes}
              onClick={oneletrajzFeltoltes}
              className="rounded-btn border border-border px-3 py-1.5 text-sm font-semibold"
            >
              Csere
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm text-text-muted">Önéletrajz feltöltése</p>
            <p className="mt-1 text-xs text-text-muted">PDF, DOC, DOCX vagy kép</p>
            <button
              type="button"
              disabled={cvToltes || mentes}
              onClick={oneletrajzFeltoltes}
              className="mt-4 rounded-btn bg-gold px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {cvToltes ? 'Feltöltés…' : 'Feltöltés'}
            </button>
          </div>
        )}
      </ProfilSzekcio>

      <ProfilSzekcio
        id="szekcio-rareres"
        cim="Heti ráérés"
        leiras="Add meg, hogy mikor vagy elérhető munkára a héten."
        szerkesztes={() => setRareresSzerk((v) => !v)}
      >
        {rareresSzerk ? (
          <div className="space-y-3">
            {HET_NAPOK.map((nap) => (
              <label key={nap} className="flex items-center gap-3">
                <span className="w-8 text-sm font-bold text-navy">{nap}</span>
                <input
                  className="field-input flex-1"
                  placeholder="Pl. délelőtt, 13–17, nem érkező"
                  value={profil.heti_rareres?.[nap] ?? ''}
                  onChange={(e) =>
                    patch({
                      heti_rareres: { ...profil.heti_rareres, [nap]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => {
                setRareresSzerk(false);
                patch({}, true);
              }}
              className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={mentes}
            >
              {mentes ? 'Mentés…' : 'Kész'}
            </button>
          </div>
        ) : Object.values(profil.heti_rareres ?? {}).some((v) => v.trim()) ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {HET_NAPOK.filter((n) => profil.heti_rareres?.[n]?.trim()).map((nap) => (
              <div key={nap} className="flex gap-2">
                <dt className="w-8 font-bold text-navy">{nap}</dt>
                <dd className="text-text-body">{profil.heti_rareres?.[nap]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <ProfilUresAllapot szoveg="Még nem adtad meg a heti ráérésed." />
        )}
      </ProfilSzekcio>

      <ProfilSzekcio
        id="szekcio-bemutatkozas"
        cim="Bemutatkozás"
        leiras="Rövid bemutatkozás a munkáltatók számára."
        szerkesztes={() => setBemutatkozasSzerk((v) => !v)}
      >
        {bemutatkozasSzerk ? (
          <div className="space-y-3">
            <textarea
              className="field-input min-h-[120px]"
              value={profil.bemutatkozas ?? ''}
              onChange={(e) => patch({ bemutatkozas: e.target.value })}
              placeholder="Írd le röviden, ki vagy és milyen munkát keresel…"
            />
            <button
              type="button"
              onClick={() => {
                setBemutatkozasSzerk(false);
                patch({}, true);
              }}
              className="rounded-btn bg-gold px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={mentes}
            >
              {mentes ? 'Mentés…' : 'Kész'}
            </button>
          </div>
        ) : profil.bemutatkozas?.trim() ? (
          <p className="whitespace-pre-wrap text-sm text-text-body">{profil.bemutatkozas}</p>
        ) : (
          <ProfilUresAllapot szoveg="Még nem írtál bemutatkozást." />
        )}
      </ProfilSzekcio>

      <ProfilSzekcio id="szekcio-keszsegek" cim="Készségek" leiras="Vesszővel elválasztva add meg a készségeidet.">
        <input
          className="field-input"
          placeholder="Pl. Excel, csapatmunka, angol B2"
          value={(profil.keszsegek ?? []).join(', ')}
          onChange={(e) =>
            patch({
              keszsegek: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </ProfilSzekcio>

      <ProfilSzekcio id="szekcio-tapasztalat" cim="Tapasztalat" leiras="Korábbi munkák, gyakornoki helyek röviden.">
        <textarea
          className="field-input min-h-[100px]"
          value={profil.tapasztalat ?? ''}
          onChange={(e) => patch({ tapasztalat: e.target.value })}
          placeholder="Pl. 2025 nyár — raktári kisegítő, 2 hónap"
        />
      </ProfilSzekcio>

      <TanulmanyModal
        nyitva={tanulmanyModal}
        szerkesztett={szerkesztettTanulmany}
        onBezar={() => {
          setTanulmanyModal(false);
          setSzerkesztettTanulmany(null);
        }}
        onMent={tanulmanyMent}
      />
    </div>
  );
}
