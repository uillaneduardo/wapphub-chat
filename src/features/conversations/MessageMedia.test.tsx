import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MessageMedia } from './MessageMedia';
import { MediaComposer } from './MediaComposer';
import { chatApi } from '../../lib/chatApi';
import { ApiError } from '../../lib/api';
import type { InternalTextMessage } from '../../types/chat';
const message: InternalTextMessage = { id: 'message-1', conversationId: 'conversation-1', senderUserId: null, senderContactId: 'contact-1', clientMessageId: null, direction: 'INBOUND', type: 'IMAGE', body: null, status: 'SENT', createdAt: '2026-10-11T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z', media: { mediaId: 'media-1', type: 'IMAGE', mimeType: 'image/png', fileName: 'synthetic.png', size: 1, state: 'PENDING' } };
describe('B3 media demand and lifecycle', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it.each([
    ['IMAGE', 'Imagem'],
    ['AUDIO', 'Áudio'],
    ['VOICE', 'Mensagem de voz'],
    ['VIDEO', 'Vídeo'],
  ] as const)('presents %s with a consistent label, file name and accessible download action', async (type, label) => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:visual') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(chatApi, 'messageMedia').mockResolvedValue(new Blob(['visual']));
    vi.spyOn(chatApi, 'messageMediaSource').mockResolvedValue('/api/v1/visual-media');
    render(<MessageMedia message={{ ...message, type, media: { ...message.media!, type } }} />);
    expect(screen.getByRole('group', { name: label === 'Áudio' ? 'Áudio da mensagem' : label === 'Imagem' ? 'Imagem da mensagem' : label === 'Vídeo' ? 'Vídeo da mensagem' : 'Mensagem de voz' })).toBeInTheDocument();
    expect(screen.queryByText('synthetic.png')).not.toBeInTheDocument();
    expect(screen.queryByText(label)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' }));
    expect(await screen.findByRole('link', { name: 'Baixar arquivo' })).toHaveAttribute('download', 'synthetic.png');
    if (type === 'VIDEO') expect(screen.getByRole('button', { name: 'Ampliar vídeo' })).toBeInTheDocument();
    if (type === 'IMAGE') expect(screen.getByRole('button', { name: 'Ampliar imagem' })).toBeInTheDocument();
  });
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
    vi.spyOn(chatApi, 'messageMedia').mockRejectedValue(new ApiError(410, 'http', 'PRIVATE', 'MEDIA_EXPIRED')); render(<MessageMedia message={message} />); fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' })); expect(await screen.findByRole('status')).toHaveTextContent('expirou'); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('records only under explicit action and handles unsupported recorders without requesting a microphone', async () => {
    vi.stubGlobal('MediaRecorder', undefined); const changed = vi.fn(); render(<MediaComposer attachment={null} onChange={changed} disabled={false} />); expect(changed).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Gravar voz' })); expect(await screen.findByRole('alert')).toHaveTextContent('indisponível neste navegador'); expect(changed).not.toHaveBeenCalled();
  });
  it.each(['AUDIO', 'VOICE', 'VIDEO'] as const)('opens %s with authenticated native controls only on demand and clears the source on unmount', async type => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}), stop = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const url = '/api/v1/conversations/conversation-1/messages/message-1/media';
    const read = vi.spyOn(chatApi, 'messageMediaSource').mockResolvedValue(url), blob = vi.spyOn(chatApi, 'messageMedia');
    const view = render(<MessageMedia message={{ ...message, type, media: { ...message.media!, type } }} />);
    expect(read).not.toHaveBeenCalled(); expect(view.container.querySelector('audio,video')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' }));
    const element = await screen.findByLabelText(type === 'VIDEO' ? 'Vídeo da mensagem' : type === 'VOICE' ? 'Mensagem de voz' : 'Áudio da mensagem');
    expect(element).toHaveAttribute('src', url); expect(element).toHaveAttribute('crossorigin', 'use-credentials'); if (type === 'VIDEO') expect(element).toHaveAttribute('controls'); else { expect(element).not.toHaveAttribute('controls'); expect(screen.getByRole('slider', { name: 'Posição do áudio' })).toBeDisabled(); } expect(element).not.toHaveAttribute('autoplay'); expect(blob).not.toHaveBeenCalled();
    if (type !== 'VIDEO') { fireEvent.click(screen.getByRole('button', { name: /Velocidade: 1 vezes/ })); expect((element as HTMLMediaElement).playbackRate).toBe(1.5); }
    fireEvent.error(element); expect(await screen.findByRole('status')).toHaveTextContent('formato ou codec'); expect(screen.getByRole('link', { name: 'Baixar arquivo' })).toHaveAttribute('href', url);
    view.unmount(); expect(pause).toHaveBeenCalled(); expect(stop).toHaveBeenCalled(); expect(element).not.toHaveAttribute('src');
  });
  it.each([[401, 'sessão expirou'], [403, 'permissão'], [404, 'não está disponível'], [409, 'integridade'], [415, 'não é suportado'], [429, 'Outra mídia'], [503, 'Tente novamente']] as const)('shows a safe error for HTTP %s', async (status, text) => {
    vi.spyOn(chatApi, 'messageMedia').mockRejectedValue(new ApiError(status, 'http', 'PRIVATE_SIGNED_URL'));
    render(<MessageMedia message={message} />); fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' })); const error = await screen.findByRole('status'); expect(error).toHaveTextContent(text); expect(error).not.toHaveTextContent('PRIVATE');
  });
  it('clears an image when the same component changes conversation and aborts a late native source', async () => {
    const revoke = vi.fn(); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:old' }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    vi.spyOn(chatApi, 'messageMedia').mockResolvedValue(new Blob(['synthetic']));
    let signal!: AbortSignal, finish!: (url: string) => void;
    vi.spyOn(chatApi, 'messageMediaSource').mockImplementation((_c, _m, current) => { signal = current!; return new Promise(resolve => { finish = resolve; }); });
    const view = render(<MessageMedia message={message} />); fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' })); await screen.findByRole('img');
    view.rerender(<MessageMedia message={{ ...message, conversationId: 'other-tenant', id: 'other-message', type: 'VOICE' }} />); expect(screen.queryByRole('img')).toBeNull(); expect(revoke).toHaveBeenCalledWith('blob:old');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir mídia' })); view.unmount(); expect(signal.aborted).toBe(true); await act(async () => finish('/api/v1/private-old-source')); expect(view.container.querySelector('audio')).toBeNull();
  });
});
