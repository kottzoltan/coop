import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { DiakRegisztracio } from '../../api/coop';

const IRODAK = [
  'Coop Universitas Budapest',
  'Coop Universitas Debrecen',
  'Coop Universitas Szeged',
  'Coop Universitas Győr',
  'Coop Universitas Pécs',
];

interface RegisztracioFormProps {
  /** Jelentkezés flow: siker után nem külön „kész” képernyő, hanem onSuccess */
  mod?: 'alap' | 'jelentkezes';
  onSuccess?: () => void | Promise<void>;
}

export function RegisztracioForm({ mod = 'alap', onSuccess }: RegisztracioFormProps) {
  const { regisztracio } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    if (!data.get('adatkezeles')) {
      setError('Az adatkezelési hozzájárulás megadása kötelező.');
      setSending(false);
      return;
    }

    const payload = {
      nev: String(data.get('nev') ?? ''),
      email: String(data.get('email') ?? ''),
      telefon: String(data.get('telefon') ?? ''),
      szuldat: String(data.get('szuldat') ?? ''),
      lakcim: String(data.get('lakcim') ?? '') || undefined,
      iroda: String(data.get('iroda') ?? ''),
      iskola: String(data.get('iskola') ?? '') || undefined,
      megjegyzes: String(data.get('megjegyzes') ?? '') || undefined,
    };
    const password = String(data.get('password') ?? '');

    try {
      const res = await fetch('/api/regisztracio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as {
        hiba?: string;
        ok?: boolean;
        diak?: DiakRegisztracio;
      };

      if (!res.ok) {
        throw new Error(json.hiba ?? 'Beküldés sikertelen');
      }

      if (!password || password.length < 8) {
        throw new Error('A jelszó legalább 8 karakter legyen.');
      }

      await regisztracio(payload.email, password, payload.nev);

      if (mod === 'jelentkezes' && onSuccess) {
        await onSuccess();
        form.reset();
        return;
      }

      setDone(true);
      onSuccess?.();
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Hiba történt a beküldés során. Kérjük, próbáld újra később.',
      );
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-card border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-2xl text-success">
          ✓
        </div>
        <h2 className="text-xl font-bold text-navy">Köszönjük a regisztrációt!</h2>
        <p className="mt-2 text-sm text-text-body">
          Elmentettük az adataidat, és létrehoztuk a fiókodat. Ha még nem vagy bejelentkezve, lépj be e-mail és jelszó párossal.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/diak/munkak"
            className="rounded-btn bg-[#2C7BD6] px-5 py-2 text-sm font-bold text-white"
          >
            Munkák böngészése
          </Link>
          <Link
            to="/diak/profil"
            className="rounded-btn border border-border px-5 py-2 text-sm font-semibold text-navy"
          >
            Profilom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {mod === 'jelentkezes' && (
        <p className="text-sm text-text-body">
          A jelentkezéshez először add meg a regisztrációs adataidat — ez kb. 2 perc.
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Teljes név" required>
          <input
            name="nev"
            required
            className="field-input"
            placeholder="Kovács Anna"
            autoComplete="name"
          />
        </Field>
        <Field label="E-mail cím" required>
          <input
            name="email"
            type="email"
            required
            className="field-input"
            placeholder="anna@email.hu"
            autoComplete="email"
          />
        </Field>
        <Field label="Telefonszám" required>
          <input
            name="telefon"
            type="tel"
            required
            className="field-input"
            placeholder="+36 30 123 4567"
            autoComplete="tel"
          />
        </Field>
        <Field label="Születési dátum" required>
          <input
            name="szuldat"
            type="date"
            required
            className="field-input"
          />
        </Field>
        <Field label="Jelszó" required>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="field-input"
            autoComplete="new-password"
            placeholder="Legalább 8 karakter"
          />
        </Field>
        <Field label="Lakcím" className="md:col-span-2">
          <input
            name="lakcim"
            className="field-input"
            placeholder="1234 Budapest, Példa utca 1."
            autoComplete="street-address"
          />
        </Field>
        <Field label="Kirendeltség / iroda" required>
          <select name="iroda" required className="field-input" defaultValue="">
            <option value="" disabled>
              Válassz irodát…
            </option>
            {IRODAK.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Iskola / egyetem">
          <input
            name="iskola"
            className="field-input"
            placeholder="pl. ELTE BTK"
          />
        </Field>
      </div>

      <Field label="Megjegyzés (opcionális)">
        <textarea
          name="megjegyzes"
          rows={3}
          className="field-input resize-y"
          placeholder="Milyen munkát keresel? Mikor tudsz dolgozni?"
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-text-body">
        <input
          type="checkbox"
          name="adatkezeles"
          required
          className="mt-0.5 h-4 w-4 accent-navy"
        />
        <span>
          Hozzájárulok, hogy a Coop a regisztráció során megadott
          személyes adataimat a tagsági folyamat lebonyolítása céljából
          kezelje.{' '}
          <span className="text-danger">*</span>
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-btn border border-navy bg-navy py-3 text-sm font-bold text-cream hover:bg-navy-hover disabled:opacity-60 md:w-auto md:px-10"
      >
        {sending ? 'Küldés…' : mod === 'jelentkezes' ? 'Regisztráció és tovább' : 'Regisztráció beküldése'}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}
