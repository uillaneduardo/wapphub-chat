import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MediaComposer, type Attachment } from './MediaComposer';

class FakeRecorder {
  static isTypeSupported = vi.fn(() => true);
  state: RecordingState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(media: MediaStream, options?: MediaRecorderOptions) { void media; void options; }
  start() { this.state = 'recording'; }
  stop() {
    if (this.state !== 'recording') return;
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) } as BlobEvent);
    this.onstop?.();
  }
}
describe('recording and local audio preview', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  function setup() {
    const stop = vi.fn();
    const media = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const getUserMedia = vi.fn(async () => media);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:recorded') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    return { stop, getUserMedia };
  }
  it('does not request a microphone until clicked, and cancel never creates an attachment', async () => {
    const { getUserMedia, stop } = setup();
    const changed = vi.fn();
    const recording = vi.fn();
    render(<MediaComposer attachment={null} onChange={changed} disabled={false} onRecordingChange={recording} />);
    expect(getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Gravar voz' }));
    expect(await screen.findByRole('status', { name: 'Gravando áudio' })).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar gravação' }));
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Gravando áudio' })).not.toBeInTheDocument());
    expect(stop).toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    expect(recording).toHaveBeenCalledWith(true);
    expect(recording).toHaveBeenCalledWith(false);
  });
  it('concludes into an unsent draft with a seekable player and explicit discard', async () => {
    setup();
    let file: Attachment | null = null;
    const changed = vi.fn((next: Attachment | null) => { file = next; });
    const view = render(<MediaComposer attachment={null} onChange={changed} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gravar voz' }));
    await screen.findByRole('status', { name: 'Gravando áudio' });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir gravação' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(file).toMatchObject({ type: 'VOICE', file: { name: 'mensagem-de-voz.webm' } });
    view.rerender(<MediaComposer attachment={file} onChange={changed} disabled={false} />);
    expect(await screen.findByLabelText('Prévia do áudio')).toHaveAttribute('src', 'blob:recorded');
    expect(screen.getByRole('slider', { name: 'Posição do áudio' })).toBeInTheDocument();
    expect(screen.getByText(/Ouça antes de enviar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar anexo' }));
    expect(changed).toHaveBeenLastCalledWith(null);
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recorded');
  });
});
