import "./media.css";
import { MessageMedia } from "./MessageMedia";
import { MediaComposer, type Attachment } from "./MediaComposer";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, Outlet, useMatch, useNavigate, useParams, useLocation } from 'react-router-dom';
import { FormattedMessage } from '../../components/FormattedMessage';
import { useSession } from '../session/SessionContext';
import { ApiError } from '../../lib/api';
import { chatApi } from '../../lib/chatApi';
import { contactIdentifier } from '../../lib/contactIdentifier';
import { realtimeBus } from '../../lib/realtimeBus';
import { InboxList } from './InboxList';
import type { Contact, Conversation, CursorPage, InternalNote, InternalTextMessage, Tag } from '../../types/chat';
import { createClientMessageId, createOptimisticMessage, mergeMessages } from './conversationModel';
import { ComposerTools } from './ComposerTools';
import { useMessageScroll, messageScrollKey } from './useMessageScroll';
import { useComposerShortcut } from '../../hooks/useComposerShortcut';
import { useContextPanel } from '../../hooks/useContextPanel';
import { SendPreference } from '../../components/SendPreference';
import { ContextSeparator } from '../../components/ContextSeparator';
import { Icon } from '../../components/Icon';
import { ConversationActions } from './ConversationActions';

export function ConversationsLayout() {
  const selected = useMatch('/app/conversations/:conversationId');
  return <div className={`conversation-workspace${selected ? ' has-conversation' : ''}`}><InboxList /><section className="conversation-panel"><Outlet /></section></div>;
}

export function InboxWelcome() { return <div className="conversation-welcome"><div className="page-icon">◌</div><h2>Suas conversas</h2><p>Selecione uma conversa na lista para abrir o atendimento.</p></div>; }

const messageStatusLabel: Record<InternalTextMessage['status'], string> = { PENDING: 'Enviando', SENT: 'Enviada', DELIVERED: 'Entregue', READ: 'Lida', FAILED: 'Erro' };
const chatEventTypes = new Set(['conversation.history.updated', 'contacts.updated', 'conversation.created', 'conversation.updated', 'conversation.archived', 'conversation.assigned', 'conversation.transferred', 'message.created', 'message.updated', 'note.created', 'tag.created', 'tag.updated', 'tag.deleted', 'conversation.tag.added', 'conversation.tag.removed']);
const noPermissions: string[] = [];

export function ConversationView() {
  const { conversationId = '' } = useParams(); const { session } = useSession();
  return <ConversationViewContent key={`${session?.currentOrganizationId ?? ''}:${session?.user.id ?? ''}:${conversationId}`} />;
}

