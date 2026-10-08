import { useState } from 'react';
import type { FormEvent } from 'react';
import { chatApi } from '../../lib/chatApi';
import type { Conversation, HistoryVisibility, Tag, TransferRequest } from '../../types/chat';

interface Props { conversation: Conversation; tags: Tag[]; userId: string; permissions: string[]; onConversationUpdate: (conversation: Conversation) => void; onTagsUpdate: () => void }
export function ConversationActions({ conversation, tags, userId, permissions, onConversationUpdate, onTagsUpdate }: Props) {
  const can = (permission: string) => permissions.includes(permission);
  const isArchived = conversation.status === 'ARCHIVED';
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [targetUserId, setTargetUserId] = useState('');
  const [transferOpen, setTransferOpen] = useState(false); const [visibility, setVisibility] = useState<HistoryVisibility>('FULL'); const [lastN, setLastN] = useState('20'); const [handoverNote, setHandoverNote] = useState(''); const [tagToAdd, setTagToAdd] = useState('');
  async function run(action: () => Promise<Conversation | void>) { setBusy(true); setError(''); try { const updated = await action(); if (updated) onConversationUpdate(updated); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir a ação.'); } finally { setBusy(false); } }
  function assign(user: string) { if (!user) return; void run(async () => { const updated = await chatApi.assign(conversation.id, user); setTargetUserId(''); return updated; }); }
  function submitTransfer(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!targetUserId.trim()) return; const body: TransferRequest = { userId: targetUserId.trim(), visibility, ...(visibility === 'LIMITED' ? { lastN: Number(lastN) } : {}), ...(handoverNote.trim() ? { note: handoverNote.trim() } : {}) }; void run(async () => { const updated = await chatApi.transfer(conversation.id, body); setTransferOpen(false); setTargetUserId(''); setHandoverNote(''); return updated; }); }
  const availableTags = tags.filter((tag) => !conversation.tagIds.includes(tag.id));
  return <section className="conversation-actions" aria-label="Ações da conversa">
    <div className="action-row">
      {can('conversations.archive') && <button type="button" className="secondary-button" disabled={busy} onClick={() => void run(() => chatApi.archive(conversation.id, conversation.status !== 'ARCHIVED'))}>{conversation.status === 'ARCHIVED' ? 'Reabrir conversa' : 'Arquivar conversa'}</button>}
      {!isArchived && !conversation.assignedUserId && can('conversations.assign') && <button type="button" className="secondary-button" disabled={busy} onClick={() => assign(userId)}>Atribuir a mim</button>}
    </div>
    {!isArchived && can('conversations.supervise') && can('conversations.assign') && !conversation.assignedUserId && <form className="compact-form" onSubmit={(event) => { event.preventDefault(); assign(targetUserId.trim()); }}><label htmlFor="assign-user-id">Atribuir a outro usuário</label><input id="assign-user-id" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} placeholder="UUID do usuário" /><button className="text-button" disabled={busy || !targetUserId.trim()}>Atribuir</button></form>}
    {!isArchived && conversation.assignedUserId && can('conversations.transfer') && <div className="transfer-block"><button type="button" className="text-button" onClick={() => setTransferOpen((open) => !open)}>{transferOpen ? 'Cancelar transferência' : 'Transferir conversa'}</button>{transferOpen && <form className="compact-form" onSubmit={submitTransfer}>
      <label htmlFor="transfer-user-id">UUID do novo responsável</label><input id="transfer-user-id" required value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} />
      <label htmlFor="transfer-visibility">Histórico visível</label><select id="transfer-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as HistoryVisibility)}><option value="FULL">Completo</option><option value="LIMITED">Últimas mensagens</option><option value="NONE">Sem histórico</option></select>
      {visibility === 'LIMITED' && <label htmlFor="transfer-last-n">Quantidade de mensagens<input id="transfer-last-n" type="number" min="1" max="1000" required value={lastN} onChange={(event) => setLastN(event.target.value)} /></label>}
      <label htmlFor="handover-note">Nota de transferência (opcional)<textarea id="handover-note" maxLength={2000} value={handoverNote} onChange={(event) => setHandoverNote(event.target.value)} /></label>
      <button className="primary-button" disabled={busy || !targetUserId.trim()}>{busy ? 'Transferindo…' : 'Confirmar transferência'}</button>
    </form>}</div>}
    {can('tags.manage') && availableTags.length > 0 && <form className="tag-add-form" onSubmit={(event) => { event.preventDefault(); if (!tagToAdd) return; const addedId = tagToAdd; void (async () => { setBusy(true); setError(''); try { await chatApi.addTag(conversation.id, addedId); onConversationUpdate({ ...conversation, tagIds: [...conversation.tagIds, addedId] }); setTagToAdd(''); onTagsUpdate(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível adicionar a tag.'); } finally { setBusy(false); } })(); }}>
      <label htmlFor="add-conversation-tag">Adicionar tag</label><div><select id="add-conversation-tag" value={tagToAdd} onChange={(event) => setTagToAdd(event.target.value)}><option value="">Selecionar tag</option>{availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select><button className="text-button" disabled={busy || !tagToAdd}>Adicionar</button></div>
    </form>}
    {error && <p role="alert" className="error-text action-error">{error}</p>}
  </section>;
}
