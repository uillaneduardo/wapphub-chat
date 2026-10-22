import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './audio-player.css';

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

type AudioPlayerProps = {
  src: string;
  label: string;
  authenticated?: boolean;
  audioRef?: (element: HTMLAudioElement | null) => void;
  onLoadedMetadata?: () => void;
  onSuspend?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: () => void;
  compact?: boolean;
};

/**
 * Accessible controls over a native HTMLAudioElement; no transcoding,
 * waveform generation, remote calls or audio URL caching in this component.
 */
export function AudioPlayer({ src, label, authenticated = false, audioRef, onLoadedMetadata, onSuspend, onPlay, onPause, onError, compact = false }: AudioPlayerProps) {
  const native = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');
  const attach = useCallback((element: HTMLAudioElement | null) => {
    native.current = element;
    audioRef?.(element);
  }, [audioRef]);

  useEffect(() => {
    setPlaying(false); setElapsed(0); setDuration(0); setError(''); setSpeed(1);
    // Switching message/source always starts from the beginning.
    if (native.current) native.current.playbackRate = 1;
  }, [src]);

  function syncDuration(element: HTMLAudioElement) {
    const available = Number.isFinite(element.duration) && element.duration > 0
      ? element.duration
      : element.seekable.length ? element.seekable.end(element.seekable.length - 1) : 0;
    setDuration(Number.isFinite(available) && available > 0 ? available : 0);
  }
  async function toggle() {
    const audio = native.current;
    if (!audio) return;
    setError('');
    if (!audio.paused) { audio.pause(); return; }
    try { await audio.play(); } catch { setPlaying(false); setError('Não foi possível iniciar a reprodução.'); }
  }
  function seek(value: number) {
    const audio = native.current;
    if (!audio || !duration || !Number.isFinite(value)) return;
    const next = Math.max(0, Math.min(value, duration));
    try { audio.currentTime = next; setElapsed(next); } catch { setError('Não foi possível navegar neste áudio.'); }
  }

  const progress = duration > 0 ? Math.min(100, Math.max(0, 100 * elapsed / duration)) : 0;
  return <div className={`audio-player${compact ? ' is-compact' : ''}`} aria-label={label + ' — controles'}>
    <audio ref={attach} src={src} aria-label={label} preload="metadata" crossOrigin={authenticated ? 'use-credentials' : undefined}
      onLoadedMetadata={event => { syncDuration(event.currentTarget); onLoadedMetadata?.(); }}
      onDurationChange={event => syncDuration(event.currentTarget)}
      onTimeUpdate={event => setElapsed(event.currentTarget.currentTime)}
      onSeeked={event => setElapsed(event.currentTarget.currentTime)}
      onSuspend={onSuspend}
      onPlay={() => { setPlaying(true); onPlay?.(); }}
      onPause={() => { setPlaying(false); onPause?.(); }}
      onEnded={() => setPlaying(false)}
      onError={() => { setPlaying(false); onError?.(); }}
    />
    <button type="button" className="audio-play-button" onClick={() => void toggle()} aria-label={playing ? 'Pausar áudio' : 'Reproduzir áudio'} title={playing ? 'Pausar' : 'Reproduzir'}>
      {playing ? <Pause size={17} fill="currentColor" aria-hidden="true" /> : <Play size={17} fill="currentColor" aria-hidden="true" />}
    </button>
    <div className="audio-timeline">
      <input type="range" className="audio-seek" aria-label="Posição do áudio" min="0" max={duration > 0 ? duration : 1} step="0.1"
        value={Math.min(elapsed, duration || 1)} disabled={duration <= 0} onChange={event => seek(Number(event.target.value))}
        style={{ '--audio-progress': `${progress}%` } as React.CSSProperties} />
      <div className="audio-times"><span>{formatAudioTime(elapsed)}</span><span>{formatAudioTime(duration)}</span></div>
    </div>
    <select className="audio-rate" aria-label="Velocidade" title="Velocidade de reprodução" value={String(speed)}
      onChange={event => { const value = Number(event.target.value); setSpeed(value); if (native.current) native.current.playbackRate = value; }}>
      <option value="0.75">0,75×</option><option value="1">1×</option><option value="1.5">1,5×</option><option value="2">2×</option>
    </select>
    {error && <p className="audio-playback-error" role="status">{error}</p>}
  </div>;
}
