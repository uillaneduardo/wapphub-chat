import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { chatApi } from '../../lib/chatApi';
import type { Conversation, CursorPage, HistoryVisibility, Tag, TeamMember, TransferRequest } from '../../types/chat';

interface Props { conversation: Conversation; tags: Tag[]; userId: string; permissions: string[]; onConversationUpdate: (conversation: Conversation) => void; onTagsUpdate: () => void }

export function ConversationActions({ conversation, tags, userId, permissions, onConversationUpdate, onTagsUpdate }: Props) {
  const can = useCallback((permission: string) => permissions.includes(permission), [permissions]);
  const isArchived = conversation.status === 'ARCHIVED';
  const canLoadRoster = (!conversation.assignedUserId && can('conversations.assign') && can('conversations.supervise')) || (Boolean(conversation.assignedUserId) && can('conversations.transfer'));
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [targetUserId, setTargetUserId] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]); const [rosterCursor, setRosterCursor] = useState<string | null>(null); const [rosterLoading, setRosterLoading] = useState(false); const [rosterError, setRosterError] = useState('');
  const [transferOpen, setTransferOpen] = useState(false); const [visibility, setVisibility] = useState<HistoryVisibility>('FULL'); const [lastN, setLastN] = useState('20'); const [handoverNote, setHandoverNote] = useState(''); const [tagToAdd, setTagToAdd] = useState('');
  const loadRoster = useCallback(async (cursor?: string, append = false) => {
    setRosterLoading(true); setRosterError('');
    try {
      const page: CursorPage<TeamMember> = await chatApi.listTeamMembers(cursor);
      setMembers((current) => append ? [...current, ...page.items.filter((member) => !current.some((known) => known.userId === member.userId))] : page.items);
      setRosterCursor(page.nextCursor);
    } catch (reason) { setRosterError(reason instanceof Error ? reason.message : 'Não foi possível carregar a equipe.'); }
    finally { setRosterLoading(false); }
  }, []);
  useEffect(() => { if (canLoadRoster && !isArchived) void loadRoster(); else { setMembers([]); setRosterCursor(null); } }, [canLoadRoster, isArchived, loadRoster]);
  async function run(action: () => Promise<Conversation | void>) { setBusy(true); setError(''); try { const updated = await action(); if (updated) onConversationUpdate(updated); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir a ação.'); } finally { setBusy(false); } }
  function assign(user: string) { if (!user) return; void run(async () => { const updated = await chatApi.assign(conversation.id, user); setTargetUserId(''); return updated; }); }
  function submitAssignment(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const member = members.find((candidate) => candidate.userId === targetUserId); if (!member?.canReceiveAssignment || member.status !== 'ACTIVE') return; assign(member.userId); }
  function submitTransfer(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const member = members.find((candidate) => candidate.userId === targetUserId); if (!member?.canReceiveAssignment || member.status !== 'ACTIVE') return; const body: TransferRequest = { userId: member.userId, visibility, ...(visibility === 'LIMITED' ? { lastN: Number(lastN) } : {}), ...(handoverNote.trim() ? { note: handoverNote.trim() } : {}) }; void run(async () => { const updated = await chatApi.transfer(conversation.id, body); setTransferOpen(false); setTargetUserId(''); setHandoverNote(''); return updated; }); }
  const availableTags = tags.filter((tag) => !conversation.tagIds.includes(tag.id));
  const memberOptions = (excludeUserId?: string) => <>{members.map((member) => <option key={member.userId} value={member.userId} disabled={!member.canReceiveAssignment || member.status !== 'ACTIVE' || member.userId === excludeUserId}>{member.name} · {member.email}{!member.canReceiveAssignment ? ' · sem permissão para receber' : ''}</option>)}</>;
  const rosterControls = <div className="roster-state" aria-live="polite">
    {rosterLoading && <span role="status">Carregando equipe…</span>}
    {!rosterLoading && rosterError && <p role="alert" className="error-text">{rosterError} <button type="button" className="text-button" onClick={() => void loadRoster()}>Tentar novamente</button></p>}
    {!rosterLoading && !rosterError && members.length === 0 && <span className="muted">Nenhuma pessoa ativa na equipe.</span>}
    {!rosterLoading && rosterCursor && <button type="button" className="text-button" onClick={() => void loadRoster(rosterCursor, true)}>Carregar mais pessoas</button>}
  </div>;
  return <section className="conversation-actions" aria-label="Ações da conversa">
    <div className="action-row">
      {can('conversations.archive') && <button type="button" className="secondary-button" disabled={busy} onClick={() => void run(() => chatApi.archive(conversation.id, conversation.status !== 'ARCHIVED'))}>{conversation.status === 'ARCHIVED' ? 'Reabrir conversa' : 'Arquivar conversa'}</button>}
      {!isArchived && !conversation.assignedUserId && can('conversations.assign') && <button type="button" className="secondary-button" disabled={busy} onClick={() => assign(userId)}>Atribuir a mim</button>}
    </div>
    {!isArchived && !conversation.assignedUserId && can('conversations.supervise') && can('conversations.assign') && <form className="compact-form" onSubmit={submitAssignment}>
      <label htmlFor="assign-member">Atribuir a uma pessoa</label>
      <select id="assign-member" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} disabled={rosterLoading || Boolean(rosterError)}><option value="">Selecionar pessoa</option>{memberOptions()}</select>
      {rosterControls}<button className="text-button" disabled={busy || rosterLoading || !members.find((member) => member.userId === targetUserId)?.canReceiveAssignment}>Atribuir</button>
    </form>}
    {!isArchived && conversation.assignedUserId && can('conversations.transfer') && <div className="transfer-block"><button type="button" className="text-button" onClick={() => setTransferOpen((open) => !open)}>{transferOpen ? 'Cancelar transferência' : 'Transferir conversa'}</button>{transferOpen && <form className="compact-form" onSubmit={submitTransfer}>
      <label htmlFor="transfer-member">Transferir para</label><select id="transfer-member" required value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} disabled={rosterLoading || Boolean(rosterError)}><option value="">Selecionar pessoa</option>{memberOptions(conversation.assignedUserId)}</select>
      {rosterControls}
      <label htmlFor="transfer-visibility">Histórico visível</label><select id="transfer-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as HistoryVisibility)}><option value="FULL">Completo</option><option value="LIMITED">Últimas mensagens</option><option value="NONE">Sem histórico</option></select>
      {visibility === 'LIMITED' && <label htmlFor="transfer-last-n">Quantidade de mensagens<input id="transfer-last-n" type="number" min="1" max="1000" required value={lastN} onChange={(event) => setLastN(event.target.value)} /></label>}
      <label htmlFor="handover-note">Nota de transferência (opcional)<textarea id="handover-note" maxLength={2000} value={handoverNote} onChange={(event) => setHandoverNote(event.target.value)} /></label>
      <button className="primary-button" disabled={busy || rosterLoading || !members.find((member) => member.userId === targetUserId)?.canReceiveAssignment}>Confirmar transferência</button>
    </form>}</div>}
    {can('tags.manage') && availableTags.length > 0 && <form className="tag-add-form" onSubmit={(event) => { event.preventDefault(); if (!tagToAdd) return; const addedId = tagToAdd; void (async () => { setBusy(true); setError(''); try { await chatApi.addTag(conversation.id, addedId); onConversationUpdate({ ...conversation, tagIds: [...conversation.tagIds, addedId] }); setTagToAdd(''); onTagsUpdate(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível adicionar a tag.'); } finally { setBusy(false); } })(); }}>
      <label htmlFor="add-conversation-tag">Adicionar tag</label><div><select id="add-conversation-tag" value={tagToAdd} onChange={(event) => setTagToAdd(event.target.value)}><option value="">Selecionar tag</option>{availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select><button className="text-button" disabled={busy || !tagToAdd}>Adicionar</button></div>
    </form>}
    {error && <p role="alert" className="error-text action-error">{error}</p>}
  </section>;
}
