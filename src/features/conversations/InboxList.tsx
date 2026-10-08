import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useMatch } from 'react-router-dom';
import { useSession } from '../session/SessionContext';
import { chatApi, type ConversationScope } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Conversation, Tag } from '../../types/chat';
import { upsertInboxConversation } from './conversationModel';

type InboxTab = ConversationScope | 'archived';
const tabs: { id: InboxTab; label: string }[] = [{ id: 'mine', label: 'Minhas' }, { id: 'unassigned', label: 'Não atribuídas' }, { id: 'all', label: 'Todas' }, { id: 'archived', label: 'Arquivadas' }];
const conversationEvents = new Set(['conversation.created', 'conversation.updated', 'conversation.archived', 'conversation.assigned', 'conversation.transferred', 'message.created', 'message.updated', 'note.created', 'conversation.tag.added', 'conversation.tag.removed']);

export function InboxList() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const canSupervise = session?.permissions.includes('conversations.supervise') ?? false;
  const canReadTags = session?.permissions.includes('tags.read') ?? false;
  const [tab, setTab] = useState<InboxTab>('mine');
  const [tagId, setTagId] = useState('');
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

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setItems([]); setNextCursor(null);
    chatApi.listConversations(query).then((page) => { if (active) { setItems(page.items); setNextCursor(page.nextCursor); } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as conversas.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, reloadKey]);

  useEffect(() => { if (!canReadTags) { setTags([]); return; } let active = true; chatApi.listTags().then((page) => { if (active) setTags(page.items); }).catch(() => { if (active) setTags([]); }); return () => { active = false; }; }, [canReadTags]);

  useEffect(() => realtimeBus.subscribe((event) => {
    if (event.type.startsWith('tag.') && canReadTags) { void chatApi.listTags().then((page) => setTags(page.items)).catch(() => undefined); return; }
    if (!conversationEvents.has(event.type)) return;
    const id = event.type.startsWith('conversation.') && !event.type.startsWith('conversation.tag.') ? event.entityId : event.payload.conversationId;
    if (!id) return;
    void chatApi.getConversation(id).then((conversation) => setItems((current) => upsertInboxConversation(current, conversation, filter, userId))).catch((reason: unknown) => {
      if (reason && typeof reason === 'object' && 'status' in reason && (reason.status === 403 || reason.status === 404)) setItems((current) => current.filter((conversation) => conversation.id !== id));
    });
  }), [filter, canReadTags, userId]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true); setError(null);
    try { const page = await chatApi.listConversations({ ...query, cursor: nextCursor }); setItems((current) => { const known = new Set(current.map((item) => item.id)); return [...current, ...page.items.filter((item) => !known.has(item.id))]; }); setNextCursor(page.nextCursor); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar mais conversas.'); }
    finally { setLoadingMore(false); }
  }, [nextCursor, loadingMore, query]);

  return <aside className={`inbox-panel${selected ? ' inbox-panel-hidden-mobile' : ''}`} aria-label="Caixa de conversas">
    <div className="inbox-heading"><div><p className="eyebrow">ATENDIMENTO</p><h1>Conversas</h1></div><span className="inbox-count">{items.length}</span></div>
    <div className="inbox-tabs" role="tablist" aria-label="Filtro de conversas">
      {tabs.filter((item) => item.id !== 'all' || canSupervise).map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'selected' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    {canReadTags && <label className="tag-filter">Filtrar por tag<select aria-label="Filtrar por tag" value={tagId} onChange={(event) => setTagId(event.target.value)}><option value="">Todas as tags</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label>}
    <div className="conversation-list" aria-live="polite">
      {loading && <div className="list-state" role="status"><span className="spinner" />Carregando conversas…</div>}
      {!loading && error && <div className="list-state error-state" role="alert"><p>{error}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)}>Tentar novamente</button></div>}
      {!loading && !error && items.length === 0 && <div className="list-state"><span className="empty-mark">○</span><strong>Nenhuma conversa</strong><span>Quando houver conversas neste filtro, elas aparecerão aqui.</span></div>}
      {!loading && !error && items.map((conversation) => <Link to={`/app/conversations/${conversation.id}`} key={conversation.id} className={`conversation-row${selected?.params.conversationId === conversation.id ? ' active' : ''}`} aria-current={selected?.params.conversationId === conversation.id ? 'page' : undefined}>
        <span className="contact-avatar">{conversation.contactId.slice(0, 1).toUpperCase()}</span><span className="conversation-row-copy"><strong>Contato {conversation.contactId.slice(0, 8)}</strong><small>{conversation.status === 'ARCHIVED' ? 'Arquivada' : conversation.assignedUserId ? conversation.assignedUserId === session?.user.id ? 'Atribuída a você' : `Responsável ${conversation.assignedUserId.slice(0, 8)}` : 'Não atribuída'}</small><span className="conversation-row-tags">{conversation.tagIds.slice(0, 3).map((id) => tags.find((tag) => tag.id === id)?.name ?? 'Tag').join(' · ')}</span></span><time>{new Date(conversation.lastMessageAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time>
      </Link>)}
    </div>
    {!loading && !error && nextCursor && <button type="button" className="load-more-button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Carregando…' : 'Carregar mais'}</button>}
  </aside>;
}
