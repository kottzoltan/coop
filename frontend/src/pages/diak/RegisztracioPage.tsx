import { Link, Navigate } from 'react-router-dom';
import { RegisztracioForm } from '../../components/diak/RegisztracioForm';
import { MelodiakPageShell } from '../../components/diak/MelodiakPageShell';
import { useAuth } from '../../context/AuthContext';

export function RegisztracioPage() {
  const { me } = useAuth();
  const diak = me?.szerep === 'diak' ? me.diak ?? null : null;
  if (diak) {
    return <Navigate to="/diak/munkak" replace />;
  }

  return (
    <MelodiakPageShell
      title="Diák regisztráció"
      subtitle="Töltsd ki az alábbi űrlapot érdeklődő diákként. Csapatunk a megadott adatok alapján felveszi veled a kapcsolatot."
      eyebrow="Csatlakozás"
      heroSize="md"
    >
      <div className="rounded-card border border-border bg-card p-6 shadow-sm md:p-8">
        <RegisztracioForm />
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">
        Már regisztráltál?{' '}
        <Link to="/diak/belepes" className="font-semibold text-melodiak-blue">
          Lépj be itt
        </Link>
      </p>
    </MelodiakPageShell>
  );
}
