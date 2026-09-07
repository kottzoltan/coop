import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';
import { useAuth } from '../../context/AuthContext';

export function PartnerBelepesPage() {
  const { bejelentkezes, frissit } = useAuth();
  const navigate = useNavigate();
  const [hiba, setHiba] = useState('');
  const [kuldes, setKuldes] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setKuldes(true);
    setHiba('');
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email'));
    const password = String(fd.get('password'));
    try {
      const prep = await fetch('/api/partner-belepes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const prepJson = (await prep.json().catch(() => ({}))) as { hiba?: string };
      if (!prep.ok) throw new Error(prepJson.hiba ?? 'Belépés előkészítése sikertelen');

      await bejelentkezes(email, password);
      await frissit();
      navigate('/partner');
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Belépés sikertelen');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <MelodiakPageShell
      title="Partner belépés"
      subtitle="Meghívott partneri fiók — állítsd be a jelszavad a meghívó linken vagy itt"
      eyebrow="Coop Partner"
      heroSize="sm"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-card p-6 shadow-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-text-muted">E-mail</span>
          <input name="email" type="email" required className="field-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Jelszó</span>
          <input name="password" type="password" required className="field-input" />
        </label>
        {hiba && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}
        <button
          type="submit"
          disabled={kuldes}
          className="w-full rounded-btn bg-[#2C7BD6] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {kuldes ? 'Belépés…' : 'Belépés'}
        </button>
        <p className="text-center text-xs text-text-muted">
          <Link to="/partner/regisztracio" className="text-[#2C7BD6] underline">
            Partner regisztráció
          </Link>
          {' · '}
          <Link to="/" className="text-[#2C7BD6] underline">
            Portálválasztó
          </Link>
        </p>
      </form>
    </MelodiakPageShell>
  );
}
