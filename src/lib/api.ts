export type ApiErrorKind = 'unauthorized' | 'forbidden' | 'conflict' | 'validation' | 'rate_limit' | 'server' | 'http' | 'network';
export class ApiError extends Error {
  constructor(public status: number, public kind: ApiErrorKind, message: string, public code?: string, public requestId?: string, public details?: unknown) { super(message); this.name = 'ApiError'; }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const API_PREFIX = '/api/v1';
const CSRF_COOKIE = 'wapphub_csrf';
let csrfMemoryToken: string | undefined;
export function setCsrfToken(token: string | null | undefined): void { csrfMemoryToken = token || undefined; }
function csrfToken(): string | undefined {
  const cookie = typeof document === 'undefined' ? undefined : document.cookie.split('; ').find((part) => part.startsWith(`${CSRF_COOKIE}=`))?.split('=').slice(1).join('=');
  return cookie ? decodeURIComponent(cookie) : csrfMemoryToken;
}
function errorKind(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized'; if (status === 403) return 'forbidden'; if (status === 409) return 'conflict';
  if (status === 422) return 'validation'; if (status === 429) return 'rate_limit'; if (status >= 500) return 'server'; return 'http';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const method = (init.method ?? 'GET').toUpperCase();
  const token = csrfToken();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && token) headers.set('x-csrf-token', token);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`, { ...init, method, headers, credentials: 'include' });
  } catch (error) { if (init.signal?.aborted) throw error; throw new ApiError(0, 'network', 'Não foi possível conectar à API.', undefined, undefined, error); }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined);
    const errorPayload = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'object' && payload.error !== null ? payload.error : undefined;
    const code = errorPayload && 'code' in errorPayload && typeof errorPayload.code === 'string' ? errorPayload.code : undefined;
    const requestId = errorPayload && 'requestId' in errorPayload && typeof errorPayload.requestId === 'string' ? errorPayload.requestId : undefined;
    throw new ApiError(response.status, errorKind(response.status), code ?? `Falha na requisição (${response.status}).`, code, requestId, payload);
  }
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json();
  if (typeof payload === 'object' && payload !== null && 'csrfToken' in payload && typeof payload.csrfToken === 'string') setCsrfToken(payload.csrfToken);
  return payload as T;
}

// Reads are bounded, including bootstrap; commands retain their idempotent retry semantics.
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if ((init.method ?? 'GET').toUpperCase() !== 'GET') return request<T>(path, init);
  const controller = new AbortController();
  const abort = () => controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  if (init.signal?.aborted) controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15_000);
  try { return await request<T>(path, { ...init, signal: controller.signal }); }
  catch (reason) { if (timedOut) throw new ApiError(0, 'network', 'A consulta excedeu o tempo limite.'); throw reason; }
  finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
}
