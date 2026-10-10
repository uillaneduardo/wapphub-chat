import { apiRequest } from './api';
import type { Contact, Conversation, CreateConversationResult, CursorPage, DemoContact, InternalNote, InternalTextMessage, Provider, SendMessageRequest, Tag, TeamMember, TransferRequest } from '../types/chat';

export type ConversationScope = 'mine' | 'unassigned' | 'all';
export interface ConversationQuery { scope: ConversationScope; archived?: boolean; tagId?: string; contactId?: string; cursor?: string; limit?: number }
function queryString(values: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
  const query = params.toString(); return query ? `?${query}` : '';
}
const idPath = (id: string) => encodeURIComponent(id);

export const chatApi = {
  listProviders: (signal?: AbortSignal) => apiRequest<{ items: Provider[] }>('/providers', { signal }),
  setDemoProvider: (enabled: boolean) => apiRequest<{ enabled: boolean }>('/providers/demo', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  listDemoContacts: (signal?: AbortSignal) => apiRequest<{ enabled: boolean; items: DemoContact[] }>('/providers/demo/contacts', { signal }),
  sendDemoMessage: (contactId: string, externalMessageId: string, body: string) => apiRequest<InternalTextMessage>('/providers/demo/messages', { method: 'POST', body: JSON.stringify({ contactId, externalMessageId, body }) }),
  listConversations: (query: ConversationQuery, signal?: AbortSignal) => apiRequest<CursorPage<Conversation>>(`/conversations${queryString({ scope: query.scope, archived: query.archived, tagId: query.tagId, contactId: query.contactId, cursor: query.cursor, limit: query.limit ?? 50 })}`, { signal }),
  getConversation: (id: string, signal?: AbortSignal) => apiRequest<Conversation>(`/conversations/${idPath(id)}`, { signal }),
  listContacts: (query: { q?: string; cursor?: string; limit?: number } = {}, signal?: AbortSignal) => apiRequest<CursorPage<Contact>>(`/contacts${queryString({ q: query.q, cursor: query.cursor, limit: query.limit ?? 50 })}`, { signal }),
  createContact: (data: { name: string; primaryIdentifier: string }) => apiRequest<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (id: string, data: { name?: string; primaryIdentifier?: string }) => apiRequest<Contact>(`/contacts/${idPath(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createConversation: (contactId: string) => apiRequest<CreateConversationResult>('/conversations', { method: 'POST', body: JSON.stringify({ contactId, reuseExisting: true }) }),
  getContact: (id: string, signal?: AbortSignal) => apiRequest<Contact>(`/contacts/${idPath(id)}`, { signal }),
  listMessages: (conversationId: string, before?: string, signal?: AbortSignal) => apiRequest<CursorPage<InternalTextMessage>>(`/conversations/${idPath(conversationId)}/messages${queryString({ limit: 50, before })}`, { signal }),
  sendMessage: (conversationId: string, body: SendMessageRequest) => apiRequest<InternalTextMessage>(`/conversations/${idPath(conversationId)}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  listTags: (cursor?: string, signal?: AbortSignal) => apiRequest<CursorPage<Tag>>(`/tags${queryString({ limit: 100, cursor })}`, { signal }),
  listTeamMembers: (cursor?: string) => apiRequest<CursorPage<TeamMember>>(`/team/members${queryString({ limit: 100, cursor })}`),
  listNotes: (conversationId: string, cursor?: string, signal?: AbortSignal) => apiRequest<CursorPage<InternalNote>>(`/conversations/${idPath(conversationId)}/notes${queryString({ limit: 50, cursor })}`, { signal }),
  createNote: (conversationId: string, body: string) => apiRequest<InternalNote>(`/conversations/${idPath(conversationId)}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
  archive: (conversationId: string, archived: boolean) => apiRequest<Conversation>(`/conversations/${idPath(conversationId)}/${archived ? 'archive' : 'unarchive'}`, { method: 'POST' }),
  assign: (conversationId: string, userId: string) => apiRequest<Conversation>(`/conversations/${idPath(conversationId)}/assign`, { method: 'POST', body: JSON.stringify({ userId }) }),
  transfer: (conversationId: string, body: TransferRequest) => apiRequest<Conversation>(`/conversations/${idPath(conversationId)}/transfer`, { method: 'POST', body: JSON.stringify(body) }),
  addTag: (conversationId: string, tagId: string) => apiRequest<{ tagId: string }>(`/conversations/${idPath(conversationId)}/tags/${idPath(tagId)}`, { method: 'POST' }),
  removeTag: (conversationId: string, tagId: string) => apiRequest<{ tagId: string }>(`/conversations/${idPath(conversationId)}/tags/${idPath(tagId)}`, { method: 'DELETE' }),
};
