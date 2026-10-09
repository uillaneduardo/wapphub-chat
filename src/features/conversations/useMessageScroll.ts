import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { InternalTextMessage } from '../../types/chat';

const BOTTOM_THRESHOLD = 80;
export function messageScrollKey(message: InternalTextMessage) { return message.clientMessageId ?? message.id; }
interface Position { top: number; atBottom: boolean; anchor?: { key: string; offset: number } }

/** A mounted instance belongs to exactly one conversation/organization. */
export function useMessageScroll(messages: InternalTextMessage[], ready: boolean) {
  const historyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const following = useRef(true);
  const position = useRef<Position>({ top: 0, atBottom: true });
  const previousKeys = useRef<string[]>([]);
  const unreadKeys = useRef(new Set<string>());
  const prepending = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const capture = useCallback(() => {
    const node = historyRef.current;
    if (!node) return;
    const viewport = node.getBoundingClientRect();
    const anchor = [...node.querySelectorAll<HTMLElement>('[data-message-key]')].find((item) => item.getBoundingClientRect().bottom > viewport.top);
    following.current = node.scrollHeight - node.clientHeight - node.scrollTop <= BOTTOM_THRESHOLD;
    position.current = { top: node.scrollTop, atBottom: node.scrollHeight - node.clientHeight - node.scrollTop <= 1, ...(anchor ? { anchor: { key: anchor.dataset.messageKey!, offset: anchor.getBoundingClientRect().top - viewport.top } } : {}) };
  }, []);
  const restore = useCallback(() => {
    const node = historyRef.current;
    if (!node) return;
    node.scrollTop = position.current.top;
    const saved = position.current.anchor;
    const anchor = saved && [...node.querySelectorAll<HTMLElement>('[data-message-key]')].find((item) => item.dataset.messageKey === saved.key);
    if (anchor && saved) node.scrollTop += anchor.getBoundingClientRect().top - node.getBoundingClientRect().top - saved.offset;
  }, []);
  const clearUnread = useCallback(() => { unreadKeys.current.clear(); setUnreadCount(0); }, []);
  const scrollToBottom = useCallback(() => {
    const node = historyRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    following.current = true; clearUnread(); capture();
  }, [capture, clearUnread]);
  const onScroll = useCallback(() => {
    const node = historyRef.current;
    if (!node) return;
    following.current = node.scrollHeight - node.clientHeight - node.scrollTop <= BOTTOM_THRESHOLD;
    if (following.current) clearUnread();
    capture();
  }, [capture, clearUnread]);
  const preparePrepend = useCallback(() => { capture(); prepending.current = true; }, [capture]);

  useLayoutEffect(() => {
    if (!ready || !historyRef.current) return;
    const keys = messages.map(messageScrollKey);
    const previous = previousKeys.current;
    const lastIndex = previous.length ? keys.indexOf(previous[previous.length - 1]) : -1;
    const known = new Set(previous);
    const appended = lastIndex >= 0 || previous.length === 0 ? keys.slice(lastIndex + 1).filter((key) => !known.has(key)) : [];
    if (!initialized.current) {
      initialized.current = true; scrollToBottom();
    } else if (!prepending.current && (position.current.atBottom || (following.current && appended.length > 0))) {
      scrollToBottom();
    } else {
      restore();
      // Older pages and optimistic reconciliation are not new messages below the reader.
      appended.forEach((key) => unreadKeys.current.add(key));
      unreadKeys.current = new Set([...unreadKeys.current].filter((key) => keys.includes(key)));
      setUnreadCount(unreadKeys.current.size);
      capture();
    }
    prepending.current = false;
    previousKeys.current = keys;
  }, [messages, ready, capture, restore, scrollToBottom]);

  useLayoutEffect(() => {
    if (!ready || !historyRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (!initialized.current) return;
      if (position.current.atBottom) scrollToBottom(); else { restore(); capture(); }
    });
    observer.observe(historyRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [ready, capture, restore, scrollToBottom]);

  return { historyRef, contentRef, onScroll, preparePrepend, scrollToBottom, unreadCount };
}
