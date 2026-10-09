import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '../../types/auth';
import { setCsrfToken } from '../../lib/api';
import { sessionApi } from '../../lib/session';

interface SessionValue { session: Session | null; loading: boolean; error: string | null; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; selectOrganization: (id: string) => Promise<void>; expireSession: () => void; refreshSession: (force?: boolean) => Promise<void> }
const SessionContext = createContext<SessionValue | null>(null);
function discardPermissionCheckpoints(userId?: string) {
  if (userId) { try { for (const key of Object.keys(sessionStorage)) if (key.startsWith(`wapphub-chat:realtime:applied:v2:${userId}:`)) sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ } }
}
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const revision = useRef(0); const refreshing = useRef(false); const refreshingAttempt = useRef(0); const refreshAgain = useRef(false); const current = useRef(session); current.current = session;
  const refreshSession = useCallback(async (force = false) => {
    if (refreshing.current) { if (force) { revision.current += 1; setLoading(true); discardPermissionCheckpoints(current.current?.user.id); refreshAgain.current = true; } else if (refreshingAttempt.current !== revision.current) refreshAgain.current = true; return; }
    refreshing.current = true; const attempt = ++revision.current; refreshingAttempt.current = attempt;
    if (force) setLoading(true);
    if (force) discardPermissionCheckpoints(current.current?.user.id);
    try {
      const updated = await sessionApi.current();
      if (attempt === revision.current) {
        const previous = current.current;
        const changed = previous && (previous.user.id !== updated.user.id || previous.organization?.id !== updated.organization?.id || previous.membership?.permissionVersion !== updated.membership?.permissionVersion || JSON.stringify(previous.permissions) !== JSON.stringify(updated.permissions));
        if (changed) discardPermissionCheckpoints(current.current?.user.id);
        setSession(updated); setError(null);
      }
    }
    catch (reason) { if (attempt === revision.current) { if (force || !current.current || (reason instanceof Error && 'status' in reason && [401, 403].includes(Number(reason.status)))) setSession(null); setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a sessão.'); } }
    finally { refreshing.current = false; if (attempt === revision.current) setLoading(false); if (refreshAgain.current) { refreshAgain.current = false; void refreshSession(); } }
  }, []);
  useEffect(() => { void refreshSession(); }, [refreshSession]);
  useEffect(() => {
    if (!session) return;
    const resume = () => { if (document.visibilityState === 'visible') void refreshSession(); };
    window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume);
    return () => { window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, [session, refreshSession]);
  const login = useCallback(async (email: string, password: string) => { const attempt = ++revision.current; setLoading(true); try { const updated = await sessionApi.login(email, password); if (attempt === revision.current) { setSession(updated); setError(null); } } finally { if (attempt === revision.current) setLoading(false); } }, []);
  const expireSession = useCallback(() => { revision.current += 1; refreshAgain.current = false; setCsrfToken(null); setSession(null); }, []);
  const logout = useCallback(async () => { revision.current += 1; refreshAgain.current = false; setLoading(true); try { await sessionApi.logout(); } finally { expireSession(); setLoading(false); } }, [expireSession]);
  const selectOrganization = useCallback(async (id: string) => { const attempt = ++revision.current; setLoading(true); try { const context = await sessionApi.selectOrganization(id); if (attempt === revision.current) setSession((previous) => previous ? { ...previous, currentOrganizationId: context.organization.id, ...context } : previous); } finally { if (attempt === revision.current) setLoading(false); } }, []);
  const value = useMemo(() => ({ session, loading, error, login, logout, selectOrganization, expireSession, refreshSession }), [session, loading, error, login, logout, selectOrganization, expireSession, refreshSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession(): SessionValue { const value = useContext(SessionContext); if (!value) throw new Error('useSession requer SessionProvider'); return value; }
