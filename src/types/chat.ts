export interface CursorPage<T> { items: T[]; nextCursor: string | null }
export interface Contact { id: string; name: string; primaryIdentifier: string; createdAt: string; updatedAt: string }
export type ConversationStatus = 'OPEN' | 'PENDING' | 'ARCHIVED';
export type HistoryVisibility = 'FULL' | 'LIMITED' | 'NONE';
export interface Conversation { id: string; contactId: string; tagIds: string[]; status: ConversationStatus; assignedUserId: string | null; archivedAt: string | null; createdAt: string; updatedAt: string; lastMessageAt: string; visibility: HistoryVisibility }
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export interface InternalTextMessage { id: string; conversationId: string; senderUserId: string | null; clientMessageId: string | null; direction: 'INTERNAL'; type: 'TEXT'; body: string | null; status: MessageStatus; createdAt: string; updatedAt: string }
export interface Tag { id: string; name: string }
export interface InternalNote { id: string; authorUserId: string; body: string; createdAt: string }
export interface SendMessageRequest { body: string; clientMessageId: string }
export interface TransferRequest { userId: string; visibility: HistoryVisibility; lastN?: number; note?: string }

export type ChatEventType = 'conversation.created' | 'conversation.updated' | 'conversation.archived' | 'conversation.assigned' | 'conversation.transferred' | 'message.created' | 'message.updated' | 'note.created' | 'tag.created' | 'tag.updated' | 'tag.deleted' | 'conversation.tag.added' | 'conversation.tag.removed';
export interface ChatEvent { version: 1; eventId: string; organizationId: string; type: ChatEventType; entityId: string; occurredAt: string; payload: { resourceId: string; conversationId?: string } }
export interface SyncCheckpoint { version: 1; type: 'sync.checkpoint'; lastEventId: string; hasMore: boolean }
export interface RealtimeEventsPage { events: ChatEvent[]; lastEventId: string; hasMore: boolean }
