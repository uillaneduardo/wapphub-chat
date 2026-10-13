import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function MediaLightbox({ url, video, alt, onClose, onDownload, downloadBusy, fallbackFocus, onRetry }: { url: string; video: boolean; alt: string; onClose: () => void; onDownload: () => void; downloadBusy: boolean; fallbackFocus: HTMLElement | null; onRetry: () => void }) {
  const [zoom, setZoom] = useState(1), [error, setError] = useState(''); const title = useId();
  const dialog = useRef<HTMLDivElement>(null), close = useRef<HTMLButtonElement>(null), player = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null; const node = dialog.current!, playback = player.current;
    const siblings = [...document.body.children].filter(element => !element.contains(node)).map(element => ({ element, inert: element.hasAttribute('inert') }));
    siblings.forEach(({ element }) => element.setAttribute('inert', ''));
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; close.current?.focus();
    const focusables = () => [...node.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],video[controls],[tabindex="0"]')];
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const elements = focusables(), first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const focus = (event: FocusEvent) => { if (!node.contains(event.target as Node)) close.current?.focus(); };
    document.addEventListener('keydown', key); document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('keydown', key); document.removeEventListener('focusin', focus);
      if (playback) { playback.pause(); playback.removeAttribute('src'); playback.load(); }
      siblings.forEach(({ element, inert }) => { if (!inert) element.removeAttribute('inert'); }); document.body.style.overflow = overflow;
      (previous?.isConnected ? previous : fallbackFocus)?.focus({ preventScroll: true });
    };
  }, [onClose, fallbackFocus]);
  return createPortal(<div className="media-lightbox-backdrop"><div className="media-lightbox" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={title}>
    <div className="media-lightbox-toolbar"><h2 id={title}>{video ? 'Visualizar vídeo' : 'Visualizar imagem'}</h2><button type="button" onClick={onDownload} disabled={downloadBusy}>{downloadBusy ? 'Baixando…' : 'Baixar arquivo'}</button><button ref={close} type="button" onClick={onClose} aria-label="Fechar visualizador">Fechar</button></div>
    {!video && <div className="media-lightbox-tools"><button type="button" aria-label="Reduzir imagem" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value - 0.5))}>−</button><output aria-label="Zoom da imagem">{Math.round(zoom * 100)}%</output><button type="button" aria-label="Ampliar zoom" disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + 0.5))}>+</button><button type="button" onClick={() => setZoom(1)}>Ajustar à tela</button></div>}
    <div className="media-lightbox-stage">{video ? <video ref={player} src={url} controls crossOrigin="use-credentials" preload="metadata" aria-label="Vídeo ampliado" tabIndex={0} onError={() => setError('Não foi possível reproduzir este vídeo. Tente novamente.')} /> : <img src={url} alt={alt} onError={() => setError('Não foi possível exibir esta imagem. Tente novamente.')} style={{ width: `${zoom * 100}%`, maxHeight: zoom === 1 ? '70dvh' : 'none' }} />}</div>
    {error && <div className="media-lightbox-tools"><p role="status">{error}</p><button type="button" onClick={onRetry}>Tentar novamente</button></div>}
  </div></div>, document.body);
}
