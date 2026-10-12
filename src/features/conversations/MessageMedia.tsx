import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { chatApi } from '../../lib/chatApi';
import type { InternalTextMessage } from '../../types/chat';
/** Bytes are requested only on explicit demand. Core authorizes visibility;
 * object URLs and requests are destroyed on conversation/tenant unmount. */
export function MessageMedia({ message }: { message: InternalTextMessage }) {
  const [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const objectUrl = useRef(''), request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  async function load() {
    if (busy || url || !message.media) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError('');
    try { const blob = await chatApi.messageMedia(message.conversationId, message.id, controller.signal); if (!controller.signal.aborted) { objectUrl.current = URL.createObjectURL(blob); setUrl(objectUrl.current); } }
    catch { if (!controller.signal.aborted) setError('Mídia indisponível ou expirada.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  if (!message.media || message.type === 'DOCUMENT') return <p className="muted">Arquivo indisponível nesta versão.</p>;
  return <div className="message-media"><p className="muted">{message.media.fileName}</p>{!url ? <button type="button" className="secondary-button" disabled={busy} onClick={() => void load()}><Download size={16} aria-hidden="true" />{busy ? 'Carregando mídia…' : 'Abrir mídia'}</button> : message.type === 'IMAGE' ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={message.body || 'Imagem recebida'} /></a> : message.type === 'VIDEO' ? <video controls preload="metadata" src={url} aria-label="Vídeo da mensagem" /> : <audio controls preload="metadata" src={url} aria-label={message.type === 'VOICE' ? 'Mensagem de voz' : 'Áudio da mensagem'} />}{error && <p role="status">{error}</p>}</div>;
}
