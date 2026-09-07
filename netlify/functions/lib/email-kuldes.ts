import { envGet } from './netlify-env.js';

function szovegHtml(szoveg: string): string {
  const escaped = szoveg
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:sans-serif;line-height:1.5;color:#1C2536">${escaped.replace(/\n/g, '<br>')}</div>`;
}

async function kuldesResend(
  email: string,
  targy: string,
  szoveg: string,
): Promise<{ ok: boolean; hiba?: string }> {
  const key = envGet('RESEND_API_KEY');
  if (!key) return { ok: false, hiba: 'RESEND_API_KEY nincs beállítva.' };
  const from = envGet('COOP_EMAIL_FROM') ?? 'Coop <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: targy,
      html: szovegHtml(szoveg),
      text: szoveg,
    }),
  });
  if (res.ok) return { ok: true };
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  return { ok: false, hiba: json.message ?? `Resend hiba (${res.status})` };
}

async function kuldesSendGrid(
  email: string,
  targy: string,
  szoveg: string,
): Promise<{ ok: boolean; hiba?: string }> {
  const key = envGet('SENDGRID_API_KEY');
  if (!key) return { ok: false, hiba: 'SENDGRID_API_KEY nincs beállítva.' };
  const from = envGet('COOP_EMAIL_FROM') ?? 'noreply@melodiak.hu';
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: from.includes('<') ? from.match(/<([^>]+)>/)?.[1] ?? from : from },
      subject: targy,
      content: [
        { type: 'text/plain', value: szoveg },
        { type: 'text/html', value: szovegHtml(szoveg) },
      ],
    }),
  });
  if (res.ok) return { ok: true };
  const body = await res.text().catch(() => '');
  return { ok: false, hiba: body || `SendGrid hiba (${res.status})` };
}

/** ICE sablonnal küldött partner meghívó e-mail (Resend / SendGrid). */
export async function kuldesPartnerMeghivoEmail(
  email: string,
  targy: string,
  szoveg: string,
): Promise<{ kuldve: boolean; szolgaltato: string | null; hiba?: string }> {
  const resendEredmeny = await kuldesResend(email, targy, szoveg);
  if (resendEredmeny.ok) {
    return { kuldve: true, szolgaltato: 'resend' };
  }
  const sendgridEredmeny = await kuldesSendGrid(email, targy, szoveg);
  if (sendgridEredmeny.ok) {
    return { kuldve: true, szolgaltato: 'sendgrid' };
  }
  const hiba = resendEredmeny.hiba ?? sendgridEredmeny.hiba ?? 'Nincs e-mail szolgáltató beállítva.';
  return { kuldve: false, szolgaltato: null, hiba };
}

/** Diák szerződés aláírási értesítő e-mail. */
export async function kuldesDiakAlairasEmail(
  email: string,
  nev: string,
  szerzodesTipus: string,
  dokumentumNev: string,
  profilLink: string,
): Promise<{ kuldve: boolean; szolgaltato: string | null; hiba?: string }> {
  const targy = `Digitális aláírás szükséges — ${szerzodesTipus}`;
  const szoveg = `Kedves ${nev}!

Gratulálunk — felvételt nyertél egy munkára a Coop-nál!

A munkavállalás megkezdéséhez kérjük, írd alá digitálisan a következő dokumentumot:
• ${dokumentumNev}

Az aláírás a diákportálon történik, Microsec időbélyeggel (tesztkörnyezetben szimulált időbélyeg).

Aláírás a profilodon:
${profilLink}

Üdvözlettel,
Coop`;

  return kuldesPartnerMeghivoEmail(email, targy, szoveg);
}
