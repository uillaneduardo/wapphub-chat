import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../session/SessionContext';
import { teamApi } from '../../lib/teamApi';
import { errorMessage, roleLabels } from './teamPresentation';
import type { TeamMember } from '../../types/resources';
export function TeamPage() {
  const { session } = useSession(); const canManage = session?.permissions.includes('team.permissions.manage');
  const [members, setMembers] = useState<TeamMember[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [reload, setReload] = useState(0); const busy = useRef(false);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); void teamApi.directory(undefined, controller.signal).then((page) => { if (!controller.signal.aborted) { setMembers(page.items); setCursor(page.nextCursor); } }).catch((reason) => { if (!controller.signal.aborted) setError(errorMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [session?.organization?.id, reload]);
  async function more() { if (!cursor || busy.current) return; busy.current = true; setLoading(true); try { const page = await teamApi.directory(cursor); setMembers((previous) => [...previous, ...page.items]); setCursor(page.nextCursor); } catch (reason) { setError(errorMessage(reason)); } finally { busy.current = false; setLoading(false); } }
  return <section className="team-page"><p className="eyebrow">GESTÃO</p><h1>Equipe e permissões</h1><p className="muted">Membros da organização {session?.organization?.name}.</p>{error && <p role="alert" className="error-text">{error} <button type="button" onClick={() => setReload((value) => value + 1)}>Tentar novamente</button></p>}{loading && <p role="status">Carregando equipe…</p>}<ul className="team-list">{members.map((member) => <li key={member.id}><div><strong>{member.name}</strong><span>{member.email}</span></div><span>{roleLabels[member.role] ?? member.role}</span><span>{member.status === 'ACTIVE' && member.userStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</span>{canManage && <Link to={`/app/team/${member.id}/permissions`}>Gerenciar permissões</Link>}</li>)}</ul>{!loading && !error && members.length === 0 && <p>Nenhum membro encontrado.</p>}{cursor && <button type="button" disabled={loading} onClick={() => void more()}>Carregar mais membros</button>}</section>;
}

export { MemberPermissionsPage } from './MemberPermissions';
