import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';
import { useAuth } from '../../context/AuthContext';

function hibaUzenet(err: unknown): string {
  if (!(err instanceof Error)) return 'Belépés sikertelen';
  const msg = err.message || err.name;
  if (
    err.name === 'MissingIdentityError' ||
    /identity is not available|could not determine the identity/i.test(msg)
  ) {
    return 'A Netlify Identity nincs bekapcsolva ezen a site-on. Netlify → Project configuration → Identity → Enable Identity.';
  }
  if (/failed to fetch|network|load failed|abort/i.test(msg)) {
    return 'Nem elérhető a belépési szolgáltatás (Identity). Ellenőrizd, hogy a Netlify Identity be van-e kapcsolva.';
  }
  return msg || 'Belépés sikertelen';
}

export function BelsoBelepesPage() {
  const { bejelentkezes, frissit } = useAuth();
  const navigate = useNavigate();
  const [hiba, setHiba] = useState('');
  const [kuldes, setKuldes] = useState(false);
  const [identityOk, setIdentityOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/.netlify/identity/', { method: 'GET' });
        if (!cancelled) setIdentityOk(res.ok);
      } catch {
        if (!cancelled) setIdentityOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setKuldes(true);
    setHiba('');
    const fd = new FormData(e.currentTarget);
    try {
      await bejelentkezes(String(fd.get('email')), String(fd.get('password')));
      const linkRes = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ szerep: 'belso' }),
      });
      const linkJson = (await linkRes.json().catch(() => null)) as { hiba?: string } | null;
      if (!linkRes.ok) {
        throw new Error(
          linkJson?.hiba ??
            `Felhasználó összekötés sikertelen (${linkRes.status}). Fut-e a Netlify Database?`,
        );
      }
      await frissit();
      navigate('/belso/partnerek');
    } catch (err) {
      setHiba(hibaUzenet(err));
    } finally {
      setKuldes(false);
    }
  }

  return (
    <MelodiakPageShell
      title="Belső belépés"
      subtitle="Digitális szövetkezet menedzsment"
      eyebrow="Coop"
      heroSize="sm"
      maxWidth="md"
    >
      {identityOk === false && (
        <p className="mb-4 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
          A Netlify Identity endpoint nem elérhető. Kapcsold be: Netlify dashboard → Identity →{' '}
          <strong>Enable Identity</strong>. Utána először az{' '}
          <Link to="/belso/bootstrap" className="underline">
            első admin létrehozása
          </Link>
          .
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-card p-6 shadow-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-text-muted">E-mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            defaultValue="admin@melodiak.hu"
            className="field-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Jelszó</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            defaultValue="IceAdmin2026!"
            className="field-input"
          />
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
          Első alkalommal:{' '}
          <Link to="/belso/bootstrap" className="text-gold underline">
            Admin létrehozása
          </Link>
          {' '}(Identity + DB után)
        </p>
      </form>
    </MelodiakPageShell>
  );
}
