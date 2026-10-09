import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TeamPage, MemberPermissionsPage } from './Team';
import { teamApi } from '../../lib/teamApi';
import { ApiError } from '../../lib/api';
import { resourceFixture } from '../../test/resourceFixture';
import type { MemberPermissions } from '../../types/resources';
const session = vi.hoisted(() => ({ user: { id: 'owner' }, organization: { id: 'org', name: 'Organização A' }, permissions: ['team.read', 'team.permissions.manage', 'messages.send', 'providers.manage'], resources: [] as typeof resourceFixture }));
vi.mock('../session/SessionContext', () => ({ useSession: () => ({ session }) }));
vi.mock('../../lib/teamApi', () => ({ teamApi: { directory: vi.fn(), permissions: vi.fn(), member: vi.fn(), save: vi.fn(), reset: vi.fn() } }));
const value: MemberPermissions = { member: { id: 'member-1', userId: 'agent', name: 'Ana', email: 'ana@example.test', role: 'AGENT', status: 'ACTIVE', userStatus: 'ACTIVE' }, version: 7, inherited: ['messages.send'], grants: [], revocations: [], effective: ['messages.send'] };
function mountEditor() { return render(<MemoryRouter initialEntries={['/app/team/member-1/permissions']}><Routes><Route path="/app/team/:membershipId/permissions" element={<MemberPermissionsPage />} /></Routes></MemoryRouter>); }
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
    session.user.id = 'owner'; session.permissions = ['team.read', 'team.permissions.manage', 'messages.send']; vi.mocked(teamApi.save).mockRejectedValue(new ApiError(409, 'conflict', 'conflict', 'PERMISSION_VERSION_CONFLICT')); mountEditor(); await screen.findByText('Ana'); expect(screen.getByRole('combobox', { name: 'Gerenciar providers' })).toBeDisabled(); fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); fireEvent.click(screen.getByRole('button', { name: 'Confirmar' })); expect(await screen.findByRole('alert')).toHaveTextContent('Recarregue antes de salvar');
    vi.mocked(teamApi.member).mockResolvedValue({ ...value, version: 9 }); fireEvent.click(screen.getByRole('button', { name: 'Recarregar' })); await waitFor(() => expect(teamApi.member).toHaveBeenCalledTimes(3)); await screen.findByText('Ana'); expect(within(screen.getByRole('group', { name: 'Atendimento' })).getByRole('combobox')).toHaveValue('default');
  });
  it('paginates the directory and presents errors without inventing members', async () => {
    vi.mocked(teamApi.directory).mockResolvedValueOnce({ items: [value.member], nextCursor: 'cursor' }).mockResolvedValueOnce({ items: [{ ...value.member, id: 'member-2', name: 'Bia' }], nextCursor: null }); render(<MemoryRouter><TeamPage /></MemoryRouter>); await screen.findByText('Ana'); fireEvent.click(screen.getByRole('button', { name: 'Carregar mais membros' })); await screen.findByText('Bia'); expect(teamApi.directory).toHaveBeenLastCalledWith('cursor');
  });
});
