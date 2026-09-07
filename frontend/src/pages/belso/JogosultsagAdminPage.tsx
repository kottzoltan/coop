import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UGYCSOPORT_LABELS, UGYCSOPORTOK, type Ugycsoport } from '@coop/shared';

type FelhasznaloSor = {
  felhasznalo: { identityId: string; email: string; szerep: string };
  jogosultsagok: Array<{ ugycsoport: string; olvasas: boolean; iras: boolean }>;
};

function uresJogosultsagok(): FelhasznaloSor['jogosultsagok'] {
  return UGYCSOPORTOK.map((ugycsoport) => ({
    ugycsoport,
    olvasas: false,
    iras: false,
  }));
}

function teljesAdminJogok(): FelhasznaloSor['jogosultsagok'] {
  return UGYCSOPORTOK.map((ugycsoport) => ({
    ugycsoport,
    olvasas: true,
    iras: true,
  }));
}

export function JogosultsagAdminPage() {
  const [matrix, setMatrix] = useState<FelhasznaloSor[]>([]);
  const [ugycsoportok, setUgycsoportok] = useState<Ugycsoport[]>([]);
  const [hiba, setHiba] = useState<string | null>(null);
  const [uzenet, setUzenet] = useState<string | null>(null);

  const [ujEmail, setUjEmail] = useState('');
  const [ujJelszo, setUjJelszo] = useState('');
  const [ujAdmin, setUjAdmin] = useState(false);
  const [ujKuldes, setUjKuldes] = useState(false);

  async function betolt() {
    const res = await fetch('/api/belso-jogosultsagok');
    const json = await res.json();
    if (!res.ok) throw new Error(json.hiba ?? 'Betöltés sikertelen');
    setMatrix(json.felhasznalok ?? []);
    setUgycsoportok(json.ugycsoportok ?? []);
  }

  useEffect(() => {
    betolt().catch((e) => setHiba(e instanceof Error ? e.message : 'Hiba'));
  }, []);

  async function mentes(identityId: string, jogosultsagok: FelhasznaloSor['jogosultsagok']) {
    setHiba(null);
    setUzenet(null);
    const res = await fetch('/api/belso-jogosultsagok', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity_id: identityId, jogosultsagok }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setHiba((json as { hiba?: string }).hiba ?? 'Mentés sikertelen');
      return;
    }
    setUzenet('Jogosultságok mentve.');
    await betolt();
  }

  async function ujFelhasznalo(e: React.FormEvent) {
    e.preventDefault();
    setUjKuldes(true);
    setHiba(null);
    setUzenet(null);
    try {
      const jogosultsagok = ujAdmin ? teljesAdminJogok() : uresJogosultsagok();
      const res = await fetch('/api/belso-jogosultsagok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ujEmail.trim().toLowerCase(),
          password: ujJelszo,
          jogosultsagok,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.hiba ?? 'Létrehozás sikertelen');
      setUzenet(`Felhasználó létrehozva: ${ujEmail}`);
      setUjEmail('');
      setUjJelszo('');
      setUjAdmin(false);
      await betolt();
    } catch (err) {
      setHiba(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setUjKuldes(false);
    }
  }

  function toggleJog(
    sor: FelhasznaloSor,
    ugycsoport: string,
    mezo: 'olvasas' | 'iras',
  ) {
    const existing = sor.jogosultsagok.find((j) => j.ugycsoport === ugycsoport);
    const next = [...sor.jogosultsagok.filter((j) => j.ugycsoport !== ugycsoport)];
    const olvasas = mezo === 'olvasas' ? !(existing?.olvasas ?? false) : (existing?.olvasas ?? false);
    const iras = mezo === 'iras' ? !(existing?.iras ?? false) : (existing?.iras ?? false);
    if (iras) next.push({ ugycsoport, olvasas: true, iras: true });
    else if (olvasas) next.push({ ugycsoport, olvasas: true, iras: false });
    mentes(sor.felhasznalo.identityId, next);
  }

  return (
    <div className="h-screen overflow-auto bg-page-bg p-6">
      <Link to="/belso/toborzas/hirdetesek" className="text-sm font-semibold text-gold hover:underline">
        ← Vissza
      </Link>
      <h1 className="mt-4 text-xl font-bold text-navy">Jogosultságok</h1>
      <p className="mt-1 text-sm text-text-muted">
        Új belső felhasználó létrehozása és ügycsoportonkénti jogok beállítása
      </p>

      {hiba && <p className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{hiba}</p>}
      {uzenet && (
        <p className="mt-4 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">{uzenet}</p>
      )}

      <form
        onSubmit={ujFelhasznalo}
        className="mt-6 rounded-card border border-border bg-card p-5"
      >
        <h2 className="text-sm font-bold text-navy">+ Új belső felhasználó</h2>
        <p className="mt-1 text-xs text-text-muted">
          Identity fiók + Coop belső szerep. A jelszót add át a munkatársnak.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase text-text-muted">E-mail</span>
            <input
              type="email"
              required
              value={ujEmail}
              onChange={(e) => setUjEmail(e.target.value)}
              className="field-input"
              placeholder="nev@melodiak.hu"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase text-text-muted">Jelszó</span>
            <input
              type="text"
              required
              minLength={8}
              value={ujJelszo}
              onChange={(e) => setUjJelszo(e.target.value)}
              className="field-input font-mono"
              placeholder="min. 8 karakter"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ujAdmin}
            onChange={(e) => setUjAdmin(e.target.checked)}
          />
          Teljes admin jogosultság (minden ügycsoport írással)
        </label>
        <button
          type="submit"
          disabled={ujKuldes}
          className="mt-4 rounded-btn bg-navy px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {ujKuldes ? 'Létrehozás…' : 'Felhasználó létrehozása'}
        </button>
      </form>

      <div className="mt-8 space-y-6">
        {matrix.map((s) => (
          <div key={s.felhasznalo.identityId} className="rounded-card border border-border bg-card p-5">
            <p className="font-semibold text-navy">{s.felhasznalo.email}</p>
            <p className="text-xs text-text-muted">{s.felhasznalo.identityId}</p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-text-muted">
                  <th className="py-2">Ügycsoport</th>
                  <th className="py-2">Olvasás</th>
                  <th className="py-2">Írás</th>
                </tr>
              </thead>
              <tbody>
                {ugycsoportok.map((u) => {
                  const j = s.jogosultsagok.find((x) => x.ugycsoport === u);
                  return (
                    <tr key={u} className="border-t border-border">
                      <td className="py-2">{UGYCSOPORT_LABELS[u]}</td>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={j?.olvasas ?? false}
                          onChange={() => toggleJog(s, u, 'olvasas')}
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={j?.iras ?? false}
                          onChange={() => toggleJog(s, u, 'iras')}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {matrix.length === 0 && (
          <p className="text-sm text-text-muted">
            Még nincs belső felhasználó.{' '}
            <Link to="/belso/bootstrap" className="font-semibold text-gold underline">
              Első admin létrehozása
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
