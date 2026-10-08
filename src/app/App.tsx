import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider } from '../features/session/SessionContext';
import { AppShell } from '../components/AppShell';
import { RequireOrganization, RequireSession } from '../routes/Guards';
import { ForgotPasswordPage, LoginPage, OrganizationsPage, PlaceholderPage } from '../routes/Pages';

const appRoutes: [string, string][] = [
  ['/app/conversations', 'Conversas'], ['/app/conversations/:conversationId', 'Conversa'], ['/app/contacts', 'Contatos'], ['/app/contacts/:contactId', 'Contato'], ['/app/files', 'Arquivos'], ['/app/team', 'Equipe'], ['/app/team/invitations', 'Convites'], ['/app/tags', 'Tags'], ['/app/settings', 'Configurações'], ['/app/settings/company', 'Empresa'], ['/app/settings/conversations', 'Preferências de conversa'], ['/app/settings/assignment', 'Atribuição'], ['/app/settings/channels', 'Canais'], ['/app/settings/channels/whatsapp', 'WhatsApp'],
];
export function App() { return <BrowserRouter><SessionProvider><Routes>
  <Route path="/login" element={<LoginPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/invite/:token" element={<PlaceholderPage title="Aceitar convite" />} />
  <Route element={<RequireSession />}><Route path="/organizations" element={<OrganizationsPage />} /><Route element={<RequireOrganization />}><Route path="/app" element={<AppShell />}>{appRoutes.map(([path, title]) => <Route key={path} path={path.slice(5)} element={<PlaceholderPage title={title} />} />)}<Route index element={<Navigate to="conversations" replace />} /></Route></Route></Route>
  <Route path="/" element={<Navigate to="/app/conversations" replace />} /><Route path="*" element={<PlaceholderPage title="Página não encontrada" />} />
</Routes></SessionProvider></BrowserRouter>; }
