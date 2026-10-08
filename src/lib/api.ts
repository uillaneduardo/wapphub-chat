export type ApiErrorKind = 'unauthorized' | 'forbidden' | 'conflict' | 'validation' | 'rate_limit' | 'server' | 'http' | 'network';
export class ApiError extends Error {
  constructor(public status: number, public kind: ApiErrorKind, message: string, public details?: unknown) { super(message); this.name = 'ApiError'; }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const CSRF_COOKIE = 'csrf_token';
function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split('; ').find((part) => part.startsWith(`${CSRF_COOKIE}=`))?.split('=').slice(1).join('=');
}
function errorKind(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized'; if (status === 403) return 'forbidden'; if (status === 409) return 'conflict';
  if (status === 422) return 'validation'; if (status === 429) return 'rate_limit'; if (status >= 500) return 'server'; return 'http';
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const method = (init.method ?? 'GET').toUpperCase();
  const token = csrfToken();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && token) headers.set('X-CSRF-Token', decodeURIComponent(token));
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, { ...init, method, headers, credentials: 'include' });
  } catch (error) { throw new ApiError(0, 'network', 'Não foi possível conectar à API.', error); }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined);
    const message = typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string' ? payload.message : `Falha na requisição (${response.status}).`;
    throw new ApiError(response.status, errorKind(response.status), message, payload);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
