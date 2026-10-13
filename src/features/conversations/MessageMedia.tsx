import { useCallback, useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { chatApi } from '../../lib/chatApi';
import { ApiError } from '../../lib/api';
import type { InternalTextMessage } from '../../types/chat';
function mediaError(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 401) return 'Sua sessão expirou. Entre novamente para abrir a mídia.';
    if (reason.status === 403) return 'Você não tem permissão para abrir esta mídia.';
    if (reason.status === 410) return 'Esta mídia expirou e não está mais disponível.';
    if (reason.status === 409) return 'A integridade do arquivo não pôde ser confirmada.';
    if (reason.status === 415) return 'O formato desta mídia não é suportado.';
    if (reason.status === 429) return 'Outra mídia está sendo processada. Tente novamente em instantes.';
    if (reason.status >= 500 || reason.status === 408 || reason.status === 0) return 'Não foi possível carregar a mídia agora. Tente novamente.';
  }
  return 'Esta mídia não está disponível.';
}
/** Explicit demand only. Native players use cookie-authenticated Core URLs. */
export function MessageMedia({ message }: { message: InternalTextMessage }) {
  const [source, setSource] = useState({ url: '', identity: '' }), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const identity = `${message.conversationId}:${message.id}`, url = source.identity === identity ? source.url : '';
  const objectUrl = useRef(''), request = useRef<AbortController | null>(null), player = useRef<HTMLMediaElement | null>(null);
  useEffect(() => {
    setSource({ url: '', identity: '' }); setBusy(false); setError('');
    return () => {
      request.current?.abort();
      if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; }
      if (player.current) { player.current.pause(); player.current.removeAttribute('src'); player.current.load(); }
    };
  }, [message.conversationId, message.id]);
  async function load() {
    if (busy || url || !message.media) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError('');
    try {
      if (message.type === 'IMAGE') {
        const blob = await chatApi.messageMedia(message.conversationId, message.id, controller.signal);
        if (!controller.signal.aborted) { objectUrl.current = URL.createObjectURL(blob); setSource({ url: objectUrl.current, identity }); }
      } else {
        const source = await chatApi.messageMediaSource(message.conversationId, message.id, controller.signal);
        if (!controller.signal.aborted) setSource({ url: source, identity });
      }
    } catch (reason) { if (!controller.signal.aborted) setError(mediaError(reason)); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function playbackError() {
    const code = player.current?.error?.code;
    setError(code === 2 ? 'A reprodução foi interrompida. Abra a mídia novamente.' : 'Este navegador não conseguiu reproduzir o formato ou codec. Você pode baixar o arquivo.');
  }
  const setPlayer = useCallback((element: HTMLMediaElement | null) => {
    const previous = player.current;
    if (previous && previous !== element) { previous.pause(); previous.removeAttribute('src'); previous.load(); }
    player.current = element;
  }, []);
  function retry() {
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; }
    setSource({ url: '', identity: '' }); setError('');
  }
  if (!message.media || message.type === 'DOCUMENT') return <p className="muted">Arquivo indisponível nesta versão.</p>;
  return <div className="message-media"><p className="muted">{message.media.fileName}</p>
    {!url ? <button type="button" className="secondary-button" disabled={busy} onClick={() => void load()}><Download size={16} aria-hidden="true" />{busy ? 'Carregando mídia…' : 'Abrir mídia'}</button>
      : message.type === 'IMAGE' ? <a href={url} target="_blank" rel="noreferrer" aria-label="Ampliar imagem"><img src={url} alt={message.body || 'Imagem recebida'} onError={() => setError('Não foi possível exibir esta imagem. Você pode baixar o arquivo.')} /></a>
        : message.type === 'VIDEO' ? <video ref={setPlayer} controls crossOrigin="use-credentials" preload="metadata" src={url} aria-label="Vídeo da mensagem" onError={playbackError} />
          : <><audio ref={setPlayer} controls crossOrigin="use-credentials" preload="metadata" src={url} aria-label={message.type === 'VOICE' ? 'Mensagem de voz' : 'Áudio da mensagem'} onError={playbackError} /><label>Velocidade <select defaultValue="1" onChange={event => { if (player.current) player.current.playbackRate = Number(event.target.value); }}><option value="0.75">0,75×</option><option value="1">1×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label></>}
    {url && <a href={url} download={message.media.fileName} target="_blank" rel="noreferrer">Baixar arquivo</a>}{error && <><p role="status">{error}</p>{url && <button type="button" className="secondary-button" onClick={retry}>Tentar novamente</button>}</>}</div>;
}
