import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { chatApi } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { DemoContact, InternalTextMessage, Provider } from '../../types/chat';
import { useComposerShortcut } from '../../hooks/useComposerShortcut';
import { SendPreference } from '../../components/SendPreference';
import { ProviderDiagnosticsButton } from './ProviderDiagnostics';
import { WebProviderCard } from './WebProvider';
import { useSession } from '../session/SessionContext';

export function ProvidersPage() {
  const { session } = useSession();
  const scope = `${session?.user.id}:${session?.currentOrganizationId}:${session?.membership?.permissionVersion ?? 0}:${session?.permissions.join(",")}`;
  const requests = useRef(0); const activeScope = useRef(scope); activeScope.current = scope;
  const [loadedScope, setLoadedScope] = useState('');
  const [providerData, setProviders] = useState<Provider[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const canManage = session?.permissions.includes('providers.manage') ?? false;
  const load = useCallback(async (signal?: AbortSignal) => { const sequence = ++requests.current; setLoading(true); setError(''); try { const result = await chatApi.listProviders(signal); if (!signal?.aborted && sequence === requests.current && activeScope.current === scope) { setProviders(result.items); setLoadedScope(scope); } } catch (reason) { if (!signal?.aborted && sequence === requests.current && activeScope.current === scope) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar provedores.'); } finally { if (!signal?.aborted && sequence === requests.current && activeScope.current === scope) setLoading(false); } }, [scope]);
  useEffect(() => { setProviders([]); const controller = new AbortController(); if (canManage) void load(controller.signal); else setLoading(false); return () => { controller.abort(); }; }, [load, canManage]);
  const providers = loadedScope === scope ? providerData : [];
  async function toggle(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const enabled = !(providers.find((item) => item.code === 'DEMO')?.enabled ?? false); setBusy(true); setError(''); try { await chatApi.setDemoProvider(enabled); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o provedor.'); } finally { setBusy(false); } }
  if (!canManage) return <section className="access-denied" role="alert"><h1>Acesso indisponível</h1><p>Você não tem permissão para gerenciar provedores.</p></section>;
  const demo = providers.find((item) => item.code === 'DEMO'); const meta = providers.find((item) => item.code === 'META');
  return <section className="providers-page"><header className="providers-heading"><p className="eyebrow">CONFIGURAÇÕES</p><h1>Provedores</h1><p className="muted">Gerencie os canais conectados à organização.</p></header>{loading && <p role="status">Carregando provedores…</p>}{error && <p role="alert" className="error-text">{error} <button className="text-button" onClick={() => void load()}>Tentar novamente</button></p>}{!loading && demo && <article className="provider-card"><div className="provider-card-head"><div><span className="provider-mark">D</span><div><h2>{demo.name}</h2><p>{demo.description}</p></div></div><span className={`provider-state ${demo.enabled ? 'is-enabled' : ''}`}>{demo.enabled ? 'Ativo' : 'Desativado'}</span></div><p className="provider-detail">Na primeira ativação, dois contatos de demonstração são adicionados à caixa de entrada. O histórico permanece disponível após desativar.</p><div className="provider-actions"><ProviderDiagnosticsButton provider="DEMO" />{canManage && <form onSubmit={(event) => void toggle(event)}><button className={demo.enabled ? 'secondary-button' : 'primary-button'} disabled={busy}>{busy ? 'Salvando…' : demo.enabled ? 'Desativar Demo' : 'Ativar Demo'}</button></form>}{session?.permissions.includes('providers.simulate') && session.permissions.includes('messages.read') && <Link className="secondary-button" to="/app/providers/demo/simulator">Abrir simulador</Link>}</div></article>}{!loading && meta && <article className="provider-card provider-card-muted"><div className="provider-card-head"><div><span className="provider-mark provider-mark-muted">M</span><div><h2>{meta.name}</h2><p>{meta.description}</p></div></div><span className="provider-state">Em desenvolvimento</span></div><div className="provider-actions"><button className="secondary-button" disabled>Configuração indisponível</button></div></article>}{!loading && canManage && session?.currentOrganizationId && providers.some((item) => item.code === 'WHATSAPP_WEB') && <WebProviderCard key={scope} organizationId={session.currentOrganizationId} />}</section>;
}

export function DemoSimulatorPage() {
  const { session } = useSession();
  const [contacts, setContacts] = useState<DemoContact[]>([]); const [enabled, setEnabled] = useState(false); const [selectedId, setSelectedId] = useState(''); const [messages, setMessages] = useState<InternalTextMessage[]>([]); const [draft, setDraft] = useState(''); const [loading, setLoading] = useState(true); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const sendBusy = useRef(false);
  const composerShortcut = useComposerShortcut(session?.user.id);
  const canSimulate = Boolean(session?.permissions.includes('providers.simulate') && session.permissions.includes('messages.read'));
  const selected = contacts.find((contact) => contact.contactId === selectedId); const selectedConversationId = selected?.conversationId;
  const selectedConversationRef = useRef(selectedConversationId);
  selectedConversationRef.current = selectedConversationId;
  const selection = useRef(0);
  const bootstrap = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; selection.current += 1; }; }, []);
  const messageQueue = useRef<Promise<void>>(Promise.resolve());
  const refreshMessages = useCallback((signal?: AbortSignal) => {
    const refresh = messageQueue.current.then(async () => {
      if (signal?.aborted) return;
      if (selectedConversationRef.current !== selectedConversationId) return;
      if (!selectedConversationId || !canSimulate) { setMessages([]); return; }
      const generation = selection.current;
      const page = await chatApi.listMessages(selectedConversationId, undefined, signal);
      if (!signal?.aborted && mounted.current && selection.current === generation && selectedConversationRef.current === selectedConversationId) setMessages([...page.items].reverse());
    });
    messageQueue.current = refresh.catch(() => undefined);
    return refresh;
  }, [selectedConversationId, canSimulate]);
  const loadContacts = useCallback(async (signal?: AbortSignal) => { setLoading(true); setError(''); try { const result = await chatApi.listDemoContacts(signal); if (signal?.aborted || !mounted.current) return; setEnabled(result.enabled); setContacts(result.items); setSelectedId((current) => result.items.some((contact) => contact.contactId === current) ? current : result.items[0]?.contactId ?? ''); } catch (reason) { if (!signal?.aborted && mounted.current) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o simulador.'); } finally { if (!signal?.aborted && mounted.current) setLoading(false); } }, []);
  useEffect(() => { const controller = new AbortController(); if (canSimulate) void loadContacts(controller.signal); return () => controller.abort(); }, [canSimulate, loadContacts]);
  useEffect(() => {
    selection.current += 1; setMessages([]);
    const controller = new AbortController();
    bootstrap.current = refreshMessages(controller.signal).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar mensagens.'); });
    return () => { controller.abort(); selection.current += 1; };
  }, [refreshMessages, session?.currentOrganizationId]);
  useEffect(() => realtimeBus.subscribe(async (event, signal) => {
    if (!canSimulate || (session?.currentOrganizationId && event.organizationId !== session.currentOrganizationId)) return;
    if (!['message.created', 'message.updated', 'conversation.transferred', 'conversation.assigned'].includes(event.type)) return;
    const related = event.type.startsWith('conversation.') ? event.entityId : event.payload.conversationId;
    if (related !== selectedConversationId) return;
    await bootstrap.current;
    if (signal.aborted) return;
    if (event.type.startsWith('conversation.')) setMessages([]);
    try { await refreshMessages(signal); if (!signal.aborted) setError(''); }
    catch (reason) {
      if (signal.aborted) return;
      if (reason && typeof reason === 'object' && 'status' in reason && (reason.status === 403 || reason.status === 404)) { setMessages([]); setError('O acesso a esta conversa foi alterado.'); }
      else throw reason;
    }
  }, { organizationId: session?.currentOrganizationId ?? undefined, reconcile: async (signal) => {
    await bootstrap.current;
    if (signal.aborted || !canSimulate) return;
    setMessages([]);
    try { await refreshMessages(signal); if (!signal.aborted) setError(''); }
    catch (reason) {
      if (signal.aborted) return;
      if (reason && typeof reason === 'object' && 'status' in reason && (reason.status === 403 || reason.status === 404)) { setMessages([]); setError('O acesso a esta conversa foi alterado.'); }
      else throw reason;
    }
  } }), [selectedConversationId, refreshMessages, canSimulate, session?.currentOrganizationId]);
  async function send() { const text = draft.trim(); if (sendBusy.current || !canSimulate || !text || draft.length > 8000 || !selected || !enabled) return; sendBusy.current = true; setSending(true); setError(''); setDraft(''); try { await chatApi.sendDemoMessage(selected.contactId, crypto.randomUUID(), text); await refreshMessages(); } catch (reason) { setDraft(text); setError(reason instanceof Error ? reason.message : 'Mensagem não enviada.'); } finally { sendBusy.current = false; setSending(false); } }
  if (!canSimulate) return <section className="access-denied" role="alert"><h1>Acesso indisponível</h1><p>Seu contexto não pode abrir o simulador.</p></section>;
  return <section className="demo-simulator"><header className="providers-heading"><Link to="/app/settings/providers">← Provedores</Link><p className="eyebrow">SIMULAÇÃO</p><h1>Simulador de contato</h1><p className="muted">Esta tela representa uma conversa do lado do cliente externo.</p></header>{!enabled && !loading && <p role="status" className="provider-warning">O simulador está desativado. O histórico pode ser consultado; novas mensagens estão bloqueadas.</p>}{error && <p role="alert" className="inline-error">{error}</p>}<div className="simulator-card"><aside className="simulator-contacts" aria-label="Contatos de demonstração"><h2>Contatos</h2>{loading && <p role="status">Carregando contatos…</p>}{!loading && contacts.length === 0 && <p>Nenhum contato foi provisionado. Ative o simulador em Provedores.</p>}{contacts.map((contact) => <button type="button" key={contact.contactId} aria-pressed={contact.contactId === selectedId} className={contact.contactId === selectedId ? 'selected' : ''} onClick={() => setSelectedId(contact.contactId)}>{contact.name}</button>)}</aside><section className="simulator-chat" aria-label="Conversa simulada"><header><strong>{selected?.name ?? 'Selecione um contato'}</strong><span>Simulação</span></header><div className="simulator-history" aria-live="polite">{messages.map((message) => <article className={`simulator-message ${message.direction === 'INBOUND' ? 'from-contact' : 'from-agent'}`} key={message.id}><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></article>)}</div><form className="simulator-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}><label className="sr-only" htmlFor="demo-message">Mensagem como contato externo</label><textarea id="demo-message" onKeyDown={(event) => composerShortcut.onKeyDown(event, () => void send())} placeholder="Escreva como o contato…" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={8000} disabled={!enabled || !selected || sending} /><div className="composer-send-controls"><button className="primary-button" disabled={!enabled || !selected || !draft.trim() || sending}>{sending ? 'Enviando…' : 'Enviar'}</button><SendPreference value={composerShortcut.shortcut} onChange={composerShortcut.setShortcut} /></div></form></section></div></section>;
}
