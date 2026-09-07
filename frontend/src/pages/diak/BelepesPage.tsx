import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';
import { useAuth } from '../../context/AuthContext';

export function BelepesPage() {
  const { bejelentkezes, me } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hiba, setHiba] = useState('');
  const [kuldes, setKuldes] = useState(false);

  const diak = me?.szerep === 'diak' ? me.diak ?? null : null;
  if (diak) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/diak/munkak'} replace />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setKuldes(true);
    setHiba('');
    const fd = new FormData(e.currentTarget);
    try {
      const email = String(fd.get('email'));
      const password = String(fd.get('password'));
      await bejelentkezes(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/diak/munkak');
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Belépés sikertelen');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <MelodiakPageShell
      title="Diák belépés"
      subtitle="E-mail címmel és jelszóval léphetsz be."
      eyebrow="Coop"
      heroSize="sm"
      maxWidth="md"
    >
      <div className="space-y-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-card border border-border bg-card p-6 shadow-sm"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase text-text-muted">E-mail</span>
            <input
              name="email"
              type="email"
              required
              className="field-input"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase text-text-muted">Jelszó</span>
            <input name="password" type="password" required className="field-input" autoComplete="current-password" />
          </label>

          {hiba && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>
          )}

          <button
            type="submit"
            disabled={kuldes}
            className="w-full rounded-btn bg-[#2C7BD6] py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {kuldes ? 'Belépés…' : 'Belépés'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Még nem regisztráltál?{' '}
          <Link to="/diak/regisztracio" className="font-semibold text-melodiak-blue">
            Regisztráció
          </Link>
        </p>
      </div>
    </MelodiakPageShell>
  );
}
