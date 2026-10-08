import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../features/session/SessionContext';
import { currentOrganization } from '../types/auth';

export function RequireSession() { const { session, loading } = useSession(); const location = useLocation();
  if (loading) return <p role="status">Carregando sessão…</p>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
export function RequireOrganization() { const { session } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  if (!currentOrganization(session)) return <Navigate to="/organizations" replace />;
  return <Outlet />;
}
export function RequirePermission({ permission }: { permission: string }) { const { session } = useSession();
  if (!session?.permissions.includes(permission)) return <section className="access-denied" role="alert"><h1>Acesso indisponível</h1><p>Seu contexto atual não tem a permissão necessária para esta área.</p></section>;
  return <Outlet />;
}
