import { diagnose } from '../../lib/diagnostics';
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
const confirmedRank = { PENDING: 0, FAILED: 0, SENT: 1, DELIVERED: 2, READ: 3 };
function preferredMessage(previous: InternalTextMessage, incoming: InternalTextMessage): InternalTextMessage {
  // Local clocks and retries cannot overrule persisted receipt evidence.
  if (incoming.id.startsWith('optimistic:') && !previous.id.startsWith('optimistic:')) return previous;
  if (previous.id.startsWith('optimistic:') && !incoming.id.startsWith('optimistic:')) return incoming;
  const oldRank = confirmedRank[previous.status], newRank = confirmedRank[incoming.status];
  if (oldRank !== newRank) return oldRank > newRank ? previous : incoming;
  return previous.updatedAt > incoming.updatedAt ? previous : incoming;
}
export function mergeMessages(existing: InternalTextMessage[], incoming: InternalTextMessage[]): InternalTextMessage[] {
  const merged = new Map<string, InternalTextMessage>();
  const aliases = new Map<string, string>();
  for (const message of [...existing, ...incoming]) {
    const alias = message.clientMessageId ? JSON.stringify([message.conversationId, message.senderUserId, message.clientMessageId]) : null;
    const previousId = alias ? aliases.get(alias) : undefined;
    const previous = merged.get(message.id) ?? (previousId ? merged.get(previousId) : undefined);
    const selected = previous ? preferredMessage(previous, message) : message;
    if (previous && previous.status !== selected.status) diagnose({ kind: 'message.status', from: previous.status, to: selected.status });
    if (previous) merged.delete(previous.id);
    merged.set(selected.id, selected);
    if (alias) aliases.set(alias, selected.id);
  }
  return [...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export function createClientMessageId(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function createOptimisticMessage(conversationId: string, senderUserId: string, body: string, clientMessageId = createClientMessageId(), senderName?: string): InternalTextMessage {
  const now = new Date().toISOString();
  return { id: `optimistic:${clientMessageId}`, conversationId, senderUserId, senderName: senderName ?? null, senderContactId: null, clientMessageId, direction: 'INTERNAL', type: 'TEXT', body, status: 'PENDING', createdAt: now, updatedAt: now };
}
