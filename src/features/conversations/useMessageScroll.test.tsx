import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalTextMessage } from '../../types/chat';
import { mockScrollGeometry } from '../../test/messageScrollGeometry';
import { messageScrollKey, useMessageScroll } from './useMessageScroll';

const scrollMessage = (id: string, body = id): InternalTextMessage => ({ id, clientMessageId: null, conversationId: 'c', senderUserId: 'u', senderContactId: null, direction: 'INBOUND', type: 'TEXT', status: 'SENT', body, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' });
const initial = Array.from({ length: 6 }, (_, i) => scrollMessage(`m${i}`));

function Harness({ messages, ready = true }: { messages: InternalTextMessage[]; ready?: boolean }) {
  const scroll = useMessageScroll(messages, ready);
  return <><div role="region" tabIndex={0} className="message-history" ref={scroll.historyRef} onScroll={scroll.onScroll}><div ref={scroll.contentRef}>{messages.map((message) => <article key={messageScrollKey(message)} data-message-key={messageScrollKey(message)}>{message.body}</article>)}</div></div><output>{scroll.unreadCount}</output><button onClick={scroll.scrollToBottom}>Final</button><button onClick={scroll.preparePrepend}>Preparar anteriores</button></>;
}
const readAt = (top: number) => { const node = screen.getByRole('region'); node.scrollTop = top; fireEvent.scroll(node); return node; };

describe('message scroll without a browser', () => {
  beforeEach(() => mockScrollGeometry());
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('waits for initial load then starts at the end', () => {
    const view = render(<Harness messages={[]} ready={false} />); view.rerender(<Harness messages={initial} />);
    expect(screen.getByRole('region').scrollTop).toBe(400);
  });
  it('follows new messages within 80px of the end', () => {
    const view = render(<Harness messages={initial} />); const node = readAt(350);
    view.rerender(<Harness messages={[...initial, scrollMessage('new')]} />);
    expect(node.scrollTop).toBe(500); expect(screen.getByRole('status')).toHaveTextContent('0');
  });
  it('keeps reading position and accumulates new messages until returning to the end', () => {
    const view = render(<Harness messages={initial} />); const node = readAt(100);
    view.rerender(<Harness messages={[...initial, scrollMessage('new')]} />);
    expect(node.scrollTop).toBe(100); expect(screen.getByRole('status')).toHaveTextContent('1');
    view.rerender(<Harness messages={[...initial, scrollMessage('new'), scrollMessage('new2')]} />);
    expect(node.scrollTop).toBe(100); expect(screen.getByRole('status')).toHaveTextContent('2');
    fireEvent.click(screen.getByRole('button', { name: 'Final' })); expect(node.scrollTop).toBe(600); expect(screen.getByRole('status')).toHaveTextContent('0');
  });
  it('preserves the visible anchor when an existing message changes height', () => {
    const view = render(<Harness messages={initial} />); const node = readAt(150);
    view.rerender(<Harness messages={[scrollMessage('m0', 'Tall'), ...initial.slice(1)]} />);
    expect(node.scrollTop).toBe(250); expect(screen.getByRole('status')).toHaveTextContent('0');
  });
  it('does not snap a reader near the end on delivery/status updates', () => {
    const view = render(<Harness messages={initial} />); const node = readAt(350);
    view.rerender(<Harness messages={initial.map((item) => ({ ...item, status: 'READ' }))} />);
    expect(node.scrollTop).toBe(350); expect(screen.getByRole('status')).toHaveTextContent('0');
  });
  it('keeps a concurrent appended message unread while prepending an older page', () => {
    const view = render(<Harness messages={initial} />); const node = readAt(100);
    fireEvent.click(screen.getByRole('button', { name: 'Preparar anteriores' }));
    view.rerender(<Harness messages={[scrollMessage('older'), ...initial, scrollMessage('new')]} />);
    expect(node.scrollTop).toBe(200); expect(screen.getByRole('status')).toHaveTextContent('1');
  });
  it('preserves anchor on prepend and does not count older history as unread', () => {
    const view = render(<Harness messages={initial} />); const node = readAt(100);
    fireEvent.click(screen.getByRole('button', { name: 'Preparar anteriores' }));
    view.rerender(<Harness messages={[scrollMessage('older1'), scrollMessage('older2'), ...initial]} />);
    expect(node.scrollTop).toBe(300); expect(screen.getByRole('status')).toHaveTextContent('0');
  });
  it('does not count optimistic reconciliation or delivery updates twice', () => {
    const optimistic = { ...scrollMessage('optimistic:c'), clientMessageId: 'c', status: 'PENDING' as const };
    const view = render(<Harness messages={initial} />); const node = readAt(100);
    view.rerender(<Harness messages={[...initial, optimistic]} />);
    view.rerender(<Harness messages={[...initial, { ...optimistic, id: 'saved', status: 'SENT' }]} />);
    expect(node.scrollTop).toBe(100); expect(screen.getByRole('status')).toHaveTextContent('1');
  });
  it('clears the indicator when scrolling back near the end', () => {
    const view = render(<Harness messages={initial} />); readAt(100);
    view.rerender(<Harness messages={[...initial, scrollMessage('new')]} />);
    readAt(490); expect(screen.getByRole('status')).toHaveTextContent('0');
  });
  it('resets scroll and unread state for a new scope', () => {
    const view = render(<Harness key="org1:c1" messages={initial} />); readAt(100);
    view.rerender(<Harness key="org1:c1" messages={[...initial, scrollMessage('new')]} />);
    view.rerender(<Harness key="org2:c2" messages={initial} />);
    expect(screen.getByRole('region').scrollTop).toBe(400); expect(screen.getByRole('status')).toHaveTextContent('0');
  });
  it('maintains position through resize and disconnects the observer', () => {
    const geometry = mockScrollGeometry(); let notify!: () => void; const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { notify = callback; } observe = vi.fn(); disconnect = disconnect; });
    const view = render(<Harness messages={initial} />);
    geometry.resize(100); act(() => notify()); expect(screen.getByRole('region').scrollTop).toBe(500);
    const node = readAt(450); geometry.resize(50); act(() => notify());
    view.rerender(<Harness messages={[...initial, scrollMessage('new-resize')]} />);
    expect(node.scrollTop).toBe(450); expect(screen.getByRole('status')).toHaveTextContent('1');
    readAt(100); geometry.resize(150); act(() => notify()); expect(node.scrollTop).toBe(100);
    view.unmount(); expect(disconnect).toHaveBeenCalled();
  });
});
