import { useEffect, useId, useRef, useState } from 'react';
import { Link, useBeforeUnload, useBlocker, useParams } from 'react-router-dom';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
import { availabilityLabels } from '../../components/navigation';
import { useSession } from '../session/SessionContext';
import { teamApi } from '../../lib/teamApi';
import type { MemberPermissions, Permission } from '../../types/resources';
import { errorMessage, roleLabels } from './teamPresentation';
import './permissions.css';

type Mode = 'default' | 'grant' | 'revoke';
type Confirmation = 'save' | 'reset' | 'discard' | 'reload' | null;
function modeOf(code: string, grants: readonly string[], revocations: readonly string[]): Mode {
  return grants.includes(code) ? 'grant' : revocations.includes(code) ? 'revoke' : 'default';
}
const contextIcons: Record<string, AppIconName> = { Atendimento: 'conversations', Produtividade: 'automations', Comunicação: 'campaigns', Gestão: 'team', Preferências: 'settings' };
export function MemberPermissionsPage() {
  const { membershipId = '' } = useParams(); const { session } = useSession();
  return <MemberPermissionsEditor key={`${session?.organization?.id}:${membershipId}`} membershipId={membershipId} />;
}
function MemberPermissionsEditor({ membershipId }: { membershipId: string }) {
  const { session } = useSession(); const prefix = useId();
  const [value, setValue] = useState<MemberPermissions | null>(null);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [grants, setGrants] = useState<string[]>([]); const [revocations, setRevocations] = useState<string[]>([]);
  const [search, setSearch] = useState(''); const [collapsed, setCollapsed] = useState<string[]>([]);
  const [error, setError] = useState(''); const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation>(null); const [reload, setReload] = useState(0);
  const busy = useRef(false); const alive = useRef(false); const confirmation = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null); const groupControls = useRef<HTMLDivElement>(null);
  const self = value?.member.userId === session?.user.id;
  const codes = new Set([...(value?.grants ?? []), ...(value?.revocations ?? []), ...grants, ...revocations]);
  const changed = [...codes].filter((code) => modeOf(code, grants, revocations) !== modeOf(code, value?.grants ?? [], value?.revocations ?? []));
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (changed.length > 0 || busy.current) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  const blockerRef = useRef(blocker);
  useEffect(() => { blockerRef.current = blocker; }, [blocker]);
  useBeforeUnload((event) => { if (changed.length || busy.current) { event.preventDefault(); event.returnValue = ''; } });
  function apply(next: MemberPermissions) { setValue(next); setGrants(next.grants); setRevocations(next.revocations); }
  useEffect(() => {
    const controller = new AbortController(); alive.current = true; setValue(null); setSaved(''); setError(''); setLoading(true);
    void Promise.all([teamApi.member(membershipId, controller.signal), teamApi.permissions(controller.signal)]).then(([next, permissions]) => {
      if (!controller.signal.aborted) { apply(next); setCatalog(permissions.items); }
    }).catch((reason) => { if (!controller.signal.aborted) setError(errorMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { alive.current = false; controller.abort(); };
  }, [membershipId, reload]);
  const navigating = blocker.state === 'blocked';
  useEffect(() => { if (confirm || navigating) { if (navigating) returnFocus.current = document.activeElement as HTMLElement; confirmation.current?.focus(); } else if (!saving) returnFocus.current?.focus(); }, [confirm, navigating, saving]);
  function cancel() { setConfirm(null); if (blockerRef.current.state === 'blocked') blockerRef.current.reset(); returnFocus.current?.focus(); }
  function ask(action: Confirmation, element: HTMLElement) { returnFocus.current = element; setConfirm(action); }
  function choose(code: string, mode: string) {
    setSaved(''); setGrants((previous) => [...previous.filter((item) => item !== code), ...(mode === 'grant' ? [code] : [])]);
    setRevocations((previous) => [...previous.filter((item) => item !== code), ...(mode === 'revoke' ? [code] : [])]);
  }
  function discard() { if (value) { setGrants(value.grants); setRevocations(value.revocations); } setSaved(''); cancel(); }
  async function persist() {
    if (!value || (confirm !== 'save' && confirm !== 'reset') || busy.current || self || navigating || (confirm === 'save' && !changed.length)) return;
    busy.current = true; setSaving(true); setError(''); setSaved(''); const action = confirm;
    try {
      const next = action === 'reset' ? await teamApi.reset(value.member.id, value.version) : await teamApi.save(value.member.id, value.version, grants, revocations);
      if (!alive.current) return;
      apply(next); setSaved(action === 'reset' ? 'Permissões padrão restauradas.' : 'Permissões salvas. O acesso das sessões será atualizado automaticamente.'); cancel();
    } catch (reason) { if (alive.current) { setError(errorMessage(reason)); cancel(); } }
    finally { busy.current = false; if (alive.current) setSaving(false); }
  }
  function available(permission: Permission) { return session?.resources?.find((resource) => resource.code === permission.resourceCode)?.availability === 'AVAILABLE'; }
  function proposed(permission: Permission, reset = false) {
    const mode = reset ? 'default' : modeOf(permission.code, grants, revocations);
    return Boolean(available(permission) && value?.member.status === 'ACTIVE' && value.member.userStatus === 'ACTIVE' && (mode === 'grant' || (mode === 'default' && value.inherited.includes(permission.code))));
  }
  const sensitiveRevocations = catalog.filter((permission) => permission.sensitive && value?.effective.includes(permission.code) && !proposed(permission, confirm === 'reset'));
  const modules = [...new Set(catalog.map((permission) => permission.module.trim() || 'Outras permissões'))];
  const query = search.trim().toLocaleLowerCase('pt-BR');
  function matches(permission: Permission) {
    const resource = session?.resources?.find((item) => item.code === permission.resourceCode);
    return `${permission.name} ${resource?.description ?? ''} ${permission.code}`.toLocaleLowerCase('pt-BR').includes(query);
  }
  const dialog = confirm || navigating;
  return <section className="team-page permissions-editor" aria-busy={saving}>
    <Link to="/app/team">← Equipe e permissões</Link><h1>Permissões do membro</h1>
    {loading && <p role="status">Carregando permissões…</p>}
    {error && <p role="alert" className="error-text">{error} <button type="button" disabled={saving} onClick={(event) => changed.length ? ask('reload', event.currentTarget) : setReload((previous) => previous + 1)}>Recarregar</button></p>}
    {saved && <p role="status" className="success-text">{saved}</p>}
    {value && <>
      <div className="member-summary"><strong>{value.member.name}</strong><span>{value.member.email}</span><p>Perfil: {roleLabels[value.member.role] ?? value.member.role} · {value.member.status === 'ACTIVE' && value.member.userStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</p></div>
      {self && <p className="muted">Suas permissões são exibidas para consulta. Outro administrador autorizado deve fazer alterações.</p>}
      <p className="muted">Padrão usa o perfil. Conceder e revogar criam ajustes individuais. O acesso aplicado só muda após confirmação do Core.</p>
      <div className="permissions-toolbar"><label htmlFor={`${prefix}-search`}>Buscar permissões<input id={`${prefix}-search`} type="search" value={search} placeholder="Título, descrição ou código" onChange={(event) => setSearch(event.target.value)} /></label><button type="button" disabled={!search} onClick={() => setSearch('')}>Limpar busca</button><button type="button" onClick={() => setCollapsed([])}>Expandir todas</button><button type="button" onClick={() => setCollapsed(modules)}>Recolher todas</button></div>
      {query && <p className="muted" role="status">{catalog.filter(matches).length} permissões encontradas. A busca mantém os resultados expandidos.</p>}
      {!catalog.some(matches) && <p role="status">Nenhuma permissão encontrada. Tente outro termo ou limpe a busca.</p>}
      <div ref={groupControls} className="permissions-groups">{modules.map((module, index) => {
        const permissions = catalog.filter((permission) => (permission.module.trim() || 'Outras permissões') === module);
        const filtered = permissions.filter(matches); if (!filtered.length) return null;
        const open = Boolean(query) || !collapsed.includes(module); const id = `${prefix}-group-${index}`;
        const descriptions = [...new Set(permissions.map((permission) => session?.resources?.find((resource) => resource.code === permission.resourceCode)?.description).filter(Boolean))];
        return <section className="permissions-context" key={module}>
          <h2><button className="permission-group-toggle" type="button" aria-expanded={open} aria-controls={id} onClick={() => setCollapsed((previous) => previous.includes(module) ? previous.filter((item) => item !== module) : [...previous, module])} onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            const buttons = [...groupControls.current!.querySelectorAll<HTMLButtonElement>('.permission-group-toggle')]; const at = buttons.indexOf(event.currentTarget);
            event.preventDefault(); buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (at + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
          }}><AppIcon name={contextIcons[module] ?? 'settings'} /><span>{module}</span><small>{permissions.filter((permission) => available(permission) && proposed(permission)).length}/{permissions.filter(available).length} concedidas na proposta</small><AppIcon name="chevron" /></button></h2>
          <div id={id} role="group" aria-label={module} hidden={!open}>
            {descriptions.length === 1 && <p className="muted permission-context-description">{descriptions[0]}</p>}
            {filtered.map((permission) => {
              const resource = session?.resources?.find((item) => item.code === permission.resourceCode); const inherited = value.inherited.includes(permission.code); const mode = modeOf(permission.code, grants, revocations);
              const reason = !available(permission) ? (resource ? availabilityLabels[resource.availability] : 'Recurso indisponível') : !permission.editable ? 'Permissão não delegável' : !session?.permissions.includes(permission.code) ? 'Você não possui esta permissão para delegar' : '';
              const infoId = `${prefix}-info-${permission.code}`;
              return <div key={permission.code} className="permission-row"><div><label htmlFor={`${prefix}-${permission.code}`}>{permission.name}</label><code>{permission.code}</code>{resource?.description && <p className="muted permission-description">{resource.description}</p>}<small>{inherited ? 'Herdada do perfil' : 'Não incluída no perfil'} · {mode === 'grant' ? 'Concessão individual' : mode === 'revoke' ? 'Revogação individual' : 'Padrão do perfil'}</small><small>Acesso aplicado: {value.effective.includes(permission.code) ? 'Permitido' : 'Não permitido'}{changed.includes(permission.code) && ` · Proposta após salvar: ${proposed(permission) ? 'permitido' : 'não permitido'}`}</small><small id={infoId}>{reason || 'Ajuste individual validado pelo Core ao salvar'}</small></div><select id={`${prefix}-${permission.code}`} value={mode} aria-describedby={infoId} disabled={saving || self || Boolean(reason)} onChange={(event) => choose(permission.code, event.target.value)}><option value="default">Padrão do perfil</option><option value="grant">Conceder</option><option value="revoke">Revogar</option></select></div>;
            })}
          </div>
        </section>;
      })}</div>
      <section className="unavailable-resources"><h2>Recursos indisponíveis</h2><ul>{session?.resources?.filter((resource) => resource.availability !== 'AVAILABLE').map((resource) => <li key={resource.code}>{resource.name} <span className="muted">— {availabilityLabels[resource.availability]}</span></li>)}</ul></section>
      {!self && <footer className="permission-actions"><p role="status">{changed.length} {changed.length === 1 ? 'alteração pendente' : 'alterações pendentes'}</p><div className="team-actions"><button type="button" disabled={saving || !changed.length} onClick={(event) => ask('discard', event.currentTarget)}>Descartar alterações</button><button type="button" className="primary-button" disabled={saving || !changed.length} onClick={(event) => ask('save', event.currentTarget)}>{saving ? 'Salvando alterações…' : 'Salvar alterações'}</button><button type="button" disabled={saving} onClick={(event) => ask('reset', event.currentTarget)}>Restaurar padrões</button></div></footer>}
    </>}
    {dialog && <div className="permission-dialog-backdrop"><section className="permission-dialog" role="dialog" aria-modal="true" aria-labelledby={`${prefix}-confirm-title`} aria-describedby={`${prefix}-confirm-description`} onKeyDown={(event) => {
      if (event.key === 'Escape' && !saving) { event.preventDefault(); cancel(); }
      if (event.key === 'Tab') { const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]; const first = buttons[0]; const last = buttons.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    }}>
      <h2 id={`${prefix}-confirm-title`}>{navigating || confirm === 'discard' || confirm === 'reload' ? 'Alterações não salvas' : 'Confirmar alteração de permissões'}</h2>
      <p id={`${prefix}-confirm-description`}>{navigating || confirm === 'discard' || confirm === 'reload' ? saving ? 'Aguarde o salvamento antes de sair da edição.' : 'Deseja descartar as alterações pendentes ou continuar editando?' : confirm === 'reset' ? `Restaurar os padrões de ${value?.member.name}, removendo todos os ajustes individuais?` : `Salvar ${changed.length} ajustes individuais para ${value?.member.name}?`}</p>
      {!navigating && (confirm === 'save' || confirm === 'reset') && sensitiveRevocations.length > 0 && <div className="permission-sensitive"><p>Esta alteração revoga acessos administrativos sensíveis:</p><ul>{sensitiveRevocations.map((permission) => <li key={permission.code}>{permission.name} ({permission.code})</li>)}</ul></div>}
      <button ref={confirmation} type="button" className="primary-button" disabled={saving} onClick={() => {
        if (navigating && blocker.state === 'blocked') { blocker.proceed(); return; }
        if (confirm === 'reload') { discard(); setReload((previous) => previous + 1); }
        else if (confirm === 'discard') discard(); else void persist();
      }}>{saving ? 'Salvando…' : navigating || confirm === 'discard' || confirm === 'reload' ? 'Descartar e continuar' : 'Confirmar'}</button><button type="button" disabled={saving} onClick={cancel}>{navigating || confirm === 'discard' || confirm === 'reload' ? 'Continuar editando' : 'Cancelar'}</button>
    </section></div>}
  </section>;
}
