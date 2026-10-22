import { Bold, Code2, Italic, Smile, Strikethrough } from 'lucide-react';
import type { FormatKind } from './useComposerFormatting';

const items = [
  { kind: 'bold', label: 'Negrito', hint: 'Ctrl/Cmd+B', Icon: Bold },
  { kind: 'italic', label: 'Itálico', hint: 'Ctrl/Cmd+I', Icon: Italic },
  { kind: 'strike', label: 'Tachado', hint: 'Tachado', Icon: Strikethrough },
  { kind: 'code', label: 'Monoespaçado', hint: 'Monoespaçado', Icon: Code2 },
] as const;

export function ComposerTools({ onFormat, emojiOpen, onToggleEmoji, disabled }: {
  onFormat: (kind: FormatKind) => void;
  emojiOpen: boolean;
  onToggleEmoji: (button: HTMLButtonElement) => void;
  disabled: boolean;
}) {
  return <div className="composer-tools" role="group" aria-label="Formatação e emojis">
    {items.map(({ kind, label, hint, Icon }) => <button key={kind} type="button" title={`${label} — ${hint}`} aria-label={label} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => onFormat(kind)}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></button>)}
    <span className="composer-tools-separator" aria-hidden="true" />
    <button type="button" className={emojiOpen ? 'is-active' : undefined} title="Emojis" aria-label="Emojis" aria-expanded={emojiOpen} disabled={disabled} onClick={event => onToggleEmoji(event.currentTarget)}><Smile size={19} strokeWidth={1.8} aria-hidden="true" /></button>
  </div>;
}
