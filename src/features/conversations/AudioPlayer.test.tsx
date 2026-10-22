import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AudioPlayer, formatAudioTime } from './AudioPlayer';

describe('audio player — accessible seek and native lifecycle', () => {
  afterEach(() => vi.restoreAllMocks());
  it('formats duration without invalid NaN or infinite time', () => {
    expect(formatAudioTime(0)).toBe('0:00');
    expect(formatAudioTime(65.8)).toBe('1:05');
    expect(formatAudioTime(3661)).toBe('1:01:01');
    expect(formatAudioTime(NaN)).toBe('0:00');
    expect(formatAudioTime(Infinity)).toBe('0:00');
  });
  it('renders silent native audio with authorized source and a disabled seek before metadata', () => {
    render(<AudioPlayer src="/api/authorized" label="Mensagem de voz" authenticated />);
    const media = screen.getByLabelText('Mensagem de voz');
    expect(media).toHaveAttribute('src', '/api/authorized');
    expect(media).toHaveAttribute('crossorigin', 'use-credentials');
    expect(media).toHaveAttribute('preload', 'metadata');
    expect(media).not.toHaveAttribute('autoplay');
    expect(media).not.toHaveAttribute('controls');
    expect(screen.getByRole('slider', { name: 'Posição do áudio' })).toBeDisabled();
  });
  it('supports play, pause, seek and speed without a real network call', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => {});
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const metadata = vi.fn(), playing = vi.fn(), paused = vi.fn();
    render(<AudioPlayer src="blob:local" label="Prévia do áudio" onLoadedMetadata={metadata} onPlay={playing} onPause={paused} />);
    const media = screen.getByLabelText('Prévia do áudio') as HTMLAudioElement;
    let pausedState = true;
    Object.defineProperty(media, 'paused', { configurable: true, get: () => pausedState });
    Object.defineProperty(media, 'duration', { configurable: true, value: 75 });
    fireEvent.loadedMetadata(media);
    expect(metadata).toHaveBeenCalledOnce();
    expect(screen.getByText('1:15')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reproduzir áudio' }));
    expect(play).toHaveBeenCalledOnce();
    pausedState = false;
    fireEvent.play(media);
    expect(playing).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Pausar áudio' })).toBeInTheDocument();
    fireEvent.timeUpdate(media, { target: { currentTime: 15 } });
    const slider = screen.getByRole('slider', { name: 'Posição do áudio' });
    expect(slider).not.toBeDisabled();
    fireEvent.change(slider, { target: { value: '42' } });
    expect(media.currentTime).toBe(42);
    expect(screen.getByText('0:42')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Velocidade' }), { target: { value: '1.5' } });
    expect(media.playbackRate).toBe(1.5);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar áudio' }));
    expect(pause).toHaveBeenCalledOnce();
    pausedState = true;
    fireEvent.pause(media);
    expect(paused).toHaveBeenCalledOnce();
    fireEvent.ended(media);
    expect(screen.getByRole('button', { name: 'Reproduzir áudio' })).toBeInTheDocument();
  });
  it('does not allow seek for metadata with unknown duration and resets on changing source', () => {
    const view = render(<AudioPlayer src="blob:first" label="Prévia do áudio" />);
    const media = screen.getByLabelText('Prévia do áudio') as HTMLAudioElement;
    Object.defineProperty(media, 'duration', { configurable: true, value: Infinity });
    fireEvent.loadedMetadata(media);
    expect(screen.getByRole('slider', { name: 'Posição do áudio' })).toBeDisabled();
    view.rerender(<AudioPlayer src="blob:second" label="Prévia do áudio" />);
    expect(screen.getByRole('slider', { name: 'Posição do áudio' })).toBeDisabled();
    expect(screen.getAllByText('0:00')).toHaveLength(2);
  });
});
