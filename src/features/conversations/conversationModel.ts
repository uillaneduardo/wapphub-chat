import type { Conversation, InternalTextMessage } from '../../types/chat';
import type { ConversationScope } from '../../lib/chatApi';

export interface InboxFilter { scope: ConversationScope; archived: boolean; tagId?: string }
export function matchesInboxFilter(conversation: Conversation, filter: InboxFilter, currentUserId: string): boolean {
  if ((conversation.status === 'ARCHIVED') !== filter.archived) return false;
  if (filter.scope === 'mine' && conversation.assignedUserId !== currentUserId) return false;
  if (filter.scope === 'unassigned' && conversation.assignedUserId !== null) return false;
  if (filter.tagId && !conversation.tagIds.includes(filter.tagId)) return false;
  return true;
}
export function upsertInboxConversation(items: Conversation[], conversation: Conversation, filter: InboxFilter, currentUserId: string): Conversation[] {
  const filtered = items.filter((item) => item.id !== conversation.id);
  if (!matchesInboxFilter(conversation, filter, currentUserId)) return filtered;
  return [conversation, ...filtered].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt) || b.id.localeCompare(a.id));
}
export function mergeMessages(existing: InternalTextMessage[], incoming: InternalTextMessage[]): InternalTextMessage[] {
  const merged = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) {
    const optimistic = message.clientMessageId ? [...merged.values()].find((candidate) => candidate.clientMessageId === message.clientMessageId) : undefined;
    if (optimistic) merged.delete(optimistic.id);
    merged.set(message.id, message);
  }
  return [...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export function createClientMessageId(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function createOptimisticMessage(conversationId: string, senderUserId: string, body: string, clientMessageId = createClientMessageId()): InternalTextMessage {
  const now = new Date().toISOString();
  return { id: `optimistic:${clientMessageId}`, conversationId, senderUserId, senderContactId: null, clientMessageId, direction: 'INTERNAL', type: 'TEXT', body, status: 'PENDING', createdAt: now, updatedAt: now };
}
