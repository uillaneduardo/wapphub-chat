import type { Resource } from './resources';
export interface User { id: string; name: string; email: string }
export interface Organization { id: string; name: string }
export interface Membership { permissionVersion?: number; id: string; role: string; consumesSeat: boolean }
export interface Session { resources?: Resource[]; user: User; organizations: Organization[]; currentOrganizationId: string | null; organization: Organization | null; membership: Membership | null; permissions: string[] }
export interface LoginResponse { user: User; csrfToken: string }
export interface MeResponse { user: User; currentOrganizationId: string | null; csrfToken: string | null }
export interface OrganizationsResponse { organizations: Organization[] }
export interface OrganizationContext { resources?: Resource[]; organization: Organization; membership: Membership; permissions: string[] }
export interface BootstrapResponse extends OrganizationContext { user: User }
export function currentOrganization(session: Session): Organization | null { return session.organization; }
