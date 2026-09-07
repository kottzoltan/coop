import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';
import { useAuth } from '../../context/AuthContext';

interface MeghivoAdat {
  nev: string;
  email: string;
  uzenet: string | null;
  cegnev: string;
  projektNev: string | null;
  hozzaferes: string;
}

export function PartnerMeghivoPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { bejelentkezes, frissit } = useAuth();

  const [meghivo, setMeghivo] = useState<MeghivoAdat | null>(null);
  const [toltes, setToltes] = useState(true);
  const [hiba, setHiba] = useState('');
  const [kuldes, setKuldes] = useState(false);

  useEffect(() => {
    if (!token) {
      setToltes(false);
      setHiba('Hiányzó meghívó token.');
      return;
    }
    fetch(`/api/partner-meghivo?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          meghivo?: MeghivoAdat;
          hiba?: string;
        };
        if (!res.ok) throw new Error(json.hiba ?? 'Érvénytelen meghívó');
        setMeghivo(json.meghivo ?? null);
      })
      .catch((e) => setHiba(e instanceof Error ? e.message : 'Meghívó betöltése sikertelen'))
      .finally(() => setToltes(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !meghivo) return;
    setKuldes(true);
    setHiba('');
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password'));
    const password2 = String(fd.get('password2'));
    if (password !== password2) {
      setHiba('A két jelszó nem egyezik.');
      setKuldes(false);
      return;
    }
    try {
      const res = await fetch('/api/partner-meghivo?muvelet=elfogadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json().catch(() => ({}))) as { hiba?: string; email?: string };
      if (!res.ok) throw new Error(json.hiba ?? 'Elfogadás sikertelen');

      await bejelentkezes(json.email ?? meghivo.email, password);
      await frissit();
      navigate('/partner');
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Elfogadás sikertelen');
    } finally {
      setKuldes(false);
    }
  }

  return (
    <MelodiakPageShell
      title="Partner meghívó"
      subtitle="Állítsd be a jelszavad a partnerfelület eléréséhez"
      eyebrow="Coop Partner"
      heroSize="sm"
      maxWidth="md"
    >
      {toltes ? (
        <p className="text-sm text-text-muted">Meghívó betöltése…</p>
      ) : !meghivo ? (
        <div className="rounded-card border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-danger">{hiba || 'Érvénytelen vagy lejárt meghívó.'}</p>
          <Link to="/partner/belepes" className="mt-4 inline-block text-sm font-semibold text-[#2C7BD6]">
            Belépés →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-card border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold text-navy">Kedves {meghivo.nev}!</p>
            {meghivo.projektNev && (
              <p className="mt-1 text-xs text-text-muted">Projekt: {meghivo.projektNev}</p>
            )}
            {meghivo.cegnev && (
              <p className="mt-1 text-xs text-text-muted">Partner: {meghivo.cegnev}</p>
            )}
            {meghivo.uzenet && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-text-body">{meghivo.uzenet}</p>
            )}
            <p className="mt-3 text-xs text-text-muted">
              E-mail: <span className="font-semibold">{meghivo.email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-card p-6 shadow-sm">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Új jelszó</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="field-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Jelszó megerősítése</span>
              <input
                name="password2"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="field-input"
              />
            </label>
            {hiba && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}
            <button
              type="submit"
              disabled={kuldes}
              className="w-full rounded-btn bg-[#2C7BD6] py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {kuldes ? 'Fiók aktiválása…' : 'Meghívó elfogadása és belépés'}
            </button>
            <p className="text-center text-xs text-text-muted">
              Már van fiókod?{' '}
              <Link to="/partner/belepes" className="text-[#2C7BD6] underline">
                Belépés
              </Link>
            </p>
          </form>
        </div>
      )}
    </MelodiakPageShell>
  );
}