function ConversationViewContent() {
  const { conversationId = '' } = useParams(); const navigate = useNavigate(); const location = useLocation(); const { session } = useSession();
  const permissions = session?.permissions ?? noPermissions;
  const permissionKey = [...permissions].sort().join(',');
  const can = useCallback((permission: string) => permissionKey.split(',').includes(permission), [permissionKey]);
  const [conversation, setConversation] = useState<Conversation | null>(null); const [contact, setContact] = useState<Contact | null>(null); const [tags, setTags] = useState<Tag[]>([]); const [messages, setMessages] = useState<InternalTextMessage[]>([]); const [messageCursor, setMessageCursor] = useState<string | null>(null); const messageCursors = useRef<(string | undefined)[]>([undefined]);
  const bootstrap = useRef<Promise<void>>(Promise.resolve()); const [notes, setNotes] = useState<InternalNote[]>([]); const [notesCursor, setNotesCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [detailError, setDetailError] = useState(''); const [draft, setDraft] = useState(''); const [noteDraft, setNoteDraft] = useState(''); const [actionBusy, setActionBusy] = useState(false); const [loadingOlder, setLoadingOlder] = useState(false); const [loadingMoreNotes, setLoadingMoreNotes] = useState(false); const [showDetails, setShowDetails] = useState(false);
  const contactNameRef = useRef(contact?.name);
  contactNameRef.current = contact?.name;
  const sendIntents = useRef(new Map<string, { body: string; attachment?: Attachment | null; media?: NonNullable<InternalTextMessage['media']> }>());
  const attachmentRetry = useRef<string | null>(null);
  const pendingSends = useRef(new Set<string>()); const composerBusy = useRef(false);
  const [sending, setSending] = useState(false); const [attachment, setAttachment] = useState<Attachment | null>(null);
  const scroll = useMessageScroll(messages, !loading); const sessionUserId = session?.user.id ?? '';
  const composerShortcut = useComposerShortcut(session?.user.id);
  const panel = useContextPanel(session?.user.id, !loading && Boolean(conversation));
  const contentEpoch = useRef(0);
  const readScope = useRef<string | undefined>(undefined);
  const noteCursors = useRef<(string | undefined)[]>([undefined]);
  const notesRef = useRef(notes); notesRef.current = notes;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const reads = useRef(new Set<AbortController>());
  const mounted = useRef(true);
  useEffect(() => { const requests = reads.current; mounted.current = true; return () => { mounted.current = false; requests.forEach((read) => read.abort()); }; }, []);

  useEffect(() => {
    let active = true; const controller = new AbortController(); setLoading(true); setError(''); setDetailError(''); setConversation(null); setContact(null); setMessages([]); setMessageCursor(null); messageCursors.current = [undefined]; setNotes([]); noteCursors.current = [undefined]; setNotesCursor(null); setTags([]);
    bootstrap.current = chatApi.getConversation(conversationId, controller.signal).then(async (current) => {
      if (!active) return; readScope.current = current.readScope; setConversation(current);
      const tasks = await Promise.allSettled([
        can('contacts.read') ? chatApi.getContact(current.contactId, controller.signal) : Promise.resolve(null),
        can('messages.read') ? chatApi.listMessages(conversationId, undefined, controller.signal) : Promise.resolve(null),
        can('tags.read') ? chatApi.listTags(undefined, controller.signal) : Promise.resolve(null),
        can('notes.read') ? chatApi.listNotes(conversationId, undefined, controller.signal) : Promise.resolve(null),
      ]);
      if (!active) return;
      const [contactResult, messagesResult, tagsResult, notesResult] = tasks;
      if (contactResult.status === 'fulfilled' && contactResult.value) setContact(contactResult.value);
      if (messagesResult.status === 'fulfilled' && messagesResult.value) { setMessages(mergeMessages([], messagesResult.value.items)); setMessageCursor(messagesResult.value.nextCursor); }
      if (tagsResult.status === 'fulfilled' && tagsResult.value) setTags(tagsResult.value.items);
      if (notesResult.status === 'fulfilled' && notesResult.value) { setNotes(notesResult.value.items); setNotesCursor(notesResult.value.nextCursor); }
      setLoading(false);
    }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : 'Não foi possível abrir esta conversa.'); setLoading(false); } });
    return () => { active = false; controller.abort(); contentEpoch.current += 1; };
  }, [conversationId, sessionUserId, can]);

  const refreshVisibleMessages = useCallback(async (signal?: AbortSignal, reset = false) => {
    if (!can('messages.read')) { setMessages([]); return; }
    // Rewalk contiguous pages: old cursors are not snapshots and can hide shifted boundaries.
    const pages: CursorPage<InternalTextMessage>[] = []; const cursors: (string | undefined)[] = [];
    let cursor: string | undefined;
    const requestEpoch = contentEpoch.current;
    const previousIds = new Set(messagesRef.current.map((message) => message.id));
    const count = reset ? 1 : messageCursors.current.length;
    for (let i = 0; i < count; i += 1) {
      cursors.push(cursor);
      const page = await chatApi.listMessages(conversationId, cursor, signal);
      if (signal?.aborted || !mounted.current || requestEpoch !== contentEpoch.current) return;
      pages.push(page);
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    if (signal?.aborted || !mounted.current || requestEpoch !== contentEpoch.current) return;
    // Pagination may have appended another page during this read. Keep its cursor.
    if (reset || messageCursors.current.length === count) {
      messageCursors.current = cursors;
      setMessageCursor(pages.at(-1)?.nextCursor ?? null);
    }
    const incoming = pages.flatMap((page) => page.items);
    const authorizedIds = new Set(incoming.map((message) => message.id));
    setMessages((current) => mergeMessages(reset ? [] : current.filter((message) => Boolean(readScope.current) || message.id.startsWith('optimistic:') || !previousIds.has(message.id) || authorizedIds.has(message.id)), incoming));
  }, [conversationId, can]);
  const refreshNotes = useCallback(async (signal?: AbortSignal, reset = false) => {
    if (!can('notes.read')) { setNotes([]); return; }
    const requestEpoch = contentEpoch.current, count = reset ? 1 : noteCursors.current.length;
    const previousIds = new Set(notesRef.current.map(note => note.id));
    const pages: CursorPage<InternalNote>[] = [], cursors: (string | undefined)[] = []; let cursor: string | undefined;
    for (let i = 0; i < count; i++) {
      cursors.push(cursor); const page = await chatApi.listNotes(conversationId, cursor, signal);
      if (signal?.aborted || !mounted.current || requestEpoch !== contentEpoch.current) return;
      pages.push(page); if (!page.nextCursor) break; cursor = page.nextCursor;
    }
    if (reset || noteCursors.current.length === count) { noteCursors.current = cursors; setNotesCursor(pages.at(-1)?.nextCursor ?? null); }
    const incoming = pages.flatMap(page => page.items), ids = new Set(incoming.map(note => note.id));
    setNotes(current => [...incoming, ...(reset ? [] : current.filter(note => !ids.has(note.id) && (Boolean(readScope.current) || !previousIds.has(note.id))))].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }, [conversationId, can]);
  const refreshTags = useCallback(async (signal?: AbortSignal) => {
    if (can('tags.read')) { const page = await chatApi.listTags(undefined, signal); if (!signal?.aborted && mounted.current) setTags(page.items); }
  }, [can]);

  const prepareHistoryUpdate = scroll.preparePrepend;
  useEffect(() => {
    const refreshConversation = async (signal: AbortSignal, reset: boolean) => {
      if (reset && !signal.aborted) { contentEpoch.current += 1; reads.current.forEach((read) => read.abort()); setMessages([]); setNotes([]); noteCursors.current = [undefined]; messageCursors.current = [undefined]; setMessageCursor(null); setNotesCursor(null); }
      try {
        const updated = await chatApi.getConversation(conversationId, signal);
        if (signal.aborted) return;
        if (!reset && readScope.current !== updated.readScope) {
          reset = true; contentEpoch.current += 1; reads.current.forEach(read => read.abort());
          setMessages([]); setNotes([]); messageCursors.current = [undefined]; noteCursors.current = [undefined]; setMessageCursor(null); setNotesCursor(null);
        }
        readScope.current = updated.readScope; setConversation(updated); setError('');
        if (!reset && can('contacts.read') && updated.contactName !== null && updated.contactName !== contactNameRef.current) { const currentContact = await chatApi.getContact(updated.contactId, signal); if (!signal.aborted) setContact(currentContact); }
        if (reset) {
          if (can('contacts.read')) { const currentContact = await chatApi.getContact(updated.contactId, signal); if (!signal.aborted) setContact(currentContact); }
          await refreshVisibleMessages(signal, true); await refreshNotes(signal, true);
        }
      } catch (reason) {
        if (signal.aborted) return;
        if (reason && typeof reason === 'object' && 'status' in reason && (reason.status === 403 || reason.status === 404)) {
          setConversation(null); setMessages([]); setNotes([]); setDetailError('O acesso a esta conversa foi alterado.'); navigate('/app/conversations', { replace: true });
        } else throw reason;
      }
    };
    const refreshMessage = async (id: string, signal: AbortSignal) => {
      const epoch = contentEpoch.current;
      try {
        const saved = await chatApi.getMessage(conversationId, id, signal);
        if (!signal.aborted && mounted.current && epoch === contentEpoch.current) setMessages(current => mergeMessages(current, [saved]));
      } catch (reason) {
        if (signal.aborted) return;
        // A previous Core has no point-read route. Preserve its conservative reconciliation.
        if (reason instanceof ApiError && reason.status === 404 && reason.code === 'NOT_FOUND') { await refreshVisibleMessages(signal); return; }
        if (reason instanceof ApiError && (reason.status === 403 || reason.status === 404)) {
          await refreshConversation(signal, false);
          if (!signal.aborted) setMessages(current => current.filter(message => message.id !== id));
          return;
        }
        throw reason;
      }
    };
    return realtimeBus.subscribe(async (event, signal) => {
      if (!chatEventTypes.has(event.type) || event.organizationId !== session?.currentOrganizationId) return;
      await bootstrap.current;
      if (signal.aborted) return;
      if (event.type.startsWith('tag.')) { await refreshTags(signal); return; }
      if (event.type === 'contacts.updated') { await refreshConversation(signal, false); return; }
      const related = event.type.startsWith('conversation.') && !event.type.startsWith('conversation.tag.') ? event.entityId : event.payload.conversationId;
      if (related !== conversationId) return;
      if (event.type === 'conversation.history.updated') { prepareHistoryUpdate(); await refreshConversation(signal, false); await refreshVisibleMessages(signal); return; }
      if (event.type.startsWith('message.')) { await refreshMessage(event.entityId, signal); return; }
      if (event.type === 'note.created') { await refreshNotes(signal); return; }
      await refreshConversation(signal, event.type === 'conversation.transferred' || event.type === 'conversation.assigned');
    }, { organizationId: session?.currentOrganizationId ?? undefined, reconcile: async (signal) => {
      await bootstrap.current;
      if (!signal.aborted) { contentEpoch.current += 1; await refreshConversation(signal, false); await refreshVisibleMessages(signal); await refreshNotes(signal); await refreshTags(signal);
        // Bounded recovery of visible unconfirmed rows, once per focus/reconnect (no polling).
        const root = scroll.historyRef.current, viewport = root?.getBoundingClientRect();
        if (readScope.current && root && viewport && viewport.height > 0) {
          const visible = new Set([...root.querySelectorAll<HTMLElement>('[data-message-key]')].filter(node => { const rect = node.getBoundingClientRect(); return rect.bottom > viewport.top && rect.top < viewport.bottom; }).map(node => node.dataset.messageKey));
          for (const message of messagesRef.current.filter(message => message.status === 'PENDING' && !message.id.startsWith('optimistic:') && visible.has(messageScrollKey(message))).slice(0, 8)) { if (signal.aborted) break; await refreshMessage(message.id, signal); }
        }
      }
    } });
  }, [conversationId, session?.currentOrganizationId, navigate, refreshVisibleMessages, refreshNotes, refreshTags, can, prepareHistoryUpdate, scroll.historyRef]);

  async function loadOlderMessages() {
    if (!messageCursor || loadingOlder) return;
    const requestEpoch = contentEpoch.current;
    const controller = new AbortController(); reads.current.add(controller);
    const cursor = messageCursor;
    setLoadingOlder(true);
    try { const page = await chatApi.listMessages(conversationId, cursor, controller.signal); if (!mounted.current || requestEpoch !== contentEpoch.current) return; scroll.preparePrepend(); setMessages((current) => mergeMessages(page.items, current)); setMessageCursor(page.nextCursor); messageCursors.current = [...messageCursors.current, cursor]; }
    catch (reason) { if (!controller.signal.aborted && requestEpoch === contentEpoch.current) setDetailError(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico.'); }
    finally { reads.current.delete(controller); if (mounted.current) setLoadingOlder(false); }
  }
  async function submitMessage(body: string, retryClientMessageId?: string, selectedAttachment?: Attachment | null) {
    const failedMessage = retryClientMessageId ? messagesRef.current.find(message => message.clientMessageId === retryClientMessageId) : undefined;
    const previousIntent = retryClientMessageId ? sendIntents.current.get(retryClientMessageId) : undefined;
    selectedAttachment = selectedAttachment ?? previousIntent?.attachment;
    body = previousIntent?.body ?? body;
    if ((!body.trim() && !selectedAttachment && !failedMessage?.media) || body.length > 8000 || !can('messages.send') || conversation?.outboundEnabled === false || conversation?.status === 'ARCHIVED') return;
    const clientMessageId = retryClientMessageId ?? createClientMessageId();
    if (pendingSends.current.has(clientMessageId) || (retryClientMessageId && (failedMessage?.status !== 'FAILED' || failedMessage.deliveryOutcome === 'UNKNOWN'))) return;
    pendingSends.current.add(clientMessageId);
    const intent = previousIntent ?? { body, attachment: selectedAttachment }; sendIntents.current.set(clientMessageId, intent);
    if (selectedAttachment) attachmentRetry.current = clientMessageId;
    const optimistic = failedMessage ? { ...failedMessage, status: 'PENDING' as const, updatedAt: new Date().toISOString() } : createOptimisticMessage(conversationId, sessionUserId, body.trim(), clientMessageId, session?.user.name);
    setDetailError(''); setMessages((current) => mergeMessages(current, [optimistic]));
    const text = conversation?.provider === 'WHATSAPP_WEB' ? body : body.trim();
    const controller = new AbortController(); reads.current.add(controller); let intentSubmitted = false;
    try {
      const media = intent.media ?? (selectedAttachment ? await chatApi.uploadMedia(conversationId, selectedAttachment.file, selectedAttachment.type, controller.signal) : failedMessage?.media ?? undefined);
      if (media) intent.media = media;
      if (!mounted.current || controller.signal.aborted) return;
      intentSubmitted = true;
      const saved = await chatApi.sendMessage(conversationId, { body: text, clientMessageId, ...(media ? { mediaId: media.mediaId } : {}) });
      if (mounted.current) { setMessages(current => mergeMessages(current, [saved])); if (selectedAttachment) { setAttachment(null); attachmentRetry.current = null; } sendIntents.current.delete(clientMessageId); }
    }
    catch (reason) { if (!mounted.current) return;
      const rejectedBeforeCommit = reason instanceof ApiError && [400, 401, 403, 404, 409, 413, 415, 422, 429].includes(reason.status);
      const uncertain = conversation?.provider === 'WHATSAPP_WEB' && intentSubmitted && !rejectedBeforeCommit;
      setMessages((current) => current.map((message) => message.clientMessageId === clientMessageId && !['SENT', 'DELIVERED', 'READ'].includes(message.status) ? uncertain ? { ...message, status: 'PENDING', deliveryOutcome: 'UNKNOWN' } : { ...message, status: 'FAILED', deliveryOutcome: 'NOT_SENT' } : message)); const code = reason instanceof ApiError && reason.code && /^[A-Z][A-Z0-9_]{0,79}$/.test(reason.code) ? reason.code : 'CONNECTION_FAILED';
      setDetailError(uncertain ? `Não foi possível confirmar o registro da mensagem (${code}). Aguarde a confirmação; a mensagem não será reenviada automaticamente.` : selectedAttachment ? `Falha ${intentSubmitted ? 'ao registrar a mensagem' : 'no upload da mídia'} (${code}). O anexo foi preservado. Tente novamente.` : `Não foi possível enviar a mensagem (${code}). Tente novamente.`);
      if (!uncertain && body) setDraft(current => current || body); }
    finally { reads.current.delete(controller); pendingSends.current.delete(clientMessageId); }
  }
  useEffect(() => {
    const clientId = attachmentRetry.current;
    if (!clientId) return;
    const intent = sendIntents.current.get(clientId);
    if (messages.some(message => message.clientMessageId === clientId && !message.id.startsWith('optimistic:') && ['SENT', 'DELIVERED', 'READ'].includes(message.status))) {
      setAttachment(current => current?.file === intent?.attachment?.file ? null : current);
      attachmentRetry.current = null; sendIntents.current.delete(clientId);
    }
  }, [messages]);
  function sendDraft() {
    if (composerBusy.current || (!draft.trim() && !attachment) || draft.length > 8000 || conversation?.status === 'ARCHIVED' || !can('messages.send') || conversation?.outboundEnabled === false) return;
    composerBusy.current = true; setSending(true); const body = draft; setDraft('');
    const retryId = attachmentRetry.current;
    const retryMessage = retryId ? messagesRef.current.find(message => message.clientMessageId === retryId) : undefined;
    const oldIntent = retryId ? sendIntents.current.get(retryId) : undefined;
    if (retryId && oldIntent?.attachment?.file === attachment?.file && retryMessage?.deliveryOutcome === 'UNKNOWN') {
      composerBusy.current = false; setSending(false);
      setDetailError('Resultado do registro incerto. Aguarde confirmação ou use Verificar envio. A gravação permanece disponível.'); return;
    }
    void submitMessage(body, retryId && oldIntent?.attachment?.file === attachment?.file ? retryId : undefined, attachment).finally(() => { composerBusy.current = false; setSending(false); });
  }
  async function verifyUncertainSend(clientMessageId: string) {
    const controller = new AbortController(); reads.current.add(controller);
    try {
      const page = await chatApi.listMessages(conversationId, undefined, controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      setMessages(current => mergeMessages(current, page.items));
      const confirmed = page.items.find(message => message.clientMessageId === clientMessageId);
      if (confirmed) { setAttachment(null); attachmentRetry.current = null; sendIntents.current.delete(clientMessageId); setDetailError(''); }
      else setDetailError('O Core ainda não confirmou o registro. A gravação foi preservada e não será reenviada automaticamente.');
    } catch { if (!controller.signal.aborted) setDetailError('Não foi possível verificar o envio. Tente verificar novamente.'); }
    finally { reads.current.delete(controller); }
  }
  function submitComposer(event: FormEvent<HTMLFormElement>) { event.preventDefault(); sendDraft(); }
  async function submitNote(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const body = noteDraft.trim(); if (!body || !can('notes.create')) return; setActionBusy(true); setDetailError(''); try { const created = await chatApi.createNote(conversationId, body); setNotes((current) => [...current, created]); setNoteDraft(''); } catch (reason) { setDetailError(reason instanceof Error ? reason.message : 'Não foi possível criar a nota.'); } finally { setActionBusy(false); } }
  async function removeTag(tagId: string) { setActionBusy(true); setDetailError(''); try { await chatApi.removeTag(conversationId, tagId); setConversation((current) => current ? { ...current, tagIds: current.tagIds.filter((id) => id !== tagId) } : current); } catch (reason) { setDetailError(reason instanceof Error ? reason.message : 'Não foi possível remover a tag.'); } finally { setActionBusy(false); } }
  async function loadMoreNotes() {
    if (!notesCursor || loadingMoreNotes) return;
    const requestEpoch = contentEpoch.current; const controller = new AbortController(); reads.current.add(controller);
    setLoadingMoreNotes(true);
    try { const page = await chatApi.listNotes(conversationId, notesCursor, controller.signal); if (controller.signal.aborted || !mounted.current || requestEpoch !== contentEpoch.current) return; setNotes((current) => [...page.items, ...current]); setNotesCursor(page.nextCursor); noteCursors.current = [...noteCursors.current, notesCursor]; }
    catch (reason) { if (!controller.signal.aborted && requestEpoch === contentEpoch.current) setDetailError(reason instanceof Error ? reason.message : 'Não foi possível carregar mais notas.'); }
    finally { reads.current.delete(controller); if (mounted.current) setLoadingMoreNotes(false); }
  }

  if (loading) return <div className="detail-state" role="status"><span className="spinner" />Abrindo conversa…</div>;
  if (error || !conversation) return <div className="detail-state error-state" role="alert"><p>{detailError || error || 'Conversa indisponível.'}</p><Link to="/app/conversations">Voltar para conversas</Link></div>;
  const canSeeMessages = can('messages.read'); const contactName = contact?.name ?? `Contato ${conversation.contactId.slice(0, 8)}`;
  const appliedTags = conversation.tagIds.map((id) => tags.find((tag) => tag.id === id) ?? { id, name: id.slice(0, 8) });
  return <div className="conversation-detail">
    {['created', 'reused'].includes(location.state?.conversationCreation) && <p className="conversation-creation-notice" role="status">{conversation.provider === 'WHATSAPP_WEB' ? location.state.conversationCreation === 'reused' ? 'Conversa do WhatsApp existente aberta.' : 'Conversa do WhatsApp criada. Nenhuma mensagem foi enviada.' : location.state.conversationCreation === 'reused' ? 'Conversa interna existente aberta.' : 'Conversa interna criada. Ela está no filtro Não atribuídas até receber uma atribuição.'}</p>}<header className="conversation-header"><Link className="mobile-back" to="/app/conversations" aria-label="Voltar para conversas">‹</Link><span className="contact-avatar large">{contactName.slice(0, 1).toUpperCase()}</span><div className="conversation-title"><h1>{contactName}</h1><small>{(contact ? contact.displayIdentifier ?? contactIdentifier(contact.primaryIdentifier) : undefined) ?? `ID ${conversation.contactId}`}</small></div><span className={`status-badge status-${conversation.status.toLowerCase()}`}>{conversation.status === 'ARCHIVED' ? 'Arquivada' : conversation.status === 'PENDING' ? 'Pendente' : 'Aberta'}</span><button type="button" className={`mobile-details-button${!panel.inline ? ' details-toggle-visible' : ''}`} onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails}>Detalhes</button></header>
    <div ref={panel.bodyRef} className={`conversation-detail-body ${panel.inline ? 'context-inline' : 'context-stacked'}`} style={{ '--context-width': `${panel.width}px` } as CSSProperties}><section className="message-column">
      {detailError && <p className="inline-error" role="alert">{detailError}</p>}
      {!canSeeMessages ? <div className="detail-state">Seu contexto não tem permissão para ler mensagens.</div> : <div className="message-history" ref={scroll.historyRef} onScroll={scroll.onScroll} role="region" tabIndex={0} aria-label="Histórico de mensagens"><div className="message-history-content" ref={scroll.contentRef}>
        {messageCursor && <button type="button" className="load-older-button" disabled={loadingOlder} onClick={() => void loadOlderMessages()}>{loadingOlder ? 'Carregando…' : 'Carregar mensagens anteriores'}</button>}
        {messages.length === 0 ? <div className="message-empty">Ainda não há mensagens nesta conversa.</div> : messages.map((message) => <article key={messageScrollKey(message)} data-message-key={messageScrollKey(message)} className={`message-bubble${message.senderUserId === sessionUserId || message.direction === 'OUTBOUND' ? ' own-message' : ''}`}>
          {(message.direction === 'INBOUND' ? message.senderName ?? conversation.contactName : message.senderUserId ? message.senderName : null) && <strong className="message-author">{message.direction === 'INBOUND' ? message.senderName ?? conversation.contactName : message.senderName}</strong>}<p>{message.body ? <FormattedMessage body={message.body} /> : message.body}</p>{message.type !== 'TEXT' && <MessageMedia message={message} />}<footer><time>{new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><span>{message.direction === 'INBOUND' ? 'Recebida' : message.deliveryOutcome === 'UNKNOWN' ? 'Resultado incerto — aguardando confirmação' : messageStatusLabel[message.status]}</span>{message.deliveryOutcome === 'UNKNOWN' && message.clientMessageId && <button type="button" className="retry-button" onClick={() => void verifyUncertainSend(message.clientMessageId!)}>Verificar envio</button>}{message.status === 'FAILED' && message.deliveryOutcome !== 'UNKNOWN' && message.clientMessageId && <button type="button" className="retry-button" onClick={() => void submitMessage(message.body ?? '', message.clientMessageId!)}>Tentar novamente</button>}</footer>
        </article>)}
      </div></div>}
      {scroll.unreadCount > 0 && <div className="new-messages-indicator"><span role="status" aria-live="polite">{scroll.unreadCount === 1 ? 'Nova mensagem' : `${scroll.unreadCount} novas mensagens`}</span><button type="button" className="text-button" onClick={() => { scroll.scrollToBottom(); scroll.historyRef.current?.focus({ preventScroll: true }); }}>Ir para o final</button></div>}
      {can('messages.send') && conversation.outboundEnabled !== false && <form className="message-composer" onSubmit={submitComposer}><textarea aria-label="Escrever mensagem" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => composerShortcut.onKeyDown(event, sendDraft)} placeholder={conversation.status === 'ARCHIVED' ? 'Reabra a conversa para enviar mensagens' : 'Escreva uma mensagem…'} disabled={conversation.status === 'ARCHIVED'} maxLength={8000} /><div className="composer-footer">{conversation.mediaEnabled && <MediaComposer attachment={attachment} onChange={setAttachment} disabled={sending || conversation.status === 'ARCHIVED'} />}<ComposerTools mediaEnabled={conversation.mediaEnabled} /><div className="composer-send-controls"><button className="primary-button" disabled={sending || (!draft.trim() && !attachment) || conversation.status === 'ARCHIVED'} aria-label="Enviar mensagem">{sending ? 'Enviando…' : 'Enviar'}</button><SendPreference value={composerShortcut.shortcut} onChange={composerShortcut.setShortcut} /></div></div></form>}
      {conversation.outboundEnabled === false && <p className="provider-warning" role="status">Envio indisponível nesta conversa. O histórico autorizado permanece acessível.</p>}
    </section>{panel.inline && <ContextSeparator panel={panel} />}<aside id={panel.contextId} className={`conversation-context${showDetails ? ' context-open' : ''}`} aria-label="Detalhes da conversa">
      {panel.inline && <button type="button" className="context-reset text-button" onClick={panel.restore}><Icon name="restore" />Restaurar largura padrão</button>}
      <div className="context-section"><h2>Contato</h2><strong>{contactName}</strong><span>{(contact ? contact.displayIdentifier ?? contactIdentifier(contact.primaryIdentifier) : undefined) ?? conversation.contactId}</span></div>
      <div className="context-section"><h2>Responsável</h2><span>{conversation.assignedUserId ? conversation.assignedUserId === sessionUserId ? `${session?.user.name} (você)` : conversation.assignedUserId : 'Não atribuída'}</span></div>
      {can('tags.read') && <div className="context-section"><h2>Tags</h2>{appliedTags.length ? <ul className="applied-tags">{appliedTags.map((tag) => <li key={tag.id}><span>{tag.name}</span>{can('tags.manage') && <button type="button" aria-label={`Remover tag ${tag.name}`} disabled={actionBusy} onClick={() => void removeTag(tag.id)}>×</button>}</li>)}</ul> : <span className="muted">Sem tags</span>}</div>}
      <ConversationActions conversation={conversation} tags={tags} userId={sessionUserId} permissions={permissions} onConversationUpdate={setConversation} onTagsUpdate={() => void chatApi.listTags().then((page) => setTags(page.items)).catch(() => undefined)} />
      {can('notes.read') && <section className="context-section notes-section"><h2>Notas internas</h2><div className="notes-list">{notes.length ? notes.map((note) => <article className="note-item" key={note.id}><p>{note.body}</p><small>{note.authorUserId === sessionUserId ? 'Você' : note.authorUserId.slice(0, 8)} · {new Date(note.createdAt).toLocaleDateString('pt-BR')}</small></article>) : <span className="muted">Nenhuma nota interna.</span>}</div>{notesCursor && <button type="button" className="text-button" disabled={loadingMoreNotes} onClick={() => void loadMoreNotes()}>{loadingMoreNotes ? 'Carregando…' : 'Carregar notas anteriores'}</button>}{can('notes.create') && <form className="note-composer" onSubmit={submitNote}><textarea aria-label="Nova nota interna" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} maxLength={8000} placeholder="Adicionar nota interna…" /><button className="secondary-button" disabled={actionBusy || !noteDraft.trim()}>Adicionar nota</button></form>}</section>}
    </aside></div>
  </div>;
}
