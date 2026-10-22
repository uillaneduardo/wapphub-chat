import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Eye, LoaderCircle, SendHorizontal } from 'lucide-react';
import { SendPreference } from '../../components/SendPreference';
import { FormattedMessage } from '../../components/FormattedMessage';
import type { SendShortcut } from '../../hooks/useUiPreference';
import { MediaComposer, type Attachment } from './MediaComposer';
import { ComposerTools } from './ComposerTools';
import { formatSelection, insertAtSelection, MAX_COMPOSER_LENGTH } from './useComposerFormatting';
import type { EditResult, FormatKind, TextSelection } from './useComposerFormatting';
import './composer.css';

const EmojiPicker = lazy(() => import('./EmojiPicker'));

export function MessageComposer({ draft, onDraftChange, onSubmit, onTextKeyDown, sending, disabled, attachment, onAttachmentChange, mediaEnabled, shortcut, onShortcutChange }: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  sending: boolean;
  disabled: boolean;
  attachment: Attachment | null;
  onAttachmentChange: (value: Attachment | null) => void;
  mediaEnabled: boolean;
  shortcut: SendShortcut;
  onShortcutChange: (value: SendShortcut) => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const emojiTrigger = useRef<HTMLButtonElement>(null);
  const savedSelection = useRef<TextSelection>({ start: 0, end: 0, direction: 'none' });
  const pendingSelection = useRef<TextSelection | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const canEdit = !disabled;
  const canSend = canEdit && !sending && (Boolean(draft.trim()) || Boolean(attachment)) && draft.length <= MAX_COMPOSER_LENGTH;

  function rememberSelection() {
    if (!input.current) return;
    savedSelection.current = { start: input.current.selectionStart, end: input.current.selectionEnd, direction: input.current.selectionDirection };
  }
  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.max(44, Math.min(144, field.scrollHeight))}px`;
    const pending = pendingSelection.current;
    if (pending) {
      pendingSelection.current = null;
      field.focus();
      field.setSelectionRange(pending.start, pending.end, pending.direction ?? 'none');
      rememberSelection();
    }
  }, [draft]);
  function applyEdit(result: EditResult | null) {
    if (!result) return;
    pendingSelection.current = result.selection;
    savedSelection.current = result.selection;
    onDraftChange(result.text);
    // A text edit that leaves the same value still needs to restore focus/caret.
    if (result.text === draft && input.current) {
      pendingSelection.current = null;
      input.current.focus();
      input.current.setSelectionRange(result.selection.start, result.selection.end, result.selection.direction ?? 'none');
    }
  }
  function selection(): TextSelection {
    const field = input.current;
    if (field && document.activeElement === field) {
      return { start: field.selectionStart, end: field.selectionEnd, direction: field.selectionDirection };
    }
    return savedSelection.current;
  }
  function applyFormat(kind: FormatKind) {
    if (!canEdit) return;
    applyEdit(formatSelection(draft, selection(), kind));
  }
  function closeEmojis() { setEmojiOpen(false); emojiTrigger.current?.focus(); }
  function insertEmoji(emoji: string) {
    if (!canEdit) return;
    applyEdit(insertAtSelection(draft, savedSelection.current, emoji));
    setEmojiOpen(false);
  }
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229 && (event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'b' || key === 'i') {
        event.preventDefault();
        applyFormat(key === 'b' ? 'bold' : 'italic');
        return;
      }
    }
    if (emojiOpen && event.key === 'Enter') { event.preventDefault(); return; }
    onTextKeyDown(event);
  }
  return <form className="message-composer message-composer-modern" onSubmit={onSubmit}>
    <div className="composer-input-zone">
      <textarea ref={input} aria-label="Escrever mensagem" value={draft} onChange={event => { onDraftChange(event.target.value); rememberSelection(); }} onSelect={rememberSelection} onKeyUp={rememberSelection} onClick={rememberSelection} onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Reabra a conversa para enviar mensagens' : 'Escreva uma mensagem…'}
        disabled={disabled} maxLength={MAX_COMPOSER_LENGTH} rows={1} />
      {draft.length >= 7600 && <span className="composer-count" aria-live="polite">{draft.length}/{MAX_COMPOSER_LENGTH}</span>}
    </div>
    {previewOpen && draft.trim() && <div className="composer-text-preview" role="region" aria-label="Prévia da formatação"><span>Prévia da mensagem</span><p><FormattedMessage body={draft} /></p></div>}
    <div className="composer-footer composer-footer-modern">
      {mediaEnabled && <MediaComposer attachment={attachment} onChange={onAttachmentChange} disabled={disabled || sending} />}
      <ComposerTools onFormat={applyFormat} emojiOpen={emojiOpen} disabled={!canEdit} onToggleEmoji={button => {
        rememberSelection();
        emojiTrigger.current = button;
        setEmojiOpen(open => !open);
      }} />
      <button type="button" className={previewOpen ? 'composer-preview-button is-active' : 'composer-preview-button'} title="Prévia da formatação" aria-label="Prévia" aria-pressed={previewOpen} disabled={!draft.trim()} onClick={() => setPreviewOpen(open => !open)}><Eye size={18} aria-hidden="true" /><span>Prévia</span></button>
      <div className="composer-send-controls">
        <button className="primary-button composer-send" type="submit" disabled={!canSend} aria-label="Enviar mensagem">{sending ? <LoaderCircle size={17} className="composer-spin" aria-hidden="true" /> : <SendHorizontal size={17} aria-hidden="true" />}<span>{sending ? 'Enviando…' : 'Enviar'}</span></button>
        <SendPreference value={shortcut} onChange={onShortcutChange} />
      </div>
      {emojiOpen && <Suspense fallback={<div className="emoji-picker-loading" role="status">Abrindo emojis…</div>}><EmojiPicker onPick={insertEmoji} onClose={closeEmojis} /></Suspense>}
    </div>
  </form>;
}
