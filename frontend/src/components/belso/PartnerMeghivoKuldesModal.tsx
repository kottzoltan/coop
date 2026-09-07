import { useEffect, useState } from 'react';
import { BtnGhost, BtnPrimary, FieldLabel, Modal } from './projekt/Modal';

export interface PartnerMeghivoCel {
  email: string;
  nev: string;
  forras: 'projekt' | 'partner_crm';
  partner_id?: number;
  projekt_id?: number;
  partner_kapcsolattarto_id?: number;
  projekt_kapcsolat_index?: number;
  hozzaferes?: 'olvasas' | 'iras';
}

type Props = {
  open: boolean;
  cel: PartnerMeghivoCel | null;
  onClose: () => void;
  onSent?: (link: string, emailKuldve: boolean) => void;
};

export function PartnerMeghivoKuldesModal({ open, cel, onClose, onSent }: Props) {
  const [uzenet, setUzenet] = useState('');
  const [hozzaferes, setHozzaferes] = useState<'olvasas' | 'iras'>('iras');

  useEffect(() => {
    if (cel?.hozzaferes === 'olvasas' || cel?.hozzaferes === 'iras') {
      setHozzaferes(cel.hozzaferes);
    } else {
      setHozzaferes('iras');
    }
  }, [cel]);
  const [kuldes, setKuldes] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [emailKuldve, setEmailKuldve] = useState(false);

  function bezar() {
    setUzenet('');
    setHozzaferes('iras');
    setHiba(null);
    setLink(null);
    setEmailKuldve(false);
    onClose();
  }

  async function kuldesIndit() {
    if (!cel?.email?.trim()) {
      setHiba('A kapcsolattartónak legyen e-mail címe a meghívóhoz.');
      return;
    }
    setKuldes(true);
    setHiba(null);
    try {
      const res = await fetch('/api/partner-meghivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cel.email,
          nev: cel.nev,
          uzenet: uzenet.trim() || undefined,
          hozzaferes,
          forras: cel.forras,
          partner_id: cel.partner_id,
          projekt_id: cel.projekt_id,
          partner_kapcsolattarto_id: cel.partner_kapcsolattarto_id,
          projekt_kapcsolat_index: cel.projekt_kapcsolat_index,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        hiba?: string;
        link?: string;
        email_kuldve?: boolean;
        email_hiba?: string | null;
        uzenet?: string;
      };
      if (!res.ok) throw new Error(json.hiba ?? 'Meghívó küldése sikertelen');
      setLink(json.link ?? null);
      setEmailKuldve(!!json.email_kuldve);
      if (!json.email_kuldve && json.email_hiba) {
        setHiba(`E-mail nem ment ki: ${json.email_hiba}`);
      }
      onSent?.(json.link ?? '', !!json.email_kuldve);
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  async function linkMasolasa() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
  }

  return (
    <Modal
      open={open}
      onClose={bezar}
      title="Partnerfelület meghívó"
      footer={
        link ? (
          <>
            <BtnGhost onClick={bezar}>Bezárás</BtnGhost>
            <BtnPrimary onClick={linkMasolasa}>Link másolása</BtnPrimary>
          </>
        ) : (
          <>
            <BtnGhost onClick={bezar}>Mégse</BtnGhost>
            <BtnPrimary onClick={kuldesIndit} disabled={kuldes || !cel}>
              {kuldes ? 'Küldés…' : 'Meghívó küldése'}
            </BtnPrimary>
          </>
        )
      }
    >
      {!cel ? null : link ? (
        <div className="space-y-3 text-sm">
          <p className="text-success">
            {emailKuldve
              ? 'A meghívó e-mail elküldve a partnernek.'
              : 'A meghívó rögzítve. Az e-mail küldés nem sikerült — másold ki a linket és küldd el manuálisan.'}
          </p>
          {hiba && !emailKuldve && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{hiba}</p>
          )}
          <p className="text-text-body">
            <span className="font-semibold text-navy">{cel.nev}</span>
            {' · '}
            {cel.email}
          </p>
          <p className="break-all rounded-lg bg-cream-muted px-3 py-2 text-xs text-text-muted">{link}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-body">
            Meghívó küldése: <span className="font-semibold text-navy">{cel.nev}</span> ({cel.email})
          </p>
          <label>
            <FieldLabel>Üzenet (opcionális)</FieldLabel>
            <textarea
              className="field-input min-h-[100px] w-full"
              value={uzenet}
              onChange={(e) => setUzenet(e.target.value)}
              placeholder="Rövid üzenet a partnernek — ha üresen hagyod, alap szöveget küldünk."
            />
          </label>
          <label>
            <FieldLabel>Partnerfelület jogosultság</FieldLabel>
            <select
              className="field-input w-full"
              value={hozzaferes}
              onChange={(e) => setHozzaferes(e.target.value as 'olvasas' | 'iras')}
            >
              <option value="iras">Írási jog (jóváhagyás, szerkesztés)</option>
              <option value="olvasas">Olvasási jog</option>
            </select>
          </label>
          {hiba && <p className="text-sm text-danger">{hiba}</p>}
        </div>
      )}
    </Modal>
  );
}
