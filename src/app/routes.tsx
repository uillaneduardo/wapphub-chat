import { TeamPage, MemberPermissionsPage } from '../features/team/Team';
import { createRoutesFromElements, Navigate, Outlet, Route } from 'react-router-dom';
import { SessionProvider } from '../features/session/SessionContext';
import { AppShell } from '../components/AppShell';
import { RequireOrganization, RequirePermission, RequireSession } from '../routes/Guards';
import { ForgotPasswordPage, LoginPage, OrganizationsPage, PlaceholderPage } from '../routes/Pages';
import { ConversationsLayout, ConversationView, InboxWelcome } from '../features/conversations/Conversations';
import { ContactsPage, ContactDetailPage } from '../features/contacts/Contacts';
import { NewConversationPage } from '../features/conversations/NewConversation';
import { DemoSimulatorPage, ProvidersPage } from '../features/providers/Providers';

const appRoutes: [string, string][] = [
  ['/app/files', 'Arquivos'], ['/app/team/invitations', 'Convites'], ['/app/tags', 'Tags'], ['/app/settings', 'Configurações'], ['/app/settings/company', 'Empresa'], ['/app/settings/conversations', 'Preferências de conversa'], ['/app/settings/assignment', 'Atribuição'], ['/app/settings/channels', 'Canais'], ['/app/settings/channels/whatsapp', 'WhatsApp'],
];
export const appRouteDefinitions = createRoutesFromElements(<Route element={<SessionProvider><Outlet /></SessionProvider>}>
  <Route path="/login" element={<LoginPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/invite/:token" element={<PlaceholderPage title="Aceitar convite" />} />
  <Route element={<RequireSession />}><Route path="/organizations" element={<OrganizationsPage />} /><Route element={<RequireOrganization />}><Route path="/app" element={<AppShell />}>
    <Route path="conversations" element={<RequirePermission permission="conversations.read" />}><Route element={<ConversationsLayout />}><Route index element={<InboxWelcome />} /><Route path="new" element={<NewConversationPage />} /><Route path=":conversationId" element={<ConversationView />} /></Route></Route>
    <Route element={<RequirePermission permission="team.read" />}><Route path="team" element={<TeamPage />} /><Route element={<RequirePermission permission="team.permissions.manage" />}><Route path="team/:membershipId/permissions" element={<MemberPermissionsPage />} /></Route></Route>
    <Route element={<RequirePermission permission="providers.manage" />}><Route path="settings/providers" element={<ProvidersPage />} /></Route>
    <Route element={<RequirePermission permission="providers.simulate" />}><Route element={<RequirePermission permission="messages.read" />}><Route path="providers/demo/simulator" element={<DemoSimulatorPage />} /></Route></Route>
    <Route element={<RequirePermission permission="contacts.read" />}><Route path="contacts" element={<ContactsPage />} /><Route path="contacts/:contactId" element={<ContactDetailPage />} /></Route>
    {appRoutes.map(([path, title]) => <Route key={path} path={path.slice(5)} element={<PlaceholderPage title={title} />} />)}<Route index element={<Navigate to="conversations" replace />} />
  </Route></Route></Route>
  <Route path="/" element={<Navigate to="/app/conversations" replace />} /><Route path="*" element={<PlaceholderPage title="Página não encontrada" />} />
</Route>);
