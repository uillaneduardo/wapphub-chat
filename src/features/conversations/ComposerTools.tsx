import { useId } from 'react';
import type { ReactNode } from 'react';

// Shared 24px viewBox, stroke and currentColor keep these local SVGs consistent with the tokens.
const tools: { label: string; icon: ReactNode }[] = [
  { label: 'Negrito', icon: <><path d="M6 4h7a4 4 0 0 1 0 8H6z" /><path d="M6 12h8a4 4 0 0 1 0 8H6z" /></> },
  { label: 'Itálico', icon: <><path d="M10 4h10M4 20h10M15 4 9 20" /></> },
  { label: 'Anexar arquivo', icon: <path d="m21 11-8 8a6 6 0 0 1-8.5-8.5L13 2a4 4 0 0 1 5.7 5.7l-8.5 8.5a2 2 0 0 1-2.8-2.8L16 5" /> },
  { label: 'Imagem/vídeo', icon: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 17 5-5 4 4 4-6 5 7" /></> },
  { label: 'Áudio', icon: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></> },
  { label: 'Emojis', icon: <><circle cx="12" cy="12" r="9" /><path d="M8 14a4 4 0 0 0 8 0M8 9h.01M16 9h.01" /></> },
];

export function ComposerTools() {
  const id = useId();
  return <div className="composer-tools" role="group" aria-label="Recursos indisponíveis">
    {tools.map(({ label, icon }, index) => <span key={label} className="tool-tip" tabIndex={0} role="group" aria-disabled="true" aria-label={`${label}: indisponível nesta versão`} aria-describedby={`${id}-${index}`}>
      <button type="button" disabled aria-label={label} aria-describedby={`${id}-${index}`}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{icon}</svg>
      </button>
      <span id={`${id}-${index}`} role="tooltip">{label}: indisponível nesta versão.</span>
    </span>)}
  </div>;
}
