import { useEffect, useRef, useState } from 'react';
import { Mic, Paperclip, Square, X } from 'lucide-react';
export type Attachment = { file: File; type: 'IMAGE' | 'AUDIO' | 'VOICE' | 'VIDEO' };
export function MediaComposer({ attachment, onChange, disabled }: { attachment: Attachment | null; onChange: (value: Attachment | null) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), active = useRef(true);
  const [recording, setRecording] = useState(false), [preview, setPreview] = useState(''), [error, setError] = useState('');
  useEffect(() => { active.current = true; return () => { active.current = false; if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  useEffect(() => { if (!attachment) return; const url = URL.createObjectURL(attachment.file); setPreview(url); return () => { URL.revokeObjectURL(url); setPreview(''); }; }, [attachment]);
  function select(file?: File, voice = false) {
    if (!file) return;
    const type = voice ? 'VOICE' : file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : file.type.startsWith('audio/') ? 'AUDIO' : null;
    const maximum = (type === 'IMAGE' ? 8 : type === 'VIDEO' ? 25 : 16) * 1024 * 1024;
    if (!type || !file.size || file.size > maximum) { setError('Formato ou tamanho indisponível. Imagem até 8 MB, áudio até 16 MB e vídeo até 25 MB.'); return; }
    setError(''); onChange({ file, type });
  }
  async function record() {
    if (disabled || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) { setError('Gravação indisponível neste navegador. Você pode anexar um áudio.'); return; }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media; const instance = new MediaRecorder(media, { mimeType: 'audio/webm;codecs=opus' }); recorder.current = instance;
      const chunks: Blob[] = []; let bytes = 0, rejected = false; const timer = setTimeout(() => { if (instance.state === 'recording') instance.stop(); }, 600000);
      instance.ondataavailable = event => { bytes += event.data.size; if (bytes > 16 * 1024 * 1024) { rejected = true; if (instance.state === 'recording') instance.stop(); } else chunks.push(event.data); };
      instance.onstop = () => { clearTimeout(timer); media.getTracks().forEach(track => track.stop()); if (!active.current) return; setRecording(false); if (rejected) setError('A gravação atingiu o limite de segurança.'); else select(new File(chunks, 'mensagem-de-voz.webm', { type: 'audio/webm' }), true); };
      instance.start(1000); setRecording(true); setError('');
    } catch { if (active.current) setError('Não foi possível acessar o microfone.'); }
  }
  return <div className="media-composer"><div className="provider-actions"><input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,audio/webm,video/mp4" onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} /><button type="button" className="text-button" aria-label="Anexar mídia" disabled={disabled || recording} onClick={() => input.current?.click()}><Paperclip size={20} aria-hidden="true" />Anexar</button><button type="button" className="text-button" disabled={disabled} onClick={() => recording ? recorder.current?.stop() : void record()}>{recording ? <Square size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}{recording ? 'Concluir gravação' : 'Gravar voz'}</button></div>{recording && <p role="status">Gravando. A mensagem será enviada somente após clicar em Enviar.</p>}{attachment && <div className="attachment-preview"><span>{attachment.file.name}</span>{preview && (attachment.type === 'IMAGE' ? <img src={preview} alt="Prévia do anexo" /> : attachment.type === 'VIDEO' ? <video src={preview} controls aria-label="Prévia do vídeo" /> : <audio src={preview} controls aria-label="Prévia do áudio" />)}<button type="button" className="text-button" disabled={disabled} onClick={() => onChange(null)}><X size={18} aria-hidden="true" />Descartar anexo</button></div>}{error && <p role="alert">{error}</p>}</div>;
}
