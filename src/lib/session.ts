import { apiRequest } from './api';
import type { Session } from '../types/auth';

// Endpoints kept in one module so they can follow the Core contract without URL drift.
export const sessionApi = {
  login: (email: string, password: string) => apiRequest<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  current: () => apiRequest<Session>('/auth/session'),
  selectOrganization: (organizationId: string) => apiRequest<Session>('/auth/organization', { method: 'POST', body: JSON.stringify({ organizationId }) }),
};
