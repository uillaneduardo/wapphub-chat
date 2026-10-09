import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { appRouteDefinitions } from './routes';
const state = vi.hoisted(() => ({ session: { user: { id: 'user' }, currentOrganizationId: 'org', organization: { id: 'org', name: 'Org' }, organizations: [{ id: 'org', name: 'Org' }], permissions: ['conversations.read', 'contacts.read', 'providers.manage', 'providers.simulate', 'messages.read', 'team.read', 'team.permissions.manage'] } }));
vi.mock('../features/session/SessionContext', () => ({ SessionProvider: ({ children }: { children: ReactNode }) => children, useSession: () => ({ ...state, loading: false }) }));
vi.mock('../components/AppShell', () => ({ AppShell: () => <main><Outlet /></main> }));
vi.mock('../features/conversations/Conversations', () => ({ ConversationsLayout: () => <Outlet />, InboxWelcome: () => <p>Inbox</p>, ConversationView: () => <p>Conversa</p> }));
vi.mock('../features/contacts/Contacts', () => ({ ContactsPage: () => <p>Contatos</p>, ContactDetailPage: () => <p>Contato</p> }));
vi.mock('../features/conversations/NewConversation', () => ({ NewConversationPage: () => <p>Nova conversa</p> }));
vi.mock('../features/providers/Providers', () => ({ ProvidersPage: () => <p>Providers</p>, DemoSimulatorPage: () => <p>Demo</p> }));
vi.mock('../features/team/Team', () => ({ TeamPage: () => <p>Equipe</p>, MemberPermissionsPage: () => <p>Editor</p> }));
const permissions = [...state.session.permissions];
afterEach(() => { state.session.permissions = [...permissions]; });
describe('preserved route tree with navigation blocking support', () => {
  it.each([
    ['/app/conversations', 'Inbox'], ['/app/conversations/conv', 'Conversa'], ['/app/conversations/new', 'Nova conversa'], ['/app/contacts', 'Contatos'], ['/app/contacts/contact', 'Contato'], ['/app/settings/providers', 'Providers'], ['/app/providers/demo/simulator', 'Demo'], ['/app/team', 'Equipe'], ['/app/team/member/permissions', 'Editor'],
  ])('keeps deep route %s reachable for its authorized context', async (path, text) => {
    const router = createMemoryRouter(appRouteDefinitions, { initialEntries: [path] }); render(<RouterProvider router={router} />); expect(await screen.findByText(text)).toBeInTheDocument(); expect(router.state.location.pathname).toBe(path); router.dispose();
  });
  it.each(['/app/conversations', '/app/contacts', '/app/settings/providers', '/app/providers/demo/simulator', '/app/team', '/app/team/member/permissions'])('denies direct navigation to %s without permissions', async (path) => {
    state.session.permissions = []; const router = createMemoryRouter(appRouteDefinitions, { initialEntries: [path] }); render(<RouterProvider router={router} />); expect(await screen.findByRole('alert')).toHaveTextContent('Acesso indisponível'); router.dispose();
  });
});
