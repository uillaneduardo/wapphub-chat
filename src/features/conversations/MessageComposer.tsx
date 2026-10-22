import { lazy, Suspense, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Eye, LoaderCircle, MoreHorizontal, Plus, SendHorizontal, Smile, X } from 'lucide-react';
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
  const optionsTrigger = useRef<HTMLButtonElement>(null);
  const optionsPanel = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<TextSelection>({ start: 0, end: 0, direction: 'none' });
  const pendingSelection = useRef<TextSelection | null>(null);
  const toolsId = useId(), optionsId = useId();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const canEdit = !disabled;
  const expanded = toolsOpen || recordingVoice;
  const canSend = canEdit && !sending && (Boolean(draft.trim()) || Boolean(attachment)) && draft.length <= MAX_COMPOSER_LENGTH;

  function rememberSelection() {
    if (!input.current) return;
    savedSelection.current = { start: input.current.selectionStart, end: input.current.selectionEnd, direction: input.current.selectionDirection };
  }
  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.max(42, Math.min(132, field.scrollHeight))}px`;
    const pending = pendingSelection.current;
    if (pending) {
      pendingSelection.current = null;
      field.focus();
      field.setSelectionRange(pending.start, pending.end, pending.direction ?? 'none');
      rememberSelection();
    }
  }, [draft]);
  useLayoutEffect(() => {
    if (optionsOpen) optionsPanel.current?.querySelector('select')?.focus();
  }, [optionsOpen]);
  function applyEdit(result: EditResult | null) {
    if (!result) return;
    pendingSelection.current = result.selection;
    savedSelection.current = result.selection;
    onDraftChange(result.text);
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
    if (canEdit) applyEdit(formatSelection(draft, selection(), kind));
  }
  function closeEmojis() { setEmojiOpen(false); emojiTrigger.current?.focus(); }
  function insertEmoji(emoji: string) {
    if (!canEdit) return;
    applyEdit(insertAtSelection(draft, savedSelection.current, emoji));
    setEmojiOpen(false);
  }
  function closeOptions() { setOptionsOpen(false); optionsTrigger.current?.focus(); }
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
  return <form className="message-composer message-composer-modern composer-minimal" onSubmit={onSubmit}>
    <div className="composer-surface">
      {/* Keep MediaComposer mounted while folding controls: a running MediaRecorder must not be destroyed. */}
      <div id={toolsId} className={`composer-secondary${expanded ? ' is-expanded' : ''}`} aria-label="Ferramentas de mensagem">
        {mediaEnabled && <MediaComposer attachment={attachment} onChange={onAttachmentChange} disabled={disabled || sending} onRecordingChange={setRecordingVoice} />}
        <ComposerTools onFormat={applyFormat} emojiOpen={emojiOpen} disabled={!canEdit} showEmoji={false} onToggleEmoji={() => undefined} />
        <button type="button" className={previewOpen ? 'composer-preview-button is-active' : 'composer-preview-button'} title="Prévia da formatação" aria-label="Prévia" aria-pressed={previewOpen} disabled={!draft.trim()} onClick={() => setPreviewOpen(open => !open)}><Eye size={17} aria-hidden="true" /><span>Prévia</span></button>
        <button ref={optionsTrigger} type="button" className="composer-options-button" title="Preferências de envio" aria-label="Preferências de envio" aria-expanded={optionsOpen} aria-controls={optionsId} onClick={() => setOptionsOpen(open => !open)}><MoreHorizontal size={18} aria-hidden="true" /><span>Opções</span></button>
      </div>
      <div className="composer-input-row">
        <button type="button" className="composer-expand-tools" title={expanded ? 'Recolher ferramentas' : 'Mais ferramentas'} aria-label={expanded ? 'Recolher ferramentas' : 'Mais ferramentas'} aria-controls={toolsId} aria-expanded={expanded} disabled={!canEdit || recordingVoice} onClick={() => { setToolsOpen(open => !open); setOptionsOpen(false); }}><Plus className={expanded ? 'composer-plus-open' : undefined} size={21} aria-hidden="true" /></button>
        <div className="composer-input-zone">
          <textarea ref={input} aria-label="Escrever mensagem" value={draft} onChange={event => { onDraftChange(event.target.value); rememberSelection(); }} onSelect={rememberSelection} onKeyUp={rememberSelection} onClick={rememberSelection} onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Reabra a conversa para enviar mensagens' : 'Escreva uma mensagem…'}
            disabled={disabled} maxLength={MAX_COMPOSER_LENGTH} rows={1} />
          {draft.length >= 7600 && <span className="composer-count" aria-live="polite">{draft.length}/{MAX_COMPOSER_LENGTH}</span>}
        </div>
        <button ref={emojiTrigger} type="button" className={emojiOpen ? 'composer-emoji-shortcut is-active' : 'composer-emoji-shortcut'} title="Emojis" aria-label="Emojis" aria-expanded={emojiOpen} disabled={!canEdit} onClick={() => { rememberSelection(); setEmojiOpen(open => !open); setOptionsOpen(false); }}><Smile size={19} aria-hidden="true" /></button>
        <button className="primary-button composer-send" type="submit" disabled={!canSend} aria-label="Enviar mensagem">{sending ? <LoaderCircle size={17} className="composer-spin" aria-hidden="true" /> : <SendHorizontal size={18} aria-hidden="true" />}<span>{sending ? 'Enviando…' : 'Enviar'}</span></button>
      </div>
      {previewOpen && draft.trim() && <div className="composer-text-preview" role="region" aria-label="Prévia da formatação"><span>Prévia da mensagem</span><p><FormattedMessage body={draft} /></p></div>}
      {optionsOpen && <div ref={optionsPanel} id={optionsId} className="composer-options-panel" role="group" aria-label="Preferências de envio" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeOptions(); } }}>
        <div className="composer-options-heading"><strong>Atalho para enviar</strong><button type="button" aria-label="Fechar preferências" onClick={closeOptions}><X size={16} aria-hidden="true" /></button></div>
        <SendPreference value={shortcut} onChange={onShortcutChange} />
        <small>Configure Enter e Shift+Enter conforme sua preferência.</small>
      </div>}
      {emojiOpen && <Suspense fallback={<div className="emoji-picker-loading" role="status">Abrindo emojis…</div>}><EmojiPicker onPick={insertEmoji} onClose={closeEmojis} /></Suspense>}
    </div>
  </form>;
}
