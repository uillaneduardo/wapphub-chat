import { useEffect, useRef, useState } from 'react';
import { Maximize2, Mic, Paperclip, Square, Trash2, X } from 'lucide-react';
import { validateMediaFile } from './mediaFileValidation';
import { AudioPlayer, formatAudioTime } from './AudioPlayer';

export type Attachment = { file: File; type: 'IMAGE' | 'AUDIO' | 'VOICE' | 'VIDEO' };

export function MediaComposer({ attachment, onChange, disabled, onRecordingChange }: {
  attachment: Attachment | null;
  onChange: (value: Attachment | null) => void;
  disabled: boolean;
  onRecordingChange?: (recording: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const active = useRef(true);
  const cancelled = useRef(false);
  const requesting = useRef(false);
  const started = useRef(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState('');
  const [videoExpanded, setVideoExpanded] = useState(false);
  const videoClose = useRef<HTMLButtonElement>(null);
  const videoModal = useRef<HTMLVideoElement>(null);
  const videoTrigger = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState('');

  useEffect(() => { onRecordingChange?.(recording); }, [recording, onRecordingChange]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      cancelled.current = true;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => { if (videoExpanded) videoClose.current?.focus(); }, [videoExpanded]);
  useEffect(() => {
    setVideoExpanded(false);
    if (!attachment) return;
    const url = URL.createObjectURL(attachment.file);
    setPreview(url);
    return () => { URL.revokeObjectURL(url); setPreview(''); };
  }, [attachment]);

  function select(file?: File, voice = false) {
    if (!file) return; // Camera/file picker canceled; existing draft is retained.
    const result = validateMediaFile(file, voice);
    if (!result.attachment) { setError(result.error ?? 'Não foi possível anexar este arquivo.'); return; }
    setError(''); onChange(result.attachment);
  }
  function closeVideoPreview() {
    setVideoExpanded(false);
    videoTrigger.current?.focus();
  }

  function finish(discard = false) {
    if (recorder.current?.state !== 'recording') return;
    cancelled.current = discard;
    recorder.current.stop();
  }

  async function record() {
    if (disabled || recording || requesting.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      setError('Gravação indisponível neste navegador. Você pode anexar um áudio.');
      return;
    }
    requesting.current = true;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current || disabled) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const instance = new MediaRecorder(media, { mimeType: 'audio/webm;codecs=opus' });
      recorder.current = instance; cancelled.current = false;
      const chunks: Blob[] = [];
      let bytes = 0, rejected = false;
      const maxTimer = setTimeout(() => { if (instance.state === 'recording') instance.stop(); }, 600000);
      instance.ondataavailable = event => {
        bytes += event.data.size;
        if (bytes > 16 * 1024 * 1024) {
          rejected = true;
          if (instance.state === 'recording') instance.stop();
        } else chunks.push(event.data);
      };
      instance.onstop = () => {
        clearTimeout(maxTimer);
        media.getTracks().forEach(track => track.stop());
        const discard = cancelled.current;
        const file = !discard && !rejected && active.current ? new File(chunks, 'mensagem-de-voz.webm', { type: 'audio/webm' }) : undefined;
        chunks.length = 0;
        instance.ondataavailable = null; instance.onstop = null;
        if (recorder.current === instance) recorder.current = null;
        if (stream.current === media) stream.current = null;
        if (!active.current) return;
        setRecording(false); setSeconds(0);
        if (rejected) setError('A gravação atingiu o limite de segurança.');
        else if (!discard) select(file, true);
      };
      instance.start(1000);
      started.current = Date.now();
      setSeconds(0); setRecording(true); setError('');
    } catch {
      if (active.current) setError('Não foi possível acessar o microfone.');
      stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    } finally { requesting.current = false; }
  }

  return <div className="media-composer">
    <div className="provider-actions">
      <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,audio/webm,video/mp4"
        onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} />
      <button type="button" className="text-button" aria-label="Anexar mídia" disabled={disabled || recording} onClick={() => input.current?.click()}>
        <Paperclip size={18} aria-hidden="true" />Anexar
      </button>
      {!recording && <button type="button" className="text-button" disabled={disabled} onClick={() => void record()}>
        <Mic size={18} aria-hidden="true" />Gravar voz
      </button>}
    </div>
    {recording && <div className="audio-recording" role="status" aria-label="Gravando áudio">
      <span className="audio-recording-dot" aria-hidden="true" />
      <span className="audio-recording-label">Gravando</span>
      <time className="audio-recording-time">{formatAudioTime(seconds)}</time>
      <div className="audio-recording-pulse" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="audio-recording-actions">
        <button type="button" className="audio-recording-discard" onClick={() => finish(true)} disabled={disabled} aria-label="Cancelar gravação"><X size={17} aria-hidden="true" />Cancelar</button>
        <button type="button" className="audio-recording-stop" onClick={() => finish(false)} disabled={disabled} aria-label="Concluir gravação"><Square size={14} fill="currentColor" aria-hidden="true" />Concluir</button>
      </div>
    </div>}
    {attachment && <div className={`attachment-preview${attachment.type === 'AUDIO' || attachment.type === 'VOICE' ? ' audio-draft-preview' : ''}`}>
      <div className="attachment-preview-heading">
        <span className="sr-only">{attachment.type === 'IMAGE' ? 'Prévia de imagem' : attachment.type === 'VIDEO' ? 'Prévia de vídeo' : 'Prévia de áudio'}</span>
        <button type="button" className="attachment-discard-button" disabled={disabled} onClick={() => onChange(null)} aria-label="Descartar anexo" title="Descartar anexo"><Trash2 size={17} aria-hidden="true" /></button>
      </div>
      {preview && (attachment.type === 'IMAGE'
        ? <img src={preview} alt="Prévia do anexo" />
        : attachment.type === 'VIDEO'
          ? <div className="attachment-video-frame"><video src={preview} controls preload="metadata" aria-label="Prévia do vídeo" />
              <button ref={videoTrigger} className="attachment-video-expand" type="button" onClick={() => setVideoExpanded(true)} aria-label="Ampliar prévia do vídeo" title="Ampliar prévia do vídeo"><Maximize2 size={16} aria-hidden="true" /></button>
            </div>
          : <AudioPlayer key={preview} src={preview} label="Prévia do áudio" compact />)}
      {(attachment.type === 'AUDIO' || attachment.type === 'VOICE') && <small className="attachment-preview-hint">Ouça antes de enviar. Use o botão Enviar do compositor quando estiver pronto.</small>}
    </div>}
    {videoExpanded && attachment?.type === 'VIDEO' && preview && <div className="attachment-video-modal-backdrop"
      onMouseDown={event => { if (event.target === event.currentTarget) closeVideoPreview(); }}
      role="presentation">
      <div className="attachment-video-modal" role="dialog" aria-modal="true" aria-label="Prévia ampliada do vídeo"
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); closeVideoPreview(); }
          if (event.key === 'Tab' && event.target === videoClose.current && event.shiftKey) { event.preventDefault(); videoModal.current?.focus(); }
          else if (event.key === 'Tab' && event.target === videoModal.current && !event.shiftKey) { event.preventDefault(); videoClose.current?.focus(); }
        }}>
        <div className="attachment-video-modal-toolbar">
          <strong>Prévia do vídeo</strong>
          <button ref={videoClose}
            type="button" aria-label="Fechar prévia ampliada" onClick={closeVideoPreview}><X size={18} aria-hidden="true" /></button>
        </div>
        <video ref={videoModal} src={preview} controls tabIndex={0} preload="metadata" aria-label="Vídeo ampliado antes do envio" />
      </div>
    </div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
