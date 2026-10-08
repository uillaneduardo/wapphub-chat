import { apiRequest } from './api';
import { setCsrfToken } from './api';
import type { BootstrapResponse, LoginResponse, MeResponse, OrganizationContext, OrganizationsResponse, Session } from '../types/auth';

export const sessionApi = {
  async login(email: string, password: string): Promise<Session> {
    const response = await apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setCsrfToken(response.csrfToken);
    return sessionApi.current();
  },
  async logout(): Promise<void> { try { await apiRequest<void>('/auth/logout', { method: 'POST' }); } finally { setCsrfToken(null); } },
  async current(): Promise<Session> {
    const [me, { organizations }] = await Promise.all([
      apiRequest<MeResponse>('/me'),
      apiRequest<OrganizationsResponse>('/me/organizations'),
    ]);
    setCsrfToken(me.csrfToken);
    const selected = me.currentOrganizationId ? organizations.find((organization) => organization.id === me.currentOrganizationId) ?? null : null;
    if (!selected) return { user: me.user, organizations, currentOrganizationId: null, organization: null, membership: null, permissions: [] };
    const bootstrap: BootstrapResponse = await apiRequest('/app/bootstrap');
    return { user: bootstrap.user, organizations, currentOrganizationId: selected.id, organization: bootstrap.organization, membership: bootstrap.membership, permissions: bootstrap.permissions };
  },
  selectOrganization: (organizationId: string) => apiRequest<OrganizationContext>('/session/organization', { method: 'POST', body: JSON.stringify({ organizationId }) }),
};
