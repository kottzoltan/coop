import { Navigate, useParams } from 'react-router-dom';

/** Régi közvetlen link — ugyanaz a master-detail nézet */
export function MunkaReszletekPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/diak/munkak" replace />;
  return <Navigate to={`/diak/munkak/${id}`} replace />;
}
