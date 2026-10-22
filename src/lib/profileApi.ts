import { apiRequest } from './api';
import type { User } from '../types/auth';

export interface OrganizationIdentity {
  displayName: string | null;
  effectiveDisplayName: string;
}
export const profileApi = {
  updateAccount: (name: string) => apiRequest<User>('/me/profile', {
    method: 'PATCH', body: JSON.stringify({ name }),
  }),
  updateOrganization: (displayName: string | null) => apiRequest<OrganizationIdentity>('/me/organization-profile', {
    method: 'PATCH', body: JSON.stringify({ displayName }),
  }),
};
