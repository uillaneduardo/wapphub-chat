export interface User { id: string; name: string; email: string }
export interface Organization { id: string; name: string; accentColor?: string }
export interface Session { user: User; organizations: Organization[]; organization?: Organization | null }
export function currentOrganization(session: Session): Organization | null { return session.organization ?? (session.organizations.length === 1 ? session.organizations[0] : null); }
