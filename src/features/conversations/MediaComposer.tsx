import { useEffect, useRef, useState } from 'react';
import { Mic, Paperclip, Square, Trash2, X } from 'lucide-react';
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
  useEffect(() => {
    if (!attachment) return;
    const url = URL.createObjectURL(attachment.file);
    setPreview(url);
    return () => { URL.revokeObjectURL(url); setPreview(''); };
  }, [attachment]);

  function select(file?: File, voice = false) {
    if (!file) return;
    const type = voice ? 'VOICE' : file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : file.type.startsWith('audio/') ? 'AUDIO' : null;
    const maximum = (type === 'IMAGE' ? 8 : type === 'VIDEO' ? 25 : 16) * 1024 * 1024;
    if (!type || !file.size || file.size > maximum) {
      setError('Formato ou tamanho indisponível. Imagem até 8 MB, áudio até 16 MB e vídeo até 25 MB.');
      return;
    }
    setError(''); onChange({ file, type });
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
        <span>{attachment.type === 'VOICE' ? 'Mensagem de voz' : attachment.type === 'AUDIO' ? 'Áudio anexado' : attachment.file.name}</span>
        {(attachment.type === 'AUDIO' || attachment.type === 'VOICE') && <small className="audio-draft-filename" title={attachment.file.name}>{attachment.file.name}</small>}
        <button type="button" className="attachment-discard-button" disabled={disabled} onClick={() => onChange(null)} aria-label="Descartar anexo" title="Descartar anexo"><Trash2 size={17} aria-hidden="true" /></button>
      </div>
      {preview && (attachment.type === 'IMAGE'
        ? <img src={preview} alt="Prévia do anexo" />
        : attachment.type === 'VIDEO'
          ? <video src={preview} controls aria-label="Prévia do vídeo" />
          : <AudioPlayer key={preview} src={preview} label="Prévia do áudio" compact />)}
      {(attachment.type === 'AUDIO' || attachment.type === 'VOICE') && <small className="attachment-preview-hint">Ouça antes de enviar. Use o botão Enviar do compositor quando estiver pronto.</small>}
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
