import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MediaComposer } from './MediaComposer';
import { validateMediaFile } from './mediaFileValidation';

function file(name: string, type: string, size = 12) {
  return new File([new Uint8Array(size)], name, { type });
}

describe('G.1 file validation for picker and mobile camera return', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it.each([
    ['foto.jpg', 'image/jpeg', 'IMAGE'], ['foto.png', 'image/png', 'IMAGE'],
    ['foto.webp', 'image/webp', 'IMAGE'], ['clipe.mp4', 'video/mp4', 'VIDEO'],
    ['audio.m4a', 'audio/mp4', 'AUDIO'], ['voz.webm', 'audio/webm', 'VOICE'],
  ] as const)('accepts authorized %s without inferring additional backend capabilities', (name, mime, expected) => {
    const result = validateMediaFile(file(name, mime), expected === 'VOICE');
    expect(result.attachment?.type).toBe(expected);
  });
  it('explains unsupported camera formats, empty return and actual file size instead of inventing storage errors', () => {
    expect(validateMediaFile(file('camera.heic', 'image/heic')).error).toMatch(/HEIC\/HEIF/);
    expect(validateMediaFile(new File([], 'camera.jpg', { type: 'image/jpeg' })).error).toMatch(/não retornou o arquivo/);
    const large = new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'camera.jpg', { type: 'image/jpeg' });
    expect(validateMediaFile(large).error).toMatch(/limite de 8 MB/);
    expect(validateMediaFile(file('boleto.pdf', 'application/pdf')).attachment?.type).toBe('DOCUMENT');
  });
  it('preserves existing selection when a newly chosen file is unsupported or the picker is canceled', () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:existing') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const existing = { file: file('original.jpg', 'image/jpeg'), type: 'IMAGE' as const };
    const update = vi.fn();
    const view = render(<MediaComposer attachment={existing} onChange={update} disabled={false} />);
    const picker = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    const unsupported = file('camera.heic', 'image/heic');
    fireEvent.change(picker, { target: { files: [unsupported] } });
    expect(screen.getByRole('alert')).toHaveTextContent('HEIC/HEIF');
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(picker, { target: { files: [] } });
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Prévia do anexo' })).toBeInTheDocument();
  });
  it('renders a larger video draft with local playback and accessible expand/close actions', () => {
    const create = vi.fn(() => 'blob:synthetic-video'); const revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const update = vi.fn();
    const selected = { file: file('demo.mp4', 'video/mp4'), type: 'VIDEO' as const };
    const view = render(<MediaComposer attachment={selected} onChange={update} disabled={false} />);
    expect(screen.queryByText('demo.mp4')).not.toBeInTheDocument();
    const clip = screen.getByLabelText('Prévia do vídeo');
    expect(clip).toHaveAttribute('src', 'blob:synthetic-video');
    expect(clip).toHaveAttribute('controls');
    const expand = screen.getByRole('button', { name: 'Ampliar prévia do vídeo' });
    fireEvent.click(expand);
    const dialog = screen.getByRole('dialog', { name: 'Prévia ampliada do vídeo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Vídeo ampliado antes do envio')).toHaveAttribute('src', 'blob:synthetic-video');
    expect(screen.getByRole('button', { name: 'Fechar prévia ampliada' })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(expand).toHaveFocus();
    expect(update).not.toHaveBeenCalled();
    view.unmount();
    expect(revoke).toHaveBeenCalledWith('blob:synthetic-video');
  });
});
