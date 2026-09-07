import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';

export function BelsoBootstrapPage() {
  const navigate = useNavigate();
  const [canBootstrap, setCanBootstrap] = useState<boolean | null>(null);
  const [email, setEmail] = useState('admin@melodiak.hu');
  const [password, setPassword] = useState('IceAdmin2026!');
  const [hiba, setHiba] = useState('');
  const [siker, setSiker] = useState('');
  const [kuldes, setKuldes] = useState(false);

  useEffect(() => {
    fetch('/api/auth/bootstrap')
      .then((r) => r.json())
      .then((d) => setCanBootstrap(!!d.canBootstrap))
      .catch(() => setCanBootstrap(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setKuldes(true);
    setHiba('');
    setSiker('');
    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.hiba ?? 'Bootstrap sikertelen');
      setSiker(
        `Admin létrehozva: ${email}. Jelszó: a megadott érték. Átirányítás belépésre…`,
      );
      setTimeout(() => navigate('/belso/belepes'), 2500);
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setKuldes(false);
    }
  }

  if (canBootstrap === null) {
    return (
      <MelodiakPageShell title="Admin beállítás" eyebrow="Coop" heroSize="sm" maxWidth="md">
        <p className="text-sm text-text-muted">Ellenőrzés…</p>
      </MelodiakPageShell>
    );
  }

  if (!canBootstrap) {
    return (
      <MelodiakPageShell title="Admin már létezik" eyebrow="Coop" heroSize="sm" maxWidth="md">
        <p className="text-sm text-text-body">
          Már van belső felhasználó. Új munkatársat a{' '}
          <Link to="/belso/admin/jogosultsagok" className="font-semibold text-gold underline">
            Jogosultságok
          </Link>{' '}
          oldalon adhatsz hozzá (admin belépés után).
        </p>
        <Link
          to="/belso/belepes"
          className="mt-4 inline-block text-sm font-semibold text-gold underline"
        >
          Belépés →
        </Link>
      </MelodiakPageShell>
    );
  }

  return (
    <MelodiakPageShell
      title="Első admin felhasználó"
      subtitle="Csak egyszer futtatható — utána a Jogosultságok oldalon adhatsz hozzá usereket"
      eyebrow="Coop"
      heroSize="sm"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-card p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Admin e-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Jelszó</span>
          <input
            type="text"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input font-mono"
          />
          <span className="text-xs text-text-muted">Legalább 8 karakter. Cseréld élesben!</span>
        </label>
        {hiba && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}
        {siker && <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">{siker}</p>}
        <button
          type="submit"
          disabled={kuldes}
          className="w-full rounded-btn bg-navy py-3 text-sm font-bold text-cream disabled:opacity-60"
        >
          {kuldes ? 'Létrehozás…' : 'Admin létrehozása'}
        </button>
      </form>
    </MelodiakPageShell>
  );
}
