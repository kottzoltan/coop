import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';
import { useAuth } from '../../context/AuthContext';

export function BelsoBelepesPage() {
  const { bejelentkezes, frissit } = useAuth();
  const navigate = useNavigate();
  const [hiba, setHiba] = useState('');
  const [kuldes, setKuldes] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setKuldes(true);
    setHiba('');
    const fd = new FormData(e.currentTarget);
    try {
      await bejelentkezes(String(fd.get('email')), String(fd.get('password')));
      await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ szerep: 'belso' }),
      });
      await frissit();
      navigate('/belso/toborzas/hirdetesek');
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Belépés sikertelen');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <MelodiakPageShell
      title="Belső belépés"
      subtitle="Munkatársi fiók — Netlify Identity"
      eyebrow="Coop"
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
          className="w-full rounded-btn bg-navy py-3 text-sm font-bold text-cream disabled:opacity-60"
        >
          {kuldes ? 'Belépés…' : 'Belépés'}
        </button>
        <p className="text-center text-xs text-text-muted">
          <Link to="/" className="text-gold underline">
            Portálválasztó
          </Link>
          {' · '}
          <Link to="/belso/bootstrap" className="text-gold underline">
            Első admin létrehozása
          </Link>
        </p>
      </form>
    </MelodiakPageShell>
  );
}
