import type { useContextPanel } from '../hooks/useContextPanel';
import { MIN_CONTEXT_WIDTH } from '../hooks/useContextPanel';
export function ContextSeparator({ panel }: { panel: ReturnType<typeof useContextPanel> }) {
  return <div className={`context-separator${panel.resizing ? ' is-resizing' : ''}`} role="separator" tabIndex={0} aria-label="Redimensionar painel de contexto" aria-orientation="vertical" aria-controls={panel.contextId} aria-valuemin={MIN_CONTEXT_WIDTH} aria-valuemax={panel.maxWidth} aria-valuenow={panel.width} aria-valuetext={`${panel.width} pixels`} {...panel.separatorProps}><span /></div>;
}
