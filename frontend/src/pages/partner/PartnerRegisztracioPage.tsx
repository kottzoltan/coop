import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';

export function PartnerRegisztracioPage() {
  const { regisztracio } = useAuth();
  const navigate = useNavigate();

  const [sending, setSending] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setHiba(null);

    const fd = new FormData(e.currentTarget);
    const cegnev = String(fd.get('cegnev') ?? '');
    const adoszam = String(fd.get('adoszam') ?? '');
    const kapcsolat_nev = String(fd.get('kapcsolat_nev') ?? '');
    const email = String(fd.get('email') ?? '').toLowerCase().trim();
    const telefon = String(fd.get('telefon') ?? '');
    const password = String(fd.get('password') ?? '');

    try {
      if (!cegnev || !adoszam || !kapcsolat_nev || !email) {
        throw new Error('Hiányzó kötelező mezők.');
      }
      if (password.length < 8) {
        throw new Error('A jelszó legalább 8 karakter legyen.');
      }

      // 1) Netlify Identity account létrehozása (partner loginhoz)
      await regisztracio(email, password, kapcsolat_nev);

      // 2) ICE partner regisztráció mentése (jóváhagyásra vár)
      const res = await fetch('/api/partner-regisztracio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cegnev,
          adoszam,
          kapcsolat_nev,
          email,
          telefon: telefon || null,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as { hiba?: string };
      if (!res.ok) {
        throw new Error(json.hiba ?? 'Partner regisztráció sikertelen');
      }

      navigate('/partner');
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Partner regisztráció sikertelen');
    } finally {
      setSending(false);
    }
  }

  return (
    <MelodiakPageShell
      title="Partner regisztráció"
      subtitle="Hozzáférést kérsz a cégodhoz kapcsolódó beosztás- és jelenlétkezeléshez."
      eyebrow="Partnerfelület"
      heroSize="sm"
      maxWidth="md"
    >
      <div className="rounded-card border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Cégnév</span>
              <input name="cegnev" className="field-input" required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Adószám</span>
              <input name="adoszam" className="field-input" required />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Kapcsolattartó neve</span>
              <input name="kapcsolat_nev" className="field-input" required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase text-text-muted">E-mail</span>
              <input name="email" type="email" className="field-input" required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Telefon (opcionális)</span>
              <input name="telefon" className="field-input" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Jelszó</span>
              <input
                name="password"
                type="password"
                className="field-input"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Legalább 8 karakter"
              />
            </label>
          </div>

          {hiba && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-btn bg-[#2C7BD6] py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {sending ? 'Beküldés…' : 'Regisztráció beküldése'}
          </button>

          <p className="text-center text-xs text-text-muted">
            Már van fiókod?{' '}
            <Link to="/partner/belepes" className="font-semibold text-[#2C7BD6]">
              Belépés Identity fiókkal
            </Link>
          </p>
        </form>
      </div>
    </MelodiakPageShell>
  );
}

