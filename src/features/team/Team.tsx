import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound } from 'lucide-react';
import { ContactAvatar } from '../../components/ui/avatar';
import { PageHeader } from '../../components/ui/page-header';
import { Badge } from '../../components/ui/shadcn/badge';
import { Button } from '../../components/ui/shadcn/button';
import { useSession } from '../session/SessionContext';
import { teamApi } from '../../lib/teamApi';
import { errorMessage, roleLabels } from './teamPresentation';
import type { TeamMember } from '../../types/resources';
export function TeamPage() {
  const { session } = useSession(); const canManage = session?.permissions.includes('team.permissions.manage');
  const [members, setMembers] = useState<TeamMember[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [reload, setReload] = useState(0); const busy = useRef(false);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); void teamApi.directory(undefined, controller.signal).then((page) => { if (!controller.signal.aborted) { setMembers(page.items); setCursor(page.nextCursor); } }).catch((reason) => { if (!controller.signal.aborted) setError(errorMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [session?.organization?.id, reload]);
  async function more() { if (!cursor || busy.current) return; busy.current = true; setLoading(true); try { const page = await teamApi.directory(cursor); setMembers((previous) => [...previous, ...page.items]); setCursor(page.nextCursor); } catch (reason) { setError(errorMessage(reason)); } finally { busy.current = false; setLoading(false); } }
  return <section className="team-page admin-compact-page">
    <PageHeader eyebrow="GESTÃO" title="Equipe e permissões" icon={<UsersRound size={20} />}
      description={`Membros da organização ${session?.organization?.name ?? ''}.`} />
    {error && <p role="alert" className="error-text">{error} <button type="button" onClick={() => setReload((value) => value + 1)}>Tentar novamente</button></p>}
    {loading && <p role="status">Carregando equipe…</p>}
    <ul className="team-list">{members.map(member => {
      const active = member.status === 'ACTIVE' && member.userStatus === 'ACTIVE';
      return <li key={member.id}>
        <div className="team-member-identity"><ContactAvatar name={member.name} />
          <div><strong>{member.name}</strong><span>{member.email}</span></div>
        </div>
        <Badge variant="outline">{roleLabels[member.role] ?? member.role}</Badge>
        <Badge variant={active ? 'success' : 'secondary'}>{active ? 'Ativo' : 'Inativo'}</Badge>
        {canManage && <Button asChild variant="outline" size="compact"><Link to={`/app/team/${member.id}/permissions`}>Gerenciar permissões</Link></Button>}
      </li>;
    })}</ul>
    {!loading && !error && members.length === 0 && <p role="status">Nenhum membro encontrado.</p>}
    {cursor && <Button size="compact" variant="outline" type="button" disabled={loading} onClick={() => void more()}>Carregar mais membros</Button>}
  </section>;
}

export { MemberPermissionsPage } from './MemberPermissions';
