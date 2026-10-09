export interface Resource { code: string; module: string; name: string; description: string; availability: 'AVAILABLE' | 'PLANNED' | 'RESEARCH' | 'UNSUPPORTED' | 'DEPRECATED'; permissions: string[]; dependencies: string[]; base: boolean; entitlement: string | null; navigation: boolean }
export interface Permission { code: string; name: string; module: string; resourceCode: string; editable: boolean; sensitive: boolean }
export interface TeamMember { id: string; userId: string; name: string; email: string; role: string; status: string; userStatus: string }
export interface MemberPermissions { member: TeamMember; version: number; inherited: string[]; grants: string[]; revocations: string[]; effective: string[] }
