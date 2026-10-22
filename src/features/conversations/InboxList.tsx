import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useMatch, useSearchParams } from 'react-router-dom';
import { useSession } from '../session/SessionContext';
import { chatApi, type ConversationScope } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Conversation, Tag } from '../../types/chat';
import { upsertInboxConversation } from './conversationModel';
import { Search, Plus } from 'lucide-react';
import { ContactAvatar } from '../../components/ui/avatar';

type InboxTab = ConversationScope | 'archived';
const tabs: { id: InboxTab; label: string }[] = [{ id: 'mine', label: 'Minhas' }, { id: 'unassigned', label: 'Não atribuídas' }, { id: 'all', label: 'Todas' }, { id: 'archived', label: 'Arquivadas' }];
const conversationEvents = new Set(['conversation.history.updated', 'contacts.updated', 'conversation.created', 'conversation.updated', 'conversation.archived', 'conversation.assigned', 'conversation.transferred', 'message.created', 'message.updated', 'note.created', 'conversation.tag.added', 'conversation.tag.removed']);

export function InboxList() {
  const { session } = useSession();
  const bootstrap = useRef<Promise<void>>(Promise.resolve());
  const tagBootstrap = useRef<Promise<void>>(Promise.resolve());
  const epoch = useRef(0);
  const pagination = useRef<AbortController | null>(null);
  const organizationId = session?.currentOrganizationId;
  const userId = session?.user.id ?? '';
  const isAgent = session?.membership?.role === 'AGENT';
  const canSupervise = !isAgent && (session?.permissions.includes('conversations.supervise') ?? false);
  const canReadMessages = session?.permissions.includes('messages.read') ?? false;
  const canReadTags = session?.permissions.includes('tags.read') ?? false;
  const [searchParams, setSearchParams] = useSearchParams(); const requestedScope = searchParams.get('scope');
  const tab: InboxTab = isAgent ? (requestedScope === 'archived' ? 'archived' : 'mine') : requestedScope === 'mine' || requestedScope === 'unassigned' || requestedScope === 'archived' || requestedScope === 'all' && canSupervise ? requestedScope : canSupervise ? 'all' : 'unassigned';
  const setTab = (scope: InboxTab) => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('scope', scope); return next; }, { replace: true });
  const [tagId, setTagId] = useState('');
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<Conversation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const selected = useMatch('/app/conversations/:conversationId');
  const filter = useMemo(() => ({ scope: tab === 'archived' ? (canSupervise ? 'all' : 'mine') as ConversationScope : tab, archived: tab === 'archived', ...(tagId ? { tagId } : {}) }), [tab, canSupervise, tagId]);
  const query = useMemo(() => ({ ...filter, limit: 50 }), [filter]);
  const visibleItems = useMemo(() => {
    const text = search.trim().toLocaleLowerCase('pt-BR');
    if (!text) return items;
    return items.filter((item) => [item.contactName ?? '', item.contactId, ...(canReadMessages ? [item.lastMessagePreview ?? ''] : [])].some((value) => value.toLocaleLowerCase('pt-BR').includes(text)));
  }, [search, items, canReadMessages]);

  useEffect(() => {
    let active = true; const controller = new AbortController(); epoch.current += 1;
    pagination.current?.abort(); setLoadingMore(false);
    setLoading(true); setError(null); setItems([]); setNextCursor(null);
    bootstrap.current = chatApi.listConversations(query, controller.signal).then((page) => { if (active) { setItems(page.items); setNextCursor(page.nextCursor); } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as conversas.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; epoch.current += 1; controller.abort(); pagination.current?.abort(); };
  }, [query, reloadKey, organizationId, userId]);

  useEffect(() => { if (!canReadTags) { setTags([]); return; } let active = true; const controller = new AbortController(); tagBootstrap.current = chatApi.listTags(undefined, controller.signal).then((page) => { if (active) setTags(page.items); }).catch(() => { if (active) setTags([]); }); return () => { active = false; controller.abort(); }; }, [canReadTags, organizationId, userId]);

  useEffect(() => {
    const invalidatePagination = () => { epoch.current += 1; pagination.current?.abort(); setLoadingMore(false); };
    const refresh = async (signal: AbortSignal) => {
      await bootstrap.current; await tagBootstrap.current;
      if (signal.aborted) return;
      invalidatePagination();
      const page = await chatApi.listConversations(query, signal);
      const tagPage = canReadTags ? await chatApi.listTags(undefined, signal) : null;
      if (signal.aborted) return;
      setItems(page.items); setNextCursor(page.nextCursor); setError(null);
      if (tagPage) setTags(tagPage.items);
    };
    return realtimeBus.subscribe(async (event, signal) => {
      if (organizationId && event.organizationId !== organizationId) return;
      await bootstrap.current; await tagBootstrap.current;
      if (signal.aborted) return;
      if (event.type.startsWith('tag.') && canReadTags) {
        const page = await chatApi.listTags(undefined, signal);
        if (!signal.aborted) setTags(page.items);
        return;
      }
      if (event.type === 'contacts.updated') {
        // Contact metadata updates complement per-conversation events. Retain
        // loaded pages and tag cache instead of rebuilding the entire inbox.
        const page = await chatApi.listConversations(query, signal);
        if (!signal.aborted) { setItems(current => page.items.reduce((items, row) => upsertInboxConversation(items, row, filter, userId), current)); setNextCursor(current => current ?? page.nextCursor); }
        return;
      }
      if (!conversationEvents.has(event.type)) return;
      const id = event.type.startsWith('conversation.') && !event.type.startsWith('conversation.tag.') ? event.entityId : event.payload.conversationId;
      if (!id) return;
      invalidatePagination();
      try {
        const conversation = await chatApi.getConversation(id, signal);
        if (!signal.aborted) setItems((current) => upsertInboxConversation(current, conversation, filter, userId));
      } catch (reason) {
        if (signal.aborted) return;
        if (reason && typeof reason === 'object' && 'status' in reason && (reason.status === 403 || reason.status === 404)) setItems((current) => current.filter((conversation) => conversation.id !== id));
        else throw reason;
      }
    }, { organizationId: organizationId ?? undefined, reconcile: refresh });
  }, [filter, query, canReadTags, userId, organizationId]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const requestEpoch = epoch.current;
    const controller = new AbortController(); pagination.current = controller;
    setLoadingMore(true); setError(null);
    try { const page = await chatApi.listConversations({ ...query, cursor: nextCursor }, controller.signal); if (requestEpoch !== epoch.current) return; setItems((current) => { const known = new Set(current.map((item) => item.id)); return [...current, ...page.items.filter((item) => !known.has(item.id))]; }); setNextCursor(page.nextCursor); }
    catch (reason) { if (requestEpoch !== epoch.current) return; setError(reason instanceof Error ? reason.message : 'Não foi possível carregar mais conversas.'); }
    finally { if (requestEpoch === epoch.current) setLoadingMore(false); }
  }, [nextCursor, loadingMore, query]);

  return <aside className={`inbox-panel${selected ? ' inbox-panel-hidden-mobile' : ''}`} aria-label="Caixa de conversas">
    <div className="inbox-heading"><div><p className="eyebrow">ATENDIMENTO</p><h1>Conversas</h1></div><div className="inbox-heading-actions"><span className="inbox-count" aria-label={`${items.length} conversas carregadas`}>{items.length}</span>{!isAgent && session?.permissions.includes('conversations.create') && session.permissions.includes('contacts.read') && <Link className="secondary-button inbox-new-conversation" to="/app/conversations/new"><Plus size={16} aria-hidden="true" />Nova conversa</Link>}</div></div>
    <label className="inbox-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar nas conversas carregadas</span><input type="search" aria-label="Buscar nas conversas carregadas" placeholder="Buscar nas conversas…" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" /></label>
    <div className="inbox-tabs" role="tablist" aria-label="Filtro de conversas">
      {tabs.filter((item) => (item.id !== 'all' || canSupervise) && (!isAgent || item.id === 'mine' || item.id === 'archived')).map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'selected' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    {canReadTags && <label className="tag-filter">Filtrar por tag<select aria-label="Filtrar por tag" value={tagId} onChange={(event) => setTagId(event.target.value)}><option value="">Todas as tags</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label>}
    <div className="conversation-list" aria-live="polite">
      {loading && <div className="list-state" role="status"><span className="spinner" />Carregando conversas…</div>}
      {!loading && error && <div className="list-state error-state" role="alert"><p>{error}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)}>Tentar novamente</button></div>}
      {!loading && !error && items.length === 0 && <div className="list-state"><span className="empty-mark">○</span><strong>Nenhuma conversa</strong><span>Quando houver conversas neste filtro, elas aparecerão aqui.</span></div>}
      {!loading && !error && items.length > 0 && visibleItems.length === 0 && <div className="list-state" role="status"><strong>Nenhum resultado</strong><span>Busque por outro nome ou carregue mais conversas. A busca considera apenas as conversas já carregadas.</span></div>}
      {!loading && !error && visibleItems.map((conversation) => <Link to={`/app/conversations/${conversation.id}?scope=${tab}`} key={conversation.id} className={`conversation-row${selected?.params.conversationId === conversation.id ? ' active' : ''}`} aria-current={selected?.params.conversationId === conversation.id ? 'page' : undefined}>
        <ContactAvatar name={conversation.contactName ?? `Contato ${conversation.contactId.slice(0, 8)}`} /><span className="conversation-row-copy"><strong>{conversation.contactName ?? `Contato ${conversation.contactId.slice(0, 8)}`}</strong><small>{conversation.status === 'ARCHIVED' ? 'Arquivada' : conversation.assignedUserId ? conversation.assignedUserId === session?.user.id ? 'Atribuída a você' : `Responsável ${conversation.assignedUserId.slice(0, 8)}` : 'Não atribuída'}</small><span className="conversation-preview">{canReadMessages ? conversation.lastMessagePreview ?? '' : ''}</span><span className="conversation-row-tags">{conversation.tagIds.slice(0, 3).map((id) => tags.find((tag) => tag.id === id)?.name ?? 'Tag').join(' · ')}</span></span><time>{new Date(conversation.lastMessageAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time>
      </Link>)}
    </div>
    {!loading && !error && nextCursor && <button type="button" className="load-more-button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Carregando…' : 'Carregar mais'}</button>}
  </aside>;
}
