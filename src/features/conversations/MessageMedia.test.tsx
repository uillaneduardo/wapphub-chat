import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MessageMedia } from './MessageMedia';
import { MediaComposer } from './MediaComposer';
import { chatApi } from '../../lib/chatApi';
import type { InternalTextMessage } from '../../types/chat';
const message: InternalTextMessage = { id: 'message-1', conversationId: 'conversation-1', senderUserId: null, senderContactId: 'contact-1', clientMessageId: null, direction: 'INBOUND', type: 'IMAGE', body: null, status: 'SENT', createdAt: '2026-10-11T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z', media: { mediaId: 'media-1', type: 'IMAGE', mimeType: 'image/png', fileName: 'synthetic.png', size: 1, state: 'PENDING' } };
describe('B3 media demand and lifecycle', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('downloads only on explicit demand and revokes bytes on unmount', async () => {
    const create = vi.fn(() => 'blob:synthetic'), revoke = vi.fn(); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const read = vi.spyOn(chatApi, 'messageMedia').mockResolvedValue(new Blob(['synthetic'], { type: 'image/png' }));
    const view = render(<MessageMedia message={message} />); expect(read).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' })); expect(await screen.findByRole('img', { name: 'Imagem recebida' })).toHaveAttribute('src', 'blob:synthetic'); expect(read).toHaveBeenCalledWith('conversation-1', 'message-1', expect.any(AbortSignal)); view.unmount(); expect(revoke).toHaveBeenCalledWith('blob:synthetic');
  });
  it('aborts an old tenant response and never displays its late bytes', async () => {
    let finish!: (value: Blob) => void, signal!: AbortSignal;
    vi.spyOn(chatApi, 'messageMedia').mockImplementation((_conversationId, _messageId, current) => { signal = current!; return new Promise(resolve => { finish = resolve; }); });
    const create = vi.fn(); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    const view = render(<MessageMedia message={message} />); fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' })); view.unmount(); expect(signal.aborted).toBe(true); await act(async () => finish(new Blob(['old tenant']))); expect(create).not.toHaveBeenCalled();
  });
  it('reports expired media without a sensitive URL or automatic remote recovery', async () => {
    vi.spyOn(chatApi, 'messageMedia').mockRejectedValue(new Error('unavailable')); render(<MessageMedia message={message} />); fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' })); expect(await screen.findByRole('status')).toHaveTextContent('indisponível ou expirada'); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('records only under explicit action and handles unsupported recorders without requesting a microphone', async () => {
    vi.stubGlobal('MediaRecorder', undefined); const changed = vi.fn(); render(<MediaComposer attachment={null} onChange={changed} disabled={false} />); expect(changed).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Gravar voz' })); expect(await screen.findByRole('alert')).toHaveTextContent('indisponível neste navegador'); expect(changed).not.toHaveBeenCalled();
  });
});
