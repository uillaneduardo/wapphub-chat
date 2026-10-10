import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, Outlet, useMatch, useNavigate, useParams, useLocation } from 'react-router-dom';
import { FormattedMessage } from '../../components/FormattedMessage';
import { useSession } from '../session/SessionContext';
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
  const permissions = session?.permissions ?? noPermissions; const can = useCallback((permission: string) => permissions.includes(permission), [permissions]);
  const [conversation, setConversation] = useState<Conversation | null>(null); const [contact, setContact] = useState<Contact | null>(null); const [tags, setTags] = useState<Tag[]>([]); const [messages, setMessages] = useState<InternalTextMessage[]>([]); const [messageCursor, setMessageCursor] = useState<string | null>(null); const messageCursors = useRef<(string | undefined)[]>([undefined]);
  const bootstrap = useRef<Promise<void>>(Promise.resolve()); const [notes, setNotes] = useState<InternalNote[]>([]); const [notesCursor, setNotesCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [detailError, setDetailError] = useState(''); const [draft, setDraft] = useState(''); const [noteDraft, setNoteDraft] = useState(''); const [actionBusy, setActionBusy] = useState(false); const [loadingOlder, setLoadingOlder] = useState(false); const [loadingMoreNotes, setLoadingMoreNotes] = useState(false); const [showDetails, setShowDetails] = useState(false);
  const contactNameRef = useRef(contact?.name);
  contactNameRef.current = contact?.name;
  const pendingSends = useRef(new Set<string>()); const composerBusy = useRef(false);
  const [sending, setSending] = useState(false);
  const scroll = useMessageScroll(messages, !loading); const sessionUserId = session?.user.id ?? '';
  const composerShortcut = useComposerShortcut(session?.user.id);
  const panel = useContextPanel(session?.user.id, !loading && Boolean(conversation));
  const contentEpoch = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const reads = useRef(new Set<AbortController>());
  const mounted = useRef(true);
  useEffect(() => { const requests = reads.current; mounted.current = true; return () => { mounted.current = false; requests.forEach((read) => read.abort()); }; }, []);

  useEffect(() => {
    let active = true; const controller = new AbortController(); setLoading(true); setError(''); setDetailError(''); setConversation(null); setContact(null); setMessages([]); setMessageCursor(null); messageCursors.current = [undefined]; setNotes([]); setNotesCursor(null); setTags([]);
    bootstrap.current = chatApi.getConversation(conversationId, controller.signal).then(async (current) => {
      if (!active) return; setConversation(current);
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
    messageCursors.current = cursors;
    setMessageCursor(pages.at(-1)?.nextCursor ?? null);
    const incoming = pages.flatMap((page) => page.items);
    const authorizedIds = new Set(incoming.map((message) => message.id));
    setMessages((current) => mergeMessages(reset ? [] : current.filter((message) => message.id.startsWith('optimistic:') || !previousIds.has(message.id) || authorizedIds.has(message.id)), incoming));
  }, [conversationId, can]);
  const refreshNotes = useCallback(async (signal?: AbortSignal, reset = false) => {
    if (!can('notes.read')) { setNotes([]); return; }
    const requestEpoch = contentEpoch.current;
    const page = await chatApi.listNotes(conversationId, undefined, signal);
    if (signal?.aborted || !mounted.current || requestEpoch !== contentEpoch.current) return;
    setNotes((current) => [...page.items, ...(reset ? [] : current.filter((note) => !page.items.some((incoming) => incoming.id === note.id)))].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    setNotesCursor(page.nextCursor);
  }, [conversationId, can]);
  const refreshTags = useCallback(async (signal?: AbortSignal) => {
    if (can('tags.read')) { const page = await chatApi.listTags(undefined, signal); if (!signal?.aborted && mounted.current) setTags(page.items); }
  }, [can]);

  const prepareHistoryUpdate = scroll.preparePrepend;
  useEffect(() => {
    const refreshConversation = async (signal: AbortSignal, reset: boolean) => {
      if (reset && !signal.aborted) { contentEpoch.current += 1; reads.current.forEach((read) => read.abort()); setMessages([]); setNotes([]); messageCursors.current = [undefined]; setMessageCursor(null); setNotesCursor(null); }
      try {
        const updated = await chatApi.getConversation(conversationId, signal);
        if (signal.aborted) return;
        setConversation(updated); setError('');
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
    return realtimeBus.subscribe(async (event, signal) => {
      if (!chatEventTypes.has(event.type) || event.organizationId !== session?.currentOrganizationId) return;
      await bootstrap.current;
      if (signal.aborted) return;
      if (event.type.startsWith('tag.')) { await refreshTags(signal); return; }
      if (event.type === 'contacts.updated') { await refreshConversation(signal, false); return; }
      const related = event.type.startsWith('conversation.') && !event.type.startsWith('conversation.tag.') ? event.entityId : event.payload.conversationId;
      if (related !== conversationId) return;
      if (event.type === 'conversation.history.updated') { prepareHistoryUpdate(); await refreshVisibleMessages(signal); await refreshConversation(signal, false); return; }
      if (event.type.startsWith('message.')) { await refreshVisibleMessages(signal); return; }
      if (event.type === 'note.created') { await refreshNotes(signal); return; }
      await refreshConversation(signal, event.type === 'conversation.transferred' || event.type === 'conversation.assigned');
    }, { organizationId: session?.currentOrganizationId ?? undefined, reconcile: async (signal) => {
      await bootstrap.current;
      if (!signal.aborted) { await refreshConversation(signal, true); await refreshTags(signal); }
    } });
  }, [conversationId, session?.currentOrganizationId, navigate, refreshVisibleMessages, refreshNotes, refreshTags, can, prepareHistoryUpdate]);

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
  async function submitMessage(body: string, retryClientMessageId?: string) {
    if (!body.trim() || body.trim().length > 8000 || !can('messages.send') || conversation?.outboundEnabled === false || conversation?.status === 'ARCHIVED') return;
    const clientMessageId = retryClientMessageId ?? createClientMessageId();
    const failedMessage = retryClientMessageId ? messages.find((message) => message.clientMessageId === retryClientMessageId) : undefined;
    if (pendingSends.current.has(clientMessageId) || (retryClientMessageId && failedMessage?.status !== 'FAILED')) return;
    pendingSends.current.add(clientMessageId);
    const optimistic = failedMessage ? { ...failedMessage, status: 'PENDING' as const, updatedAt: new Date().toISOString() } : createOptimisticMessage(conversationId, sessionUserId, body.trim(), clientMessageId, session?.user.name);
    setDetailError(''); setMessages((current) => mergeMessages(current, [optimistic]));
    try { const saved = await chatApi.sendMessage(conversationId, { body: body.trim(), clientMessageId }); setMessages((current) => mergeMessages(current, [saved])); }
    catch (reason) { setMessages((current) => current.map((message) => message.clientMessageId === clientMessageId ? { ...message, status: 'FAILED' } : message)); setDetailError(reason instanceof Error ? reason.message : 'Mensagem não enviada. Tente novamente.'); }
    finally { pendingSends.current.delete(clientMessageId); }
  }
  function sendDraft() {
    if (composerBusy.current || !draft.trim() || draft.length > 8000 || conversation?.status === 'ARCHIVED' || !can('messages.send') || conversation?.outboundEnabled === false) return;
    composerBusy.current = true; setSending(true); const body = draft; setDraft('');
    void submitMessage(body).finally(() => { composerBusy.current = false; setSending(false); });
  }
  function submitComposer(event: FormEvent<HTMLFormElement>) { event.preventDefault(); sendDraft(); }
  async function submitNote(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const body = noteDraft.trim(); if (!body || !can('notes.create')) return; setActionBusy(true); setDetailError(''); try { const created = await chatApi.createNote(conversationId, body); setNotes((current) => [...current, created]); setNoteDraft(''); } catch (reason) { setDetailError(reason instanceof Error ? reason.message : 'Não foi possível criar a nota.'); } finally { setActionBusy(false); } }
  async function removeTag(tagId: string) { setActionBusy(true); setDetailError(''); try { await chatApi.removeTag(conversationId, tagId); setConversation((current) => current ? { ...current, tagIds: current.tagIds.filter((id) => id !== tagId) } : current); } catch (reason) { setDetailError(reason instanceof Error ? reason.message : 'Não foi possível remover a tag.'); } finally { setActionBusy(false); } }
  async function loadMoreNotes() {
    if (!notesCursor || loadingMoreNotes) return;
    const requestEpoch = contentEpoch.current; const controller = new AbortController(); reads.current.add(controller);
    setLoadingMoreNotes(true);
    try { const page = await chatApi.listNotes(conversationId, notesCursor, controller.signal); if (controller.signal.aborted || !mounted.current || requestEpoch !== contentEpoch.current) return; setNotes((current) => [...page.items, ...current]); setNotesCursor(page.nextCursor); }
    catch (reason) { if (!controller.signal.aborted && requestEpoch === contentEpoch.current) setDetailError(reason instanceof Error ? reason.message : 'Não foi possível carregar mais notas.'); }
    finally { reads.current.delete(controller); if (mounted.current) setLoadingMoreNotes(false); }
  }

  if (loading) return <div className="detail-state" role="status"><span className="spinner" />Abrindo conversa…</div>;
  if (error || !conversation) return <div className="detail-state error-state" role="alert"><p>{detailError || error || 'Conversa indisponível.'}</p><Link to="/app/conversations">Voltar para conversas</Link></div>;
  const canSeeMessages = can('messages.read'); const contactName = contact?.name ?? `Contato ${conversation.contactId.slice(0, 8)}`;
  const appliedTags = conversation.tagIds.map((id) => tags.find((tag) => tag.id === id) ?? { id, name: id.slice(0, 8) });
  return <div className="conversation-detail">
    {['created', 'reused'].includes(location.state?.conversationCreation) && <p className="conversation-creation-notice" role="status">{location.state.conversationCreation === 'reused' ? 'Conversa interna existente aberta.' : 'Conversa interna criada. Ela está no filtro Não atribuídas até receber uma atribuição.'}</p>}<header className="conversation-header"><Link className="mobile-back" to="/app/conversations" aria-label="Voltar para conversas">‹</Link><span className="contact-avatar large">{contactName.slice(0, 1).toUpperCase()}</span><div className="conversation-title"><h1>{contactName}</h1><small>{(contact ? contactIdentifier(contact.primaryIdentifier) : undefined) ?? `ID ${conversation.contactId}`}</small></div><span className={`status-badge status-${conversation.status.toLowerCase()}`}>{conversation.status === 'ARCHIVED' ? 'Arquivada' : conversation.status === 'PENDING' ? 'Pendente' : 'Aberta'}</span><button type="button" className={`mobile-details-button${!panel.inline ? ' details-toggle-visible' : ''}`} onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails}>Detalhes</button></header>
    <div ref={panel.bodyRef} className={`conversation-detail-body ${panel.inline ? 'context-inline' : 'context-stacked'}`} style={{ '--context-width': `${panel.width}px` } as CSSProperties}><section className="message-column">
      {detailError && <p className="inline-error" role="alert">{detailError}</p>}
      {!canSeeMessages ? <div className="detail-state">Seu contexto não tem permissão para ler mensagens.</div> : <div className="message-history" ref={scroll.historyRef} onScroll={scroll.onScroll} role="region" tabIndex={0} aria-label="Histórico de mensagens"><div className="message-history-content" ref={scroll.contentRef}>
        {messageCursor && <button type="button" className="load-older-button" disabled={loadingOlder} onClick={() => void loadOlderMessages()}>{loadingOlder ? 'Carregando…' : 'Carregar mensagens anteriores'}</button>}
        {messages.length === 0 ? <div className="message-empty">Ainda não há mensagens nesta conversa.</div> : messages.map((message) => <article key={messageScrollKey(message)} data-message-key={messageScrollKey(message)} className={`message-bubble${message.senderUserId === sessionUserId || message.direction === 'OUTBOUND' ? ' own-message' : ''}`}>
          {(message.direction === 'INBOUND' ? message.senderName ?? conversation.contactName : message.senderUserId ? message.senderName : null) && <strong className="message-author">{message.direction === 'INBOUND' ? message.senderName ?? conversation.contactName : message.senderName}</strong>}<p>{message.body ? <FormattedMessage body={message.body} /> : message.body}</p>{message.type !== 'TEXT' && <p className="muted">{message.media?.fileName ?? message.type} — download de mídia indisponível</p>}<footer><time>{new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><span>{message.direction === 'INBOUND' ? 'Recebida' : messageStatusLabel[message.status]}</span>{message.status === 'FAILED' && message.clientMessageId && <button type="button" className="retry-button" onClick={() => void submitMessage(message.body ?? '', message.clientMessageId!)}>Tentar novamente</button>}</footer>
        </article>)}
      </div></div>}
      {scroll.unreadCount > 0 && <div className="new-messages-indicator"><span role="status" aria-live="polite">{scroll.unreadCount === 1 ? 'Nova mensagem' : `${scroll.unreadCount} novas mensagens`}</span><button type="button" className="text-button" onClick={() => { scroll.scrollToBottom(); scroll.historyRef.current?.focus({ preventScroll: true }); }}>Ir para o final</button></div>}
      {can('messages.send') && conversation.outboundEnabled !== false && <form className="message-composer" onSubmit={submitComposer}><textarea aria-label="Escrever mensagem" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => composerShortcut.onKeyDown(event, sendDraft)} placeholder={conversation.status === 'ARCHIVED' ? 'Reabra a conversa para enviar mensagens' : 'Escreva uma mensagem…'} disabled={conversation.status === 'ARCHIVED'} maxLength={8000} /><div className="composer-footer"><ComposerTools /><div className="composer-send-controls"><button className="primary-button" disabled={sending || !draft.trim() || conversation.status === 'ARCHIVED'} aria-label="Enviar mensagem">{sending ? 'Enviando…' : 'Enviar'}</button><SendPreference value={composerShortcut.shortcut} onChange={composerShortcut.setShortcut} /></div></div></form>}
      {conversation.outboundEnabled === false && <p className="provider-warning" role="status">Envio indisponível nesta conversa. O histórico autorizado permanece acessível.</p>}
    </section>{panel.inline && <ContextSeparator panel={panel} />}<aside id={panel.contextId} className={`conversation-context${showDetails ? ' context-open' : ''}`} aria-label="Detalhes da conversa">
      {panel.inline && <button type="button" className="context-reset text-button" onClick={panel.restore}><Icon name="restore" />Restaurar largura padrão</button>}
      <div className="context-section"><h2>Contato</h2><strong>{contactName}</strong><span>{(contact ? contactIdentifier(contact.primaryIdentifier) : undefined) ?? conversation.contactId}</span></div>
      <div className="context-section"><h2>Responsável</h2><span>{conversation.assignedUserId ? conversation.assignedUserId === sessionUserId ? `${session?.user.name} (você)` : conversation.assignedUserId : 'Não atribuída'}</span></div>
      {can('tags.read') && <div className="context-section"><h2>Tags</h2>{appliedTags.length ? <ul className="applied-tags">{appliedTags.map((tag) => <li key={tag.id}><span>{tag.name}</span>{can('tags.manage') && <button type="button" aria-label={`Remover tag ${tag.name}`} disabled={actionBusy} onClick={() => void removeTag(tag.id)}>×</button>}</li>)}</ul> : <span className="muted">Sem tags</span>}</div>}
      <ConversationActions conversation={conversation} tags={tags} userId={sessionUserId} permissions={permissions} onConversationUpdate={setConversation} onTagsUpdate={() => void chatApi.listTags().then((page) => setTags(page.items)).catch(() => undefined)} />
      {can('notes.read') && <section className="context-section notes-section"><h2>Notas internas</h2><div className="notes-list">{notes.length ? notes.map((note) => <article className="note-item" key={note.id}><p>{note.body}</p><small>{note.authorUserId === sessionUserId ? 'Você' : note.authorUserId.slice(0, 8)} · {new Date(note.createdAt).toLocaleDateString('pt-BR')}</small></article>) : <span className="muted">Nenhuma nota interna.</span>}</div>{notesCursor && <button type="button" className="text-button" disabled={loadingMoreNotes} onClick={() => void loadMoreNotes()}>{loadingMoreNotes ? 'Carregando…' : 'Carregar notas anteriores'}</button>}{can('notes.create') && <form className="note-composer" onSubmit={submitNote}><textarea aria-label="Nova nota interna" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} maxLength={8000} placeholder="Adicionar nota interna…" /><button className="secondary-button" disabled={actionBusy || !noteDraft.trim()}>Adicionar nota</button></form>}</section>}
    </aside></div>
  </div>;
}
