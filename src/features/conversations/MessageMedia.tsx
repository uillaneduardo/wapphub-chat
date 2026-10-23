import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Maximize2 } from 'lucide-react';
import { MediaTransfers, type MediaAsset, type MediaLease } from '../../lib/mediaTransfers';
import { observeMedia } from '../../lib/mediaVisibility';
import { MediaLightbox } from './MediaLightbox';
import { AudioPlayer } from './AudioPlayer';
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
/** Source ownership follows visibility and the authorized conversation lifetime. */
export function MessageMedia({ message, transfers }: { message: InternalTextMessage; transfers?: MediaTransfers }) {
  const [localTransfers] = useState(() => new MediaTransfers()), manager = transfers ?? localTransfers;
  const [source, setSource] = useState<{ identity: string; asset: MediaAsset } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [expanded, setExpanded] = useState(false), [downloadBusy, setDownloadBusy] = useState(false);
  const identity = `${message.conversationId}:${message.id}:${message.media?.mediaId}:${message.type}`, asset = source?.identity === identity ? source.asset : undefined;
  const node = useRef<HTMLDivElement>(null), lease = useRef<MediaLease | null>(null), downloadLease = useRef<MediaLease | null>(null), player = useRef<HTMLMediaElement | null>(null);
  const visible = useRef(false), playing = useRef(false), inModal = useRef(false), failed = useRef(false), mounted = useRef(true);
  const currentMessage = useRef(message); currentMessage.current = message;
  const clearSource = useCallback(() => {
    const current = lease.current; lease.current = null; current?.release();
    if (player.current) { player.current.pause(); player.current.removeAttribute('src'); player.current.load(); }
    setSource(null); setBusy(false);
  }, []);
  const start = useCallback(() => {
    const current = currentMessage.current;
    if (lease.current || failed.current || !current.media) return;
    setBusy(true); setError('');
    const native = current.type !== 'IMAGE'; let prepared = false;
    const next = manager.acquire(`${current.type}:${current.media.mediaId}`, current.media.size, async signal => {
      if (native) return { url: await chatApi.messageMediaSource(current.conversationId, current.id, signal), blob: false };
      const bytes = await chatApi.messageMedia(current.conversationId, current.id, signal); signal.throwIfAborted();
      return { url: URL.createObjectURL(bytes), blob: true };
    }, native);
    lease.current = next;
    next.signal.addEventListener('abort', () => {
      if (mounted.current && lease.current === next && prepared) { clearSource(); failed.current = true; setError('Não foi possível preparar os metadados. Tente novamente.'); }
    }, { once: true });
    void next.ready.then(value => { if (mounted.current && lease.current === next && !next.signal.aborted) { prepared = true; setSource({ identity, asset: value }); } }).catch(reason => {
      if (mounted.current && lease.current === next && !next.signal.aborted) { lease.current = null; next.release(); setBusy(false); failed.current = true; setError(mediaError(reason)); }
    }).finally(() => { if (mounted.current && lease.current === next) setBusy(false); });
  }, [manager, identity, clearSource]);
  useEffect(() => {
    mounted.current = true; failed.current = false; visible.current = false; playing.current = false; inModal.current = false; setExpanded(false); setError(''); setSource(null); setBusy(false);
    const element = node.current;
    const stop = element ? observeMedia(element, value => {
      visible.current = value;
      if (value) start(); else if (!playing.current && !inModal.current) clearSource();
    }) : () => undefined;
    return () => { mounted.current = false; stop(); clearSource(); downloadLease.current?.release(); downloadLease.current = null; };
  }, [identity, start, clearSource]);
  const setPlayer = useCallback((element: HTMLMediaElement | null) => {
    const previous = player.current;
    if (previous && previous !== element) { previous.pause(); previous.removeAttribute('src'); previous.load(); }
    player.current = element;
  }, []);
  const close = useCallback(() => { inModal.current = false; setExpanded(false); if (!visible.current && !playing.current && typeof IntersectionObserver !== 'undefined') clearSource(); }, [clearSource]);
  function open() { inModal.current = true; player.current?.pause(); lease.current?.metadataReady(); setExpanded(true); }
  function metadataLoaded() { if (player.current) { player.current.preload = 'none'; if (player.current.networkState !== 2) lease.current?.metadataReady(); } }
  function metadataSuspended() { if (player.current && player.current.readyState >= 1) lease.current?.metadataReady(); }
  function playbackError() { lease.current?.metadataReady(); failed.current = true; setError(player.current?.error?.code === 2 ? 'A reprodução foi interrompida. Tente novamente.' : 'Este navegador não conseguiu reproduzir o formato ou codec. Você pode baixar o arquivo.'); }
  function retry() { clearSource(); failed.current = false; setError(''); start(); }
  function save(url: string, name: string) { const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); }
  async function download() {
    if (!asset || !message.media || downloadLease.current) return;
    if (asset.blob) { save(asset.url, message.media.fileName); return; }
    setDownloadBusy(true);
    const current = manager.acquire(`download:${message.media.mediaId}`, message.media.size, async signal => {
      const bytes = await chatApi.messageMedia(message.conversationId, message.id, signal); signal.throwIfAborted();
      return { url: URL.createObjectURL(bytes), blob: true };
    }, false, false);
    downloadLease.current = current;
    try { const result = await current.ready; if (!current.signal.aborted && mounted.current) save(result.url, message.media.fileName); }
    catch (reason) { if (!current.signal.aborted && mounted.current) setError(mediaError(reason)); }
    finally { setTimeout(() => current.release(), 250); if (downloadLease.current === current) downloadLease.current = null; if (mounted.current) setDownloadBusy(false); }
  }
  if (!message.media) return <p className="muted">Arquivo indisponível nesta versão.</p>;
  if (message.type === 'DOCUMENT') return <div className="message-media media-document" role="group" aria-label="Documento anexado"><FileText size={22} aria-hidden="true" /><span>{message.media.fileName} ({(message.media.size / 1048576).toFixed(1)} MB)</span><button type="button" className="media-action media-icon-action" onClick={() => void download()} disabled={downloadBusy} aria-label="Baixar documento" title="Baixar documento"><Download size={17} /></button>{error && <span role="status">{error}</span>}</div>;
  return <div className={`message-media media-${message.type.toLowerCase()}`} ref={node} role="group"
    aria-label={`Conteúdo de mídia — ${message.type === 'IMAGE' ? 'imagem' : message.type === 'VIDEO' ? 'vídeo' : message.type === 'VOICE' ? 'voz' : 'áudio'}`}>
    <div className="media-content">
      {!asset ? error ? null : typeof IntersectionObserver === 'undefined'
        ? <button type="button" className="secondary-button media-load-button" disabled={busy} onClick={start}>{busy ? 'Carregando mídia…' : 'Abrir mídia'}</button>
        : <div className="media-placeholder" aria-live="polite">{busy ? 'Carregando mídia…' : 'Aguardando mídia ficar visível'}</div>
        : message.type === 'IMAGE'
          ? <button type="button" className="media-preview-button" onClick={open} aria-label="Ampliar imagem">
              <img src={asset.url} alt={message.body || 'Imagem recebida'} onError={() => { failed.current = true; setError('Não foi possível exibir esta imagem. Tente novamente.'); }} />
              <span className="media-expand-hint" aria-hidden="true"><Maximize2 size={16} /></span>
            </button>
          : message.type === 'VIDEO'
            ? <div className="media-video-frame">
                {!expanded && <video ref={setPlayer} controls crossOrigin="use-credentials" preload="metadata" src={asset.url} aria-label="Vídeo da mensagem" onLoadedMetadata={metadataLoaded} onSuspend={metadataSuspended} onPlay={() => { playing.current = true; lease.current?.metadataReady(); }} onPause={() => { playing.current = false; if (!visible.current && !inModal.current && typeof IntersectionObserver !== 'undefined') clearSource(); }} onError={playbackError} />}
              </div>
            : <AudioPlayer src={asset.url} label={message.type === 'VOICE' ? 'Mensagem de voz' : 'Áudio da mensagem'} authenticated
              audioRef={setPlayer} onLoadedMetadata={metadataLoaded} onSuspend={metadataSuspended}
              onPlay={() => { playing.current = true; lease.current?.metadataReady(); }}
              onPause={() => { playing.current = false; if (!visible.current && !inModal.current && typeof IntersectionObserver !== 'undefined') clearSource(); }}
              onError={playbackError} />}
    </div>
    {asset && <div className="media-actions">
      {message.type === 'VIDEO' && <button type="button" className="media-action media-icon-action" onClick={open} aria-label="Ampliar vídeo" title="Ampliar vídeo"><Maximize2 size={17} aria-hidden="true" /></button>}
      <a className="media-action media-icon-action" href={asset.url} download={message.media.fileName} aria-label="Baixar arquivo" title={downloadBusy ? 'Baixando mídia…' : 'Baixar arquivo'} aria-disabled={downloadBusy} onClick={event => { event.preventDefault(); if (!downloadBusy) void download(); }}><Download size={17} aria-hidden="true" />{downloadBusy && <span className="sr-only">Baixando…</span>}</a>
    </div>}
    {error && <div className="media-error"><p role="status">{error}</p><button type="button" className="secondary-button" onClick={retry}>Tentar novamente</button></div>}
    {expanded && asset && <MediaLightbox url={asset.url} video={message.type === 'VIDEO'} alt={message.body || 'Imagem recebida'} onClose={close} onRetry={() => { close(); retry(); }} onDownload={() => void download()} downloadBusy={downloadBusy} fallbackFocus={node.current?.closest<HTMLElement>('.message-history') ?? null} />}
  </div>;
}
