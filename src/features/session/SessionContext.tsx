import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '../../types/auth';
import { setCsrfToken } from '../../lib/api';
import { sessionApi } from '../../lib/session';

interface SessionValue { session: Session | null; loading: boolean; error: string | null; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; selectOrganization: (id: string) => Promise<void>; expireSession: () => void }
const SessionContext = createContext<SessionValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { try { setSession(await sessionApi.current()); setError(null); } catch (reason) { setSession(null); if (!(reason instanceof Error && 'status' in reason && reason.status === 401)) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a sessão.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const login = useCallback(async (email: string, password: string) => { setLoading(true); try { setSession(await sessionApi.login(email, password)); setError(null); } finally { setLoading(false); } }, []);
  const expireSession = useCallback(() => { setCsrfToken(null); setSession(null); }, []);
  const logout = useCallback(async () => { setLoading(true); try { await sessionApi.logout(); } finally { expireSession(); setLoading(false); } }, [expireSession]);
  const selectOrganization = useCallback(async (id: string) => { setLoading(true); try { const context = await sessionApi.selectOrganization(id); setSession((previous) => previous ? { ...previous, currentOrganizationId: context.organization.id, ...context } : previous); } finally { setLoading(false); } }, []);
  const value = useMemo(() => ({ session, loading, error, login, logout, selectOrganization, expireSession }), [session, loading, error, login, logout, selectOrganization, expireSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession(): SessionValue { const value = useContext(SessionContext); if (!value) throw new Error('useSession requer SessionProvider'); return value; }
