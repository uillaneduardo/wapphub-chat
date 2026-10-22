import { useCallback, useRef, useState } from 'react';
import type { SetStateAction } from 'react';

const drafts = new Map<string, string>();
const MAX_DRAFTS = 30;
let activeScope: string | null = null;

export function composerScope(userId: string, organizationId: string): string {
  return JSON.stringify([userId, organizationId]);
}
export function composerDraftKey(userId: string, organizationId: string, conversationId: string): string {
  return JSON.stringify([userId, organizationId, conversationId]);
}
/** In-memory only. Cross-tenant/account drafts must never be retained. */
export function activateComposerScope(userId: string | null, organizationId: string | null): void {
  const next = userId && organizationId ? composerScope(userId, organizationId) : null;
  if (activeScope !== next) { drafts.clear(); activeScope = next; }
}
export function clearComposerDrafts(): void { drafts.clear(); activeScope = null; }
export function readComposerDraft(key: string): string { return drafts.get(key) ?? ''; }
export function saveComposerDraft(key: string, value: string): void {
  if (!value) { drafts.delete(key); return; }
  // Avoid stale older entries growing indefinitely.
  drafts.delete(key);
  drafts.set(key, value);
  if (drafts.size > MAX_DRAFTS) drafts.delete(drafts.keys().next().value!);
}
export function useConversationDraft(key: string): [string, (value: SetStateAction<string>) => void] {
  const [draft, setDraftState] = useState(() => readComposerDraft(key));
  const latest = useRef(draft);
  const setDraft = useCallback((update: SetStateAction<string>) => {
    const value = typeof update === 'function' ? update(latest.current) : update;
    latest.current = value;
    saveComposerDraft(key, value);
    setDraftState(value);
  }, [key]);
  return [draft, setDraft];
}
