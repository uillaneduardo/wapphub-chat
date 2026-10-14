import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MessageMedia } from './MessageMedia';
import { MediaTransfers } from '../../lib/mediaTransfers';
import { chatApi } from '../../lib/chatApi';
import { ApiError } from '../../lib/api';
import type { InternalTextMessage } from '../../types/chat';
const message: InternalTextMessage = { id: 'm', conversationId: 'c', senderUserId: null, senderContactId: null, clientMessageId: null, direction: 'INBOUND', type: 'IMAGE', body: null, status: 'SENT', createdAt: '2026-10-13T00:00:00Z', updatedAt: '2026-10-13T00:00:00Z', media: { mediaId: 'media', type: 'IMAGE', mimeType: 'image/png', fileName: 'image.png', size: 2, state: 'READY' } };
class Observer {
  static instances: Observer[] = []; observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn();
  constructor(public callback: IntersectionObserverCallback, public options: IntersectionObserverInit) { Observer.instances.push(this); }
  show(target: Element, visible: boolean) { this.callback([{ target, isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
}
function show(view: ReturnType<typeof render>, visible = true) { act(() => Observer.instances.at(-1)!.show(view.container.querySelector('.message-media')!, visible)); }
beforeEach(() => {
  Observer.instances = []; vi.stubGlobal('IntersectionObserver', Observer);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:visible') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}); vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('uses the history root, autoloads only visible images and reconstructs them after a full remount', async () => {
  const read = vi.spyOn(chatApi, 'messageMedia').mockResolvedValue(new Blob(['ok']));
  const view = render(<div className="message-history"><MessageMedia message={message} /></div>);
  expect(Observer.instances).toHaveLength(1); expect(Observer.instances[0]!.options.root).toBe(view.container.firstElementChild); expect(read).not.toHaveBeenCalled();
  show(view); const image = await screen.findByRole('img'); expect(read).toHaveBeenCalledTimes(1);
  view.rerender(<div className="message-history"><MessageMedia message={{ ...message, status: 'DELIVERED' }} /></div>);
  expect(screen.getByRole('img')).toBe(image); expect(read).toHaveBeenCalledTimes(1);
  view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:visible');
  const next = render(<div className="message-history"><MessageMedia message={message} /></div>); expect(read).toHaveBeenCalledTimes(1); show(next); await screen.findByRole('img'); expect(read).toHaveBeenCalledTimes(2);
});
it('serializes cold-media transfers, cancels exit and never downloads an offscreen message', async () => {
  const signals: AbortSignal[] = [];
  const read = vi.spyOn(chatApi, 'messageMedia').mockImplementation((_c, _m, signal) => new Promise((_resolve, reject) => { signals.push(signal!); signal!.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError'))); }));
  const pool = new MediaTransfers(); const view = render(<div className="message-history">{[1,2,3,4].map(id => <MessageMedia key={id} transfers={pool} message={{ ...message, id: String(id), media: { ...message.media!, mediaId: String(id) } }} />)}</div>);
  const nodes = view.container.querySelectorAll('.message-media');
  act(() => { for (const node of [...nodes].slice(0,3)) Observer.instances[0]!.show(node, true); }); expect(read).toHaveBeenCalledTimes(1);
  act(() => Observer.instances[0]!.show(nodes[0]!, false)); await waitFor(() => expect(read).toHaveBeenCalledTimes(2)); expect(signals[0]!.aborted).toBe(true); expect(read.mock.calls.map(call => call[1])).toEqual(['1','2']);
  view.unmount(); pool.dispose();
});
it('cancels a tenant response and does not create a URL for late private bytes', async () => {
  let finish!: (bytes: Blob) => void, signal!: AbortSignal;
  vi.spyOn(chatApi, 'messageMedia').mockImplementation((_c, _m, current) => { signal = current!; return new Promise(resolve => { finish = resolve; }); });
  const view = render(<div className="message-history"><MessageMedia message={message} /></div>); show(view);
  view.rerender(<div className="message-history"><MessageMedia message={{ ...message, conversationId: 'other-tenant' }} /></div>); expect(signal.aborted).toBe(true);
  await act(async () => finish(new Blob(['old private bytes']))); expect(URL.createObjectURL).not.toHaveBeenCalled(); expect(screen.queryByRole('img')).toBeNull();
});
it('shows a safe error and retries only after an explicit action', async () => {
  const read = vi.spyOn(chatApi, 'messageMedia').mockRejectedValueOnce(new ApiError(403, 'forbidden', 'SECRET')).mockResolvedValue(new Blob(['ok']));
  const view = render(<div className="message-history"><MessageMedia message={message} /></div>); show(view); expect(await screen.findByRole('status')).toHaveTextContent('permissão');
  show(view); expect(read).toHaveBeenCalledTimes(1); fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); await screen.findByRole('img'); expect(read).toHaveBeenCalledTimes(2);
});
it('opens an image lightbox with shared URL, keyboard/focus, zoom and authorized download', async () => {
  const read = vi.spyOn(chatApi, 'messageMedia').mockResolvedValue(new Blob(['ok'])); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const view = render(<div className="message-history"><MessageMedia message={message} /></div>); show(view); await screen.findByRole('img');
  const open = screen.getByRole('button', { name: 'Ampliar imagem' }); open.focus(); fireEvent.click(open);
  const dialog = screen.getByRole('dialog', { name: 'Visualizar imagem' }); expect(within(dialog).getByRole('img')).toHaveAttribute('src', 'blob:visible'); expect(screen.getByRole('button', { name: 'Fechar visualizador' })).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Ampliar zoom' })); expect(within(dialog).getByLabelText('Zoom da imagem')).toHaveTextContent('150%');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Ajustar à tela' })); expect(within(dialog).getByLabelText('Zoom da imagem')).toHaveTextContent('100%');
  const first = within(dialog).getByRole('button', { name: 'Baixar arquivo' }), last = within(dialog).getByRole('button', { name: 'Ajustar à tela' });
  first.focus(); fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); expect(last).toHaveFocus(); fireEvent.keyDown(document, { key: 'Tab' }); expect(first).toHaveFocus();
  fireEvent.click(first); expect(read).toHaveBeenCalledTimes(1); expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('dialog')).toBeNull(); expect(open).toHaveFocus(); expect(view.container.querySelector('a[target]')).toBeNull();
});
it.each(['AUDIO','VOICE','VIDEO'] as const)('prepares authenticated %s metadata only when visible and never autoplays', async type => {
  const source = vi.spyOn(chatApi, 'messageMediaSource').mockResolvedValue('/api/v1/authorized-media'), blob = vi.spyOn(chatApi, 'messageMedia');
  const view = render(<div className="message-history"><MessageMedia message={{ ...message, type, media: { ...message.media!, type } }} /></div>);
  expect(source).not.toHaveBeenCalled(); show(view);
  const player = await screen.findByLabelText(type === 'VIDEO' ? 'Vídeo da mensagem' : type === 'VOICE' ? 'Mensagem de voz' : 'Áudio da mensagem');
  expect(player).toHaveAttribute('src', '/api/v1/authorized-media'); expect(player).toHaveAttribute('crossorigin','use-credentials'); expect(player).toHaveAttribute('preload','metadata'); expect(player).not.toHaveAttribute('autoplay'); expect(blob).not.toHaveBeenCalled();
  fireEvent.loadedMetadata(player); expect(player).toHaveAttribute('preload','none');
  if(type === 'VIDEO') {
    const open = screen.getByRole('button',{name:'Ampliar vídeo'}); open.focus(); fireEvent.click(open);
    const dialog = screen.getByRole('dialog',{name:'Visualizar vídeo'}), expanded = within(dialog).getByLabelText('Vídeo ampliado'); expect(expanded).toHaveAttribute('src','/api/v1/authorized-media'); expect(expanded).toHaveAttribute('controls'); expect(expanded).not.toHaveAttribute('autoplay');
    fireEvent.keyDown(document,{key:'Escape'}); expect(expanded).not.toHaveAttribute('src'); expect(open).toHaveFocus(); expect(source).toHaveBeenCalledTimes(1);
  }
});
