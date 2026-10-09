import { describe, expect, it } from 'vitest';
import { createOptimisticMessage, matchesInboxFilter, mergeMessages, upsertInboxConversation } from './conversationModel';
import type { Conversation, InternalTextMessage } from '../../types/chat';

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({ id: 'c1', contactId: 'contact-1', contactName: null, lastMessagePreview: null, provider: null, tagIds: ['tag-1'], status: 'OPEN', assignedUserId: 'u1', archivedAt: null, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z', visibility: 'FULL', ...overrides });
const message = (overrides: Partial<InternalTextMessage> = {}): InternalTextMessage => ({ id: 'm1', conversationId: 'c1', senderUserId: 'u1', senderContactId: null, clientMessageId: 'client-1', direction: 'INTERNAL', type: 'TEXT', body: 'Oi', status: 'SENT', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', ...overrides });

describe('conversation state helpers', () => {
  it('matches ownership, unassigned, archive, and tag filters', () => {
    expect(matchesInboxFilter(conversation(), { scope: 'mine', archived: false, tagId: 'tag-1' }, 'u1')).toBe(true);
    expect(matchesInboxFilter(conversation(), { scope: 'mine', archived: false }, 'u2')).toBe(false);
    expect(matchesInboxFilter(conversation({ assignedUserId: null }), { scope: 'unassigned', archived: false }, 'u1')).toBe(true);
    expect(matchesInboxFilter(conversation({ status: 'ARCHIVED' }), { scope: 'all', archived: false }, 'u1')).toBe(false);
  });
  it('upserts only matching records and merges server messages over optimistic messages by clientMessageId', () => {
    expect(upsertInboxConversation([], conversation(), { scope: 'mine', archived: false }, 'u1')).toHaveLength(1);
    expect(upsertInboxConversation([conversation()], conversation({ status: 'ARCHIVED' }), { scope: 'mine', archived: false }, 'u1')).toHaveLength(0);
    const optimistic = createOptimisticMessage('c1', 'u1', 'Oi', 'client-1');
    const reconciled = mergeMessages([optimistic], [message()]);
    expect(reconciled).toEqual([message()]); expect(reconciled).toHaveLength(1);
  });
});

describe('P1 stale response reconciliation', () => {
  it('keeps newer message state when an older REST reply arrives after a local update', () => {
    const base = createOptimisticMessage('conversation-1', 'user-1', 'Mesmo texto', 'stable-id');
    const latest = { ...base, id: 'saved-1', status: 'READ' as const, updatedAt: '2026-10-08T15:00:02Z' };
    const old = { ...latest, status: 'SENT' as const, updatedAt: '2026-10-08T15:00:01Z' };
    expect(mergeMessages([latest], [old])).toEqual([latest]);
    expect(mergeMessages([old], [latest])).toEqual([latest]);
  });
});
