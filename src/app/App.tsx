import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../features/session/SessionContext';
import { AppShell } from '../components/AppShell';
import { RequireOrganization, RequirePermission, RequireSession } from '../routes/Guards';
import { ForgotPasswordPage, LoginPage, OrganizationsPage, PlaceholderPage } from '../routes/Pages';
import { ConversationsLayout, ConversationView, InboxWelcome } from '../features/conversations/Conversations';
import { DemoSimulatorPage, ProvidersPage } from '../features/providers/Providers';

const appRoutes: [string, string][] = [
  ['/app/contacts', 'Contatos'], ['/app/contacts/:contactId', 'Contato'], ['/app/files', 'Arquivos'], ['/app/team', 'Equipe'], ['/app/team/invitations', 'Convites'], ['/app/tags', 'Tags'], ['/app/settings', 'Configurações'], ['/app/settings/company', 'Empresa'], ['/app/settings/conversations', 'Preferências de conversa'], ['/app/settings/assignment', 'Atribuição'], ['/app/settings/channels', 'Canais'], ['/app/settings/channels/whatsapp', 'WhatsApp'],
];
export function App() { return <BrowserRouter><SessionProvider><Routes>
  <Route path="/login" element={<LoginPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/invite/:token" element={<PlaceholderPage title="Aceitar convite" />} />
  <Route element={<RequireSession />}><Route path="/organizations" element={<OrganizationsPage />} /><Route element={<RequireOrganization />}><Route path="/app" element={<AppShell />}>
    <Route path="conversations" element={<RequirePermission permission="conversations.read" />}><Route element={<ConversationsLayout />}><Route index element={<InboxWelcome />} /><Route path=":conversationId" element={<ConversationView />} /></Route></Route>
    <Route element={<RequirePermission permission="providers.manage" />}><Route path="settings/providers" element={<ProvidersPage />} /></Route>
    <Route element={<RequirePermission permission="providers.simulate" />}><Route element={<RequirePermission permission="messages.read" />}><Route path="providers/demo/simulator" element={<DemoSimulatorPage />} /></Route></Route>
    {appRoutes.map(([path, title]) => <Route key={path} path={path.slice(5)} element={<PlaceholderPage title={title} />} />)}<Route index element={<Navigate to="conversations" replace />} />
  </Route></Route></Route>
  <Route path="/" element={<Navigate to="/app/conversations" replace />} /><Route path="*" element={<PlaceholderPage title="Página não encontrada" />} />
</Routes></SessionProvider></BrowserRouter>; }
