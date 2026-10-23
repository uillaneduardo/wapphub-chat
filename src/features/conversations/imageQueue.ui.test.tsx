import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MediaComposer, type Attachment } from './MediaComposer';
import type { QueuedImage } from './imageQueue';

function Harness() {
  const [images, setImages] = useState<QueuedImage[]>([]);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  return <MediaComposer attachment={attachment} onChange={setAttachment}
    images={images} onImagesChange={setImages} disabled={false} />;
}
const file = (name: string, type = 'image/jpeg') => new File(['bytes'], name, { type });
describe('G.2 image queue in the compact composer', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  function setup() {
    const create = vi.fn(() => 'blob:image-preview'), revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const view = render(<Harness />);
    const picker = view.container.querySelector('input[type=file]') as HTMLInputElement;
    return { view, picker, revoke };
  }
  it('keeps a batch of thumbnails and appends another selection without replacement', async () => {
    const { picker } = setup();
    expect(picker).toHaveAttribute('multiple');
    fireEvent.change(picker, { target: { files: [file('one.jpg'), file('two.jpg')] } });
    await waitFor(() => expect(screen.getByRole('group', { name: 'Imagens selecionadas' })).toHaveTextContent('2 imagens'));
    fireEvent.change(picker, { target: { files: [file('three.jpg')] } });
    expect(screen.getByRole('group', { name: 'Imagens selecionadas' })).toHaveTextContent('3 imagens');
    expect(screen.getByRole('img', { name: 'Prévia da imagem 1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prévia da imagem 3' })).toBeInTheDocument();
    expect(screen.queryByText('one.jpg')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem 2' }));
    expect(screen.getByRole('group', { name: 'Imagens selecionadas' })).toHaveTextContent('2 imagens');
    fireEvent.click(screen.getByRole('button', { name: 'Remover todas as imagens' }));
    expect(screen.queryByRole('group', { name: 'Imagens selecionadas' })).not.toBeInTheDocument();
  });
  it('does not drop the queue on invalid media, camera cancellation or unsupported mixing', async () => {
    const { picker } = setup();
    fireEvent.change(picker, { target: { files: [file('keep.jpg')] } });
    await screen.findByRole('group', { name: 'Imagens selecionadas' });
    fireEvent.change(picker, { target: { files: [] } });
    expect(screen.getByRole('group', { name: 'Imagens selecionadas' })).toHaveTextContent('1 imagem');
    fireEvent.change(picker, { target: { files: [file('document.pdf', 'application/pdf')] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/Formato não aceito/);
    expect(screen.getByRole('group', { name: 'Imagens selecionadas' })).toHaveTextContent('1 imagem');
    fireEvent.change(picker, { target: { files: [file('video.mp4','video/mp4')] } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Imagens selecionadas' })).toHaveTextContent('1 imagem');
  });
});
