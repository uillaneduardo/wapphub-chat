import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, Link, MemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { TeamPage, MemberPermissionsPage } from './Team';
import { teamApi } from '../../lib/teamApi';
import { ApiError } from '../../lib/api';
import { resourceFixture } from '../../test/resourceFixture';
import type { MemberPermissions } from '../../types/resources';
const session = vi.hoisted(() => ({ user: { id: 'owner' }, organization: { id: 'org', name: 'Organização A' }, permissions: ['team.read', 'team.permissions.manage', 'messages.send', 'providers.manage'], resources: [] as typeof resourceFixture }));
vi.mock('../session/SessionContext', () => ({ useSession: () => ({ session }) }));
vi.mock('../../lib/teamApi', () => ({ teamApi: { directory: vi.fn(), permissions: vi.fn(), member: vi.fn(), save: vi.fn(), reset: vi.fn() } }));
const value: MemberPermissions = { member: { id: 'member-1', userId: 'agent', name: 'Ana', email: 'ana@example.test', role: 'AGENT', status: 'ACTIVE', userStatus: 'ACTIVE' }, version: 7, inherited: ['messages.send'], grants: [], revocations: [], effective: ['messages.send'] };
function mountEditor() {
  const router = createMemoryRouter([{ element: <><nav><Link to="/app/team/member-2/permissions">Outro membro</Link><Link to="/organizations">Trocar organização</Link><Link to="/app/contacts">Contatos</Link></nav><Outlet /></>, children: [
    { path: '/app/team/:membershipId/permissions', element: <MemberPermissionsPage /> },
    { path: '/app/team', element: <p>Diretório de equipe</p> }, { path: '/organizations', element: <p>Seleção de organização</p> }, { path: '/app/contacts', element: <p>Lista de contatos</p> },
  ] }], { initialEntries: ['/app/team', '/app/team/member-1/permissions'], initialIndex: 1 });
  return { ...render(<RouterProvider router={router} />), router };
}
beforeEach(() => {
  vi.resetAllMocks(); session.resources = resourceFixture; session.user.id = 'owner'; session.permissions = ['team.read', 'team.permissions.manage', 'messages.send', 'providers.manage'];
  vi.mocked(teamApi.member).mockResolvedValue(value);
  vi.mocked(teamApi.permissions).mockResolvedValue({ items: [{ code: 'messages.send', name: 'Enviar mensagens', module: 'Atendimento', resourceCode: 'chat.text', editable: true, sensitive: false }, { code: 'providers.manage', name: 'Gerenciar providers', module: 'Gestão', resourceCode: 'providers.management', editable: true, sensitive: true }] });
  vi.mocked(teamApi.directory).mockResolvedValue({ items: [value.member], nextCursor: null });
  vi.mocked(teamApi.save).mockResolvedValue({ ...value, version: 8, revocations: ['messages.send'], effective: [] });
  vi.mocked(teamApi.reset).mockResolvedValue({ ...value, version: 8 });
});
describe('functional team permissions', () => {
  it('shows real member identity/profile/state and authorized action; read-only users have no edit action', async () => {
    const view = render(<MemoryRouter><TeamPage /></MemoryRouter>); await screen.findByText('Ana');
    expect(screen.getByText('ana@example.test')).toBeInTheDocument(); expect(screen.getByText('Atendente')).toBeInTheDocument(); expect(screen.getByText('Ativo')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Gerenciar permissões' })).toHaveAttribute('href', '/app/team/member-1/permissions');
    view.unmount(); session.permissions = ['team.read']; render(<MemoryRouter><TeamPage /></MemoryRouter>); await screen.findByText('Ana'); expect(screen.queryByRole('link', { name: 'Gerenciar permissões' })).not.toBeInTheDocument();
  });
  it('groups inherited/granted/revoked operations and never offers future resource activation', async () => {
    vi.mocked(teamApi.member).mockResolvedValue({ ...value, grants: ['providers.manage'], revocations: ['messages.send'] }); mountEditor();
    await screen.findByText('Ana'); expect(screen.getByRole('group', { name: 'Atendimento' })).toBeInTheDocument(); expect(screen.getByRole('group', { name: 'Gestão' })).toBeInTheDocument(); expect(screen.getByText(/Herdada do perfil · Revogação individual/)).toBeInTheDocument(); expect(screen.getByText(/Não incluída no perfil · Concessão individual/)).toBeInTheDocument();
    expect(screen.getByText('Respostas rápidas')).toBeInTheDocument(); expect(screen.queryByRole('combobox', { name: 'Respostas rápidas' })).not.toBeInTheDocument();
  });
  it('persists through Core only after confirmation with expected revision and blocks double submissions', async () => {
    let finish!: (result: MemberPermissions) => void; vi.mocked(teamApi.save).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    mountEditor(); await screen.findByText('Ana'); fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'revoke' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); expect(teamApi.save).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: 'Confirmar' }); expect(confirm).toHaveFocus(); fireEvent.click(confirm); fireEvent.click(confirm); expect(teamApi.save).toHaveBeenCalledExactlyOnceWith('member-1', 7, [], ['messages.send']); expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    finish({ ...value, version: 8, revocations: ['messages.send'], effective: [] }); await screen.findByText(/Permissões salvas/);
  });
  it('restores defaults through the API after confirmation and supports Escape with focus return', async () => {
    mountEditor(); await screen.findByText('Ana'); const reset = screen.getByRole('button', { name: 'Restaurar padrões' }); fireEvent.click(reset); fireEvent.keyDown(screen.getByRole('button', { name: 'Confirmar' }), { key: 'Escape' }); expect(reset).toHaveFocus(); expect(teamApi.reset).not.toHaveBeenCalled();
    fireEvent.click(reset); fireEvent.click(screen.getByRole('button', { name: 'Confirmar' })); await screen.findByText('Permissões padrão restauradas.'); expect(teamApi.reset).toHaveBeenCalledExactlyOnceWith('member-1', 7);
  });
  it('does not permit self-editing or operations absent from the actor; shows concurrent update errors', async () => {
    session.user.id = 'agent'; const view = mountEditor(); await screen.findByText('Ana'); expect(screen.getByRole('combobox', { name: 'Enviar mensagens' })).toBeDisabled(); expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument(); view.unmount();
    session.user.id = 'owner'; session.permissions = ['team.read', 'team.permissions.manage', 'messages.send']; vi.mocked(teamApi.save).mockRejectedValue(new ApiError(409, 'conflict', 'conflict', 'PERMISSION_VERSION_CONFLICT')); mountEditor(); await screen.findByText('Ana'); expect(screen.getByRole('combobox', { name: 'Gerenciar providers' })).toBeDisabled(); fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'revoke' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Confirmar' })); expect(await screen.findByRole('alert')).toHaveTextContent('Recarregue antes de salvar');
    vi.mocked(teamApi.member).mockResolvedValue({ ...value, version: 9 }); fireEvent.click(screen.getByRole('button', { name: 'Recarregar' })); expect(screen.getByRole('combobox', { name: 'Enviar mensagens' })).toHaveValue('revoke'); fireEvent.click(screen.getByRole('button', { name: 'Descartar e continuar' })); await waitFor(() => expect(teamApi.member).toHaveBeenCalledTimes(3)); await screen.findByText('Ana'); expect(within(screen.getByRole('group', { name: 'Atendimento' })).getByRole('combobox')).toHaveValue('default');
  });
  it('paginates the directory and presents errors without inventing members', async () => {
    vi.mocked(teamApi.directory).mockResolvedValueOnce({ items: [value.member], nextCursor: 'cursor' }).mockResolvedValueOnce({ items: [{ ...value.member, id: 'member-2', name: 'Bia' }], nextCursor: null }); render(<MemoryRouter><TeamPage /></MemoryRouter>); await screen.findByText('Ana'); fireEvent.click(screen.getByRole('button', { name: 'Carregar mais membros' })); await screen.findByText('Bia'); expect(teamApi.directory).toHaveBeenLastCalledWith('cursor');
  });
});

