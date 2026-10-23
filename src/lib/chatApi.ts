import { apiRequest, apiBlob, apiMediaSource } from './api';
import type { Contact, Conversation, CreateConversationResult, CursorPage, DemoContact, InternalNote, InternalTextMessage, Provider, SendMessageRequest, Tag, TeamMember, TransferRequest } from '../types/chat';

export type ConversationScope = 'mine' | 'unassigned' | 'all';
export interface ConversationQuery { scope: ConversationScope; archived?: boolean; tagId?: string; contactId?: string; cursor?: string; limit?: number }
function queryString(values: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
  const query = params.toString(); return query ? `?${query}` : '';
}
const idPath = (id: string) => encodeURIComponent(id);

export type WebChannel = { id: string; name: string; outboundEnabled: boolean; mediaEnabled: boolean };
export const chatApi = {
  listChannels: (signal?: AbortSignal) => apiRequest<{ items: WebChannel[] }>('/channels', { signal }),
  createExternalConversation: (data: { channelId: string; contactId?: string; phone?: string }, signal?: AbortSignal) => apiRequest<CreateConversationResult>('/conversations/external', { method: 'POST', body: JSON.stringify(data), signal }),
  uploadMedia: async (conversationId: string, file: File, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE', signal?: AbortSignal) => {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const sha256 = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
    const query = new URLSearchParams({ mediaId: crypto.randomUUID(), type, mimeType: file.type.split(';')[0], fileName: file.name, size: String(file.size), sha256 });
    return apiRequest<NonNullable<InternalTextMessage['media']>>(`/conversations/${idPath(conversationId)}/media?${query}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file, signal });
  },
  messageMedia: (conversationId: string, messageId: string, signal?: AbortSignal) => apiBlob(`/conversations/${idPath(conversationId)}/messages/${idPath(messageId)}/media`, signal),
  messageMediaSource: (conversationId: string, messageId: string, signal?: AbortSignal) => apiMediaSource(`/conversations/${idPath(conversationId)}/messages/${idPath(messageId)}/media`, signal),
  listProviders: (signal?: AbortSignal) => apiRequest<{ items: Provider[] }>('/providers', { signal }),
  setDemoProvider: (enabled: boolean) => apiRequest<{ enabled: boolean }>('/providers/demo', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  listDemoContacts: (signal?: AbortSignal) => apiRequest<{ enabled: boolean; items: DemoContact[] }>('/providers/demo/contacts', { signal }),
  sendDemoMessage: (contactId: string, externalMessageId: string, body: string) => apiRequest<InternalTextMessage>('/providers/demo/messages', { method: 'POST', body: JSON.stringify({ contactId, externalMessageId, body }) }),
  listConversations: (query: ConversationQuery, signal?: AbortSignal) => apiRequest<CursorPage<Conversation>>(`/conversations${queryString({ scope: query.scope, archived: query.archived, tagId: query.tagId, contactId: query.contactId, cursor: query.cursor, limit: query.limit ?? 50 })}`, { signal }),
  getConversation: (id: string, signal?: AbortSignal) => apiRequest<Conversation>(`/conversations/${idPath(id)}`, { signal }),
  markConversationRead: (id: string, messageId: string, signal?: AbortSignal) => apiRequest<{ conversationId: string; hasUnread: boolean }>(`/conversations/${idPath(id)}/read`, { method: 'POST', body: JSON.stringify({ messageId }), signal }),
  listContacts: (query: { q?: string; cursor?: string; limit?: number } = {}, signal?: AbortSignal) => apiRequest<CursorPage<Contact>>(`/contacts${queryString({ q: query.q, cursor: query.cursor, limit: query.limit ?? 50 })}`, { signal }),
  createContact: (data: { name: string; primaryIdentifier: string }) => apiRequest<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (id: string, data: { name?: string; primaryIdentifier?: string }) => apiRequest<Contact>(`/contacts/${idPath(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createConversation: (contactId: string) => apiRequest<CreateConversationResult>('/conversations', { method: 'POST', body: JSON.stringify({ contactId, reuseExisting: true }) }),
  getContact: (id: string, signal?: AbortSignal) => apiRequest<Contact>(`/contacts/${idPath(id)}`, { signal }),
  listMessages: (conversationId: string, before?: string, signal?: AbortSignal) => apiRequest<CursorPage<InternalTextMessage>>(`/conversations/${idPath(conversationId)}/messages${queryString({ limit: 50, before })}`, { signal }),
  getMessage: (conversationId: string, messageId: string, signal?: AbortSignal) => apiRequest<InternalTextMessage>(`/conversations/${idPath(conversationId)}/messages/${idPath(messageId)}`, { signal }),
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
