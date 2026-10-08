import { apiRequest } from './api';
import type { Contact, Conversation, CursorPage, InternalNote, InternalTextMessage, SendMessageRequest, Tag, TeamMember, TransferRequest } from '../types/chat';

export type ConversationScope = 'mine' | 'unassigned' | 'all';
export interface ConversationQuery { scope: ConversationScope; archived?: boolean; tagId?: string; cursor?: string; limit?: number }
function queryString(values: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
  const query = params.toString(); return query ? `?${query}` : '';
}
const idPath = (id: string) => encodeURIComponent(id);

export const chatApi = {
  listConversations: (query: ConversationQuery) => apiRequest<CursorPage<Conversation>>(`/conversations${queryString({ scope: query.scope, archived: query.archived, tagId: query.tagId, cursor: query.cursor, limit: query.limit ?? 50 })}`),
  getConversation: (id: string) => apiRequest<Conversation>(`/conversations/${idPath(id)}`),
  getContact: (id: string) => apiRequest<Contact>(`/contacts/${idPath(id)}`),
  listMessages: (conversationId: string, before?: string) => apiRequest<CursorPage<InternalTextMessage>>(`/conversations/${idPath(conversationId)}/messages${queryString({ limit: 50, before })}`),
  sendMessage: (conversationId: string, body: SendMessageRequest) => apiRequest<InternalTextMessage>(`/conversations/${idPath(conversationId)}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  listTags: (cursor?: string) => apiRequest<CursorPage<Tag>>(`/tags${queryString({ limit: 100, cursor })}`),
  listTeamMembers: (cursor?: string) => apiRequest<CursorPage<TeamMember>>(`/team/members${queryString({ limit: 100, cursor })}`),
  listNotes: (conversationId: string, cursor?: string) => apiRequest<CursorPage<InternalNote>>(`/conversations/${idPath(conversationId)}/notes${queryString({ limit: 50, cursor })}`),
  createNote: (conversationId: string, body: string) => apiRequest<InternalNote>(`/conversations/${idPath(conversationId)}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
  archive: (conversationId: string, archived: boolean) => apiRequest<Conversation>(`/conversations/${idPath(conversationId)}/${archived ? 'archive' : 'unarchive'}`, { method: 'POST' }),
  assign: (conversationId: string, userId: string) => apiRequest<Conversation>(`/conversations/${idPath(conversationId)}/assign`, { method: 'POST', body: JSON.stringify({ userId }) }),
  transfer: (conversationId: string, body: TransferRequest) => apiRequest<Conversation>(`/conversations/${idPath(conversationId)}/transfer`, { method: 'POST', body: JSON.stringify(body) }),
  addTag: (conversationId: string, tagId: string) => apiRequest<{ tagId: string }>(`/conversations/${idPath(conversationId)}/tags/${idPath(tagId)}`, { method: 'POST' }),
  removeTag: (conversationId: string, tagId: string) => apiRequest<{ tagId: string }>(`/conversations/${idPath(conversationId)}/tags/${idPath(tagId)}`, { method: 'DELETE' }),
};