describe('permission editor polish', () => {
  it('filters title, resource description and technical code locally regardless of case, clears and reports no results', async () => {
    mountEditor(); await screen.findByText('Ana'); const input = screen.getByRole('searchbox', { name: 'Buscar permissões' });
    const calls = vi.mocked(teamApi.permissions).mock.calls.length;
    fireEvent.change(input, { target: { value: 'ENVIAR' } }); expect(screen.getByRole('combobox', { name: 'Enviar mensagens' })).toBeInTheDocument(); expect(screen.queryByRole('combobox', { name: 'Gerenciar providers' })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'PROVIDERS.MANAGE' } }); expect(screen.getByRole('combobox', { name: 'Gerenciar providers' })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Mensagens de texto da organização' } }); expect(screen.getByRole('combobox', { name: 'Enviar mensagens' })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'nenhumresultado' } }); expect(screen.getByText(/Nenhuma permissão encontrada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' })); expect(input).toHaveValue(''); expect(screen.getAllByRole('combobox')).toHaveLength(2); expect(teamApi.permissions).toHaveBeenCalledTimes(calls); expect(teamApi.member).toHaveBeenCalledTimes(1); expect(teamApi.save).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });
  it('collapses/expands groups, exposes matching search results and preserves accordion state after clearing search', async () => {
    mountEditor(); await screen.findByText('Ana'); const toggle = screen.getByRole('button', { name: /Atendimento.*concedidas/ });
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!); expect(panel).toHaveAttribute('role', 'group'); expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle); expect(toggle).toHaveAttribute('aria-expanded', 'false'); expect(panel).toHaveAttribute('hidden');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'messages.send' } }); expect(screen.getByRole('combobox', { name: 'Enviar mensagens' })).toBeVisible(); expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' })); expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todas' })); expect(screen.getAllByRole('group')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Recolher todas' })); expect(screen.queryAllByRole('group')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todas' })); expect(screen.getAllByRole('group')).toHaveLength(2);
  });
  it('supports keyboard group navigation and confirmation focus/Escape with no mutation', async () => {
    mountEditor(); await screen.findByText('Ana'); const atendimento = screen.getByRole('button', { name: /Atendimento.*concedidas/ }); const gestao = screen.getByRole('button', { name: /Gestão.*concedidas/ });
    atendimento.focus(); fireEvent.keyDown(atendimento, { key: 'ArrowDown' }); expect(gestao).toHaveFocus(); fireEvent.keyDown(gestao, { key: 'Home' }); expect(atendimento).toHaveFocus(); fireEvent.keyDown(atendimento, { key: 'End' }); expect(gestao).toHaveFocus(); fireEvent.keyDown(gestao, { key: 'ArrowUp' }); expect(atendimento).toHaveFocus();
    fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'revoke' } }); const save = screen.getByRole('button', { name: 'Salvar alterações' }); fireEvent.click(save);
    const dialog = screen.getByRole('dialog', { name: 'Confirmar alteração de permissões' }); expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus(); const cancel = within(dialog).getByRole('button', { name: 'Cancelar' }); cancel.focus(); fireEvent.keyDown(cancel, { key: 'Tab' }); expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus(); fireEvent.keyDown(dialog, { key: 'Escape' }); expect(save).toHaveFocus(); expect(teamApi.save).not.toHaveBeenCalled();
  });
  it('counts draft permissions and changes while separating inherited/default overrides from applied access', async () => {
    mountEditor(); await screen.findByText('Ana'); expect(screen.getByRole('button', { name: /Atendimento.*1\/1 concedidas/ })).toBeInTheDocument(); expect(screen.getByText('0 alterações pendentes')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'revoke' } }); expect(screen.getByText('1 alteração pendente')).toBeInTheDocument(); expect(screen.getByText('Acesso aplicado: Permitido · Proposta após salvar: não permitido')).toBeInTheDocument(); expect(screen.getByRole('button', { name: /Atendimento.*0\/1 concedidas/ })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Gerenciar providers' }), { target: { value: 'grant' } }); expect(screen.getByText('2 alterações pendentes')).toBeInTheDocument(); expect(screen.getByText('Acesso aplicado: Não permitido · Proposta após salvar: permitido')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'default' } }); expect(screen.getByText('1 alteração pendente')).toBeInTheDocument();
  });
  it('discards only after confirmation and restores the persisted overrides without API calls', async () => {
    vi.mocked(teamApi.member).mockResolvedValue({ ...value, grants: ['providers.manage'] }); mountEditor(); await screen.findByText('Ana');
    fireEvent.change(screen.getByRole('combobox', { name: 'Gerenciar providers' }), { target: { value: 'default' } }); fireEvent.click(screen.getByRole('button', { name: 'Descartar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Continuar editando' })); expect(screen.getByRole('combobox', { name: 'Gerenciar providers' })).toHaveValue('default');
    fireEvent.click(screen.getByRole('button', { name: 'Descartar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Descartar e continuar' })); expect(screen.getByRole('combobox', { name: 'Gerenciar providers' })).toHaveValue('grant'); expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled(); expect(teamApi.save).not.toHaveBeenCalled(); expect(teamApi.reset).not.toHaveBeenCalled();
  });
  it('keeps drafts and the original version after failure, permits retry and only accepts the confirmed API state', async () => {
    vi.mocked(teamApi.save).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...value, version: 8, grants: ['providers.manage'], effective: ['messages.send', 'providers.manage'] });
    mountEditor(); await screen.findByText('Ana'); fireEvent.change(screen.getByRole('combobox', { name: 'Gerenciar providers' }), { target: { value: 'grant' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Confirmar' })); await screen.findByRole('alert'); expect(screen.getByRole('combobox', { name: 'Gerenciar providers' })).toHaveValue('grant'); expect(screen.getByText('1 alteração pendente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Confirmar' })); await screen.findByText(/Permissões salvas/); expect(teamApi.save).toHaveBeenLastCalledWith('member-1', 7, ['providers.manage'], []); expect(screen.getByText('0 alterações pendentes')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    expect(within(screen.getByRole('group', { name: 'Gestão' })).getByText('Acesso aplicado: Permitido')).toBeInTheDocument();
  });
  it('names sensitive administrative revocations for both saving and restoring defaults', async () => {
    vi.mocked(teamApi.member).mockResolvedValue({ ...value, grants: ['providers.manage'], effective: ['messages.send', 'providers.manage'] }); mountEditor(); await screen.findByText('Ana');
    fireEvent.change(screen.getByRole('combobox', { name: 'Gerenciar providers' }), { target: { value: 'revoke' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); expect(screen.getByRole('dialog')).toHaveTextContent('revoga acessos administrativos sensíveis'); expect(screen.getByRole('dialog')).toHaveTextContent('Gerenciar providers (providers.manage)'); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrões' })); expect(screen.getByRole('dialog')).toHaveTextContent('Gerenciar providers (providers.manage)'); expect(teamApi.save).not.toHaveBeenCalled(); expect(teamApi.reset).not.toHaveBeenCalled();
  });
  it.each([['Outro membro', '/app/team/member-2/permissions'], ['Trocar organização', '/organizations'], ['Contatos', '/app/contacts'], ['← Equipe e permissões', '/app/team']])('guards unsaved edits before navigation to %s', async (label, path) => {
    const view = mountEditor(); await screen.findByText('Ana'); fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'revoke' } });
    fireEvent.click(screen.getByRole('link', { name: label })); expect(screen.getByRole('dialog', { name: 'Alterações não salvas' })).toBeInTheDocument(); expect(view.router.state.location.pathname).toBe('/app/team/member-1/permissions');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar editando' })); expect(screen.getByRole('combobox', { name: 'Enviar mensagens' })).toHaveValue('revoke');
    vi.mocked(teamApi.member).mockResolvedValue({ ...value, member: { ...value.member, id: 'member-2', name: 'Bia' } }); fireEvent.click(screen.getByRole('link', { name: label })); fireEvent.click(screen.getByRole('button', { name: 'Descartar e continuar' })); await waitFor(() => expect(view.router.state.location.pathname).toBe(path)); expect(teamApi.save).not.toHaveBeenCalled();
    if (label === 'Outro membro') { await screen.findByText('Bia'); expect(screen.getByRole('combobox', { name: 'Enviar mensagens' })).toHaveValue('default'); expect(screen.queryByText('Ana')).not.toBeInTheDocument(); }
  });
  it('ignores a late response from the previous member', async () => {
    let finish!: (result: MemberPermissions) => void;
    vi.mocked(teamApi.member).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce({ ...value, member: { ...value.member, id: 'member-2', name: 'Bia' } });
    mountEditor(); fireEvent.click(screen.getByRole('link', { name: 'Outro membro' })); await screen.findByText('Bia'); finish(value); await waitFor(() => expect(screen.queryByText('Ana')).not.toBeInTheDocument()); expect(screen.getByText('Bia')).toBeInTheDocument();
  });
  it('keeps new modules and missing contexts accessible, and disables unavailable/nondelegable operations', async () => {
    vi.mocked(teamApi.permissions).mockResolvedValue({ items: [
      { code: 'organization.read', name: 'Consultar contexto', module: '', resourceCode: 'organization.context', editable: false, sensitive: false },
      { code: 'messages.send', name: 'Enviar mensagens', module: 'Novo contexto', resourceCode: 'chat.text', editable: true, sensitive: false },
      { code: 'future.test', name: 'Operação futura do catálogo de teste', module: 'Produtividade', resourceCode: 'chat.quick_replies', editable: true, sensitive: false },
    ] });
    session.permissions.push('future.test'); mountEditor(); await screen.findByText('Ana'); expect(screen.getByRole('group', { name: 'Outras permissões' })).toBeInTheDocument(); expect(screen.getByRole('group', { name: 'Novo contexto' })).toBeInTheDocument(); expect(screen.getByRole('combobox', { name: 'Consultar contexto' })).toBeDisabled(); expect(screen.getByText('Permissão não delegável')).toBeInTheDocument(); expect(screen.getByRole('combobox', { name: 'Operação futura do catálogo de teste' })).toBeDisabled(); expect(screen.getByRole('combobox', { name: 'Operação futura do catálogo de teste' })).toHaveAccessibleDescription('Em breve'); expect(screen.getByRole('button', { name: /Produtividade.*0\/0 concedidas/ })).toBeInTheDocument();
  });
  it('protects reload/unload while dirty and unblocks after discarding', async () => {
    mountEditor(); await screen.findByText('Ana'); fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'revoke' } }); const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Descartar e continuar' })); const cleanEvent = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(cleanEvent); expect(cleanEvent.defaultPrevented).toBe(false);
  });
});

