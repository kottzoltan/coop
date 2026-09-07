import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type PartnerKapcsolattarto, type ProjektKapcsolattarto, type ProjektMetaPayload } from '@coop/shared';
import { getPartner } from '../../../api/coop';
import { BtnGhost, BtnPrimary, FieldLabel, Modal } from './Modal';
import {
  PartnerMeghivoKuldesModal,
  type PartnerMeghivoCel,
} from '../../belso/PartnerMeghivoKuldesModal';

type Props = {
  meta: ProjektMetaPayload;
  projektId: number;
  partnerId?: number | null;
  mentes: boolean;
  onMentes: (meta: ProjektMetaPayload) => Promise<void>;
};

export function ProjektKapcsolattartokTab({ meta, projektId, partnerId, mentes, onMentes }: Props) {
  const [modal, setModal] = useState(false);
  const [meghivoCel, setMeghivoCel] = useState<PartnerMeghivoCel | null>(null);
  const [partnerKapcsolattartok, setPartnerKapcsolattartok] = useState<PartnerKapcsolattarto[]>([]);
  const [partnerNev, setPartnerNev] = useState<string | null>(null);
  const [toltes, setToltes] = useState(false);

  const lista = meta.kapcsolattartok ?? [];

  useEffect(() => {
    if (!partnerId) {
      setPartnerKapcsolattartok([]);
      setPartnerNev(null);
      return;
    }
    setToltes(true);
    getPartner(partnerId)
      .then((d) => {
        setPartnerKapcsolattartok(d.partner.kapcsolattartok ?? []);
        setPartnerNev(d.partner.nev);
      })
      .catch(() => {
        setPartnerKapcsolattartok([]);
        setPartnerNev(null);
      })
      .finally(() => setToltes(false));
  }, [partnerId]);

  async function ujKapcsolattarto(k: ProjektKapcsolattarto) {
    await onMentes({ ...meta, kapcsolattartok: [...lista, k] });
    setModal(false);
  }

  async function torolProjektKapcsolattarto(index: number) {
    const next = lista.filter((_, i) => i !== index);
    await onMentes({ ...meta, kapcsolattartok: next });
  }

  async function partnerKapcsolattartokImport() {
    const ujak: ProjektKapcsolattarto[] = partnerKapcsolattartok
      .filter((pk) => !lista.some((k) => k.email && pk.email && k.email === pk.email))
      .map((pk) => ({
        nev: pk.nev,
        email: pk.email ?? '',
        mobil: pk.mobil ?? pk.vezetekes ?? '',
        szamlazasi: !!pk.szamlazasi,
      }));
    if (!ujak.length) return;
    await onMentes({ ...meta, kapcsolattartok: [...lista, ...ujak] });
  }

  function meghivoNyit(cel: PartnerMeghivoCel) {
    setMeghivoCel(cel);
  }

  function meghivoBezar() {
    setMeghivoCel(null);
  }

  return (
    <div className="space-y-6">
      {partnerId ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-navy">Partner kapcsolattartók</h3>
            <div className="flex flex-wrap gap-2">
              {partnerKapcsolattartok.length > 0 && (
                <BtnGhost sm onClick={partnerKapcsolattartokImport} disabled={mentes}>
                  Importálás projekthez
                </BtnGhost>
              )}
              <Link
                to={`/belso/partnerek/${partnerId}`}
                className="text-xs font-semibold text-gold hover:underline"
              >
                {partnerNev ?? 'Partner'} → CRM
              </Link>
            </div>
          </div>
          {toltes ? (
            <p className="text-sm text-text-muted">Betöltés…</p>
          ) : partnerKapcsolattartok.length === 0 ? (
            <p className="rounded-card border border-dashed border-border bg-card p-6 text-center text-sm text-text-muted">
              A partnerhez nincs CRM kapcsolattartó rögzítve.
            </p>
          ) : (
            <div className="space-y-3">
              {partnerKapcsolattartok.map((k) => (
                <div key={k.id} className="rounded-card border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-navy">{k.nev}</p>
                      <p className="text-sm text-text-muted">{k.email ?? '—'}</p>
                      {k.mobil && <p className="text-sm text-text-muted">{k.mobil}</p>}
                      {k.vezetekes && <p className="text-sm text-text-muted">{k.vezetekes}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {k.szamlazasi && (
                          <span className="rounded-md bg-cream-muted px-2 py-0.5 text-xs font-semibold">
                            Számlázási kapcsolattartó
                          </span>
                        )}
                        {k.beosztas && (
                          <span className="rounded-md bg-cream-muted px-2 py-0.5 text-xs text-text-muted">
                            {k.beosztas}
                          </span>
                        )}
                      </div>
                    </div>
                    {k.email && (
                      <BtnGhost
                        sm
                        onClick={() =>
                          meghivoNyit({
                            email: k.email!,
                            nev: k.nev,
                            forras: 'partner_crm',
                            partner_id: partnerId ?? undefined,
                            projekt_id: projektId,
                            partner_kapcsolattarto_id: k.id,
                          })
                        }
                      >
                        Meghívó
                      </BtnGhost>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-card border border-border bg-card p-4 text-sm text-text-muted">
          Nincs partner hozzárendelve — az Alap adatok fülön válassz partnert a CRM kapcsolattartók
          megjelenítéséhez.
        </p>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-navy">Projekt kapcsolattartók</h3>
          <BtnGhost sm onClick={() => setModal(true)}>
            + Új kapcsolattartó
          </BtnGhost>
        </div>
        <p className="mb-3 text-xs text-text-muted">
          Belső / projekt-specifikus kapcsolattartók (pl. témavezető, mentor) — a partner CRM-től külön.
        </p>
        {lista.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-text-muted">
            Nincs projekt kapcsolattartó.
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((k, i) => (
              <div key={i} className="rounded-card border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{k.nev}</p>
                    <p className="text-sm text-text-muted">{k.email}</p>
                    {k.mobil && <p className="text-sm text-text-muted">{k.mobil}</p>}
                    {k.szamlazasi && (
                      <span className="mt-2 inline-block rounded-md bg-cream-muted px-2 py-0.5 text-xs font-semibold">
                        Számlázási kapcsolattartó
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {k.email && (
                      <BtnGhost
                        sm
                        onClick={() =>
                          meghivoNyit({
                            email: k.email!,
                            nev: k.nev,
                            forras: 'projekt',
                            partner_id: partnerId ?? undefined,
                            projekt_id: projektId,
                            projekt_kapcsolat_index: i,
                          })
                        }
                      >
                        Meghívó
                      </BtnGhost>
                    )}
                    <button
                      type="button"
                      onClick={() => torolProjektKapcsolattarto(i)}
                      disabled={mentes}
                      className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
                    >
                      Törlés
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <KapcsolattartoModal
        open={modal}
        mentes={mentes}
        onClose={() => setModal(false)}
        onSubmit={ujKapcsolattarto}
      />

      <PartnerMeghivoKuldesModal open={!!meghivoCel} cel={meghivoCel} onClose={meghivoBezar} />
    </div>
  );
}

function KapcsolattartoModal({
  open,
  mentes,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mentes: boolean;
  onClose: () => void;
  onSubmit: (k: ProjektKapcsolattarto) => Promise<void>;
}) {
  const [nev, setNev] = useState('');
  const [email, setEmail] = useState('');
  const [mobil, setMobil] = useState('');
  const [szamlazasi, setSzamlazasi] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  async function ment() {
    if (!nev.trim()) {
      setHiba('Add meg a nevet.');
      return;
    }
    setHiba(null);
    await onSubmit({ nev: nev.trim(), email, mobil, szamlazasi });
    setNev('');
    setEmail('');
    setMobil('');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kapcsolattartó hozzáadása"
      footer={
        <>
          <BtnGhost onClick={onClose}>Mégse</BtnGhost>
          <BtnPrimary onClick={ment} disabled={mentes}>
            {mentes ? 'Mentés…' : 'Mentés'}
          </BtnPrimary>
        </>
      }
    >
      {hiba && <p className="mb-3 text-sm text-danger">{hiba}</p>}
      <div className="grid gap-3">
        <label>
          <FieldLabel required>Név</FieldLabel>
          <input className="field-input w-full" value={nev} onChange={(e) => setNev(e.target.value)} />
        </label>
        <label>
          <FieldLabel>E-mail</FieldLabel>
          <input className="field-input w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <FieldLabel>Mobil</FieldLabel>
          <input className="field-input w-full" value={mobil} onChange={(e) => setMobil(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={szamlazasi} onChange={(e) => setSzamlazasi(e.target.checked)} />
          Számlázási kapcsolattartó
        </label>
      </div>
    </Modal>
  );
}
