import { apiRequest } from './api';
import type { MemberPermissions, Permission, TeamMember } from '../types/resources';
export const teamApi = {
  directory: (cursor?: string, signal?: AbortSignal) => apiRequest<{ items: TeamMember[]; nextCursor: string | null }>(`/team/directory${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { signal }),
  permissions: (signal?: AbortSignal) => apiRequest<{ items: Permission[] }>('/permissions', { signal }),
  member: (id: string, signal?: AbortSignal) => apiRequest<MemberPermissions>(`/team/members/${encodeURIComponent(id)}/permissions`, { signal }),
  save: (id: string, expectedVersion: number, grants: string[], revocations: string[]) => apiRequest<MemberPermissions>(`/team/members/${encodeURIComponent(id)}/permissions`, { method: 'PUT', body: JSON.stringify({ expectedVersion, grants, revocations }) }),
  reset: (id: string, expectedVersion: number) => apiRequest<MemberPermissions>(`/team/members/${encodeURIComponent(id)}/permissions/reset`, { method: 'POST', body: JSON.stringify({ expectedVersion }) }),
};