describe('navigation and save concurrency', () => {
  it('blocks browser history navigation with pending edits', async () => {
    const view = mountEditor(); await screen.findByText('Ana'); fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'revoke' } });
    await act(async () => { await view.router.navigate(-1); }); expect(screen.getByRole('dialog', { name: 'Alterações não salvas' })).toBeInTheDocument(); expect(view.router.state.location.pathname).toBe('/app/team/member-1/permissions');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar editando' })); expect(screen.getByRole('combobox', { name: 'Enviar mensagens' })).toHaveValue('revoke');
    await act(async () => { await view.router.navigate(-1); }); fireEvent.click(screen.getByRole('button', { name: 'Descartar e continuar' })); await screen.findByText('Diretório de equipe');
  });
  it('keeps navigation blocked during an in-flight save and preserves revision returned by Core', async () => {
    let finish!: (result: MemberPermissions) => void; vi.mocked(teamApi.save).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = mountEditor(); await screen.findByText('Ana'); fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'revoke' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await act(async () => { await view.router.navigate('/organizations'); }); expect(screen.getByRole('dialog')).toHaveTextContent('Aguarde o salvamento'); expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    await act(async () => finish({ ...value, version: 8, revocations: ['messages.send'], effective: [] })); expect(view.router.state.location.pathname).toBe('/app/team/member-1/permissions'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Enviar mensagens' }), { target: { value: 'default' } }); vi.mocked(teamApi.save).mockResolvedValueOnce({ ...value, version: 9 }); fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Confirmar' })); await waitFor(() => expect(teamApi.save).toHaveBeenLastCalledWith('member-1', 8, [], []));
  });
});
