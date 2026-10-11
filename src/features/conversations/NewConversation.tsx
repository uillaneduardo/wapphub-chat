import { contactIdentifier } from "../../lib/contactIdentifier";
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import { useSession } from '../session/SessionContext';
import { ContactBrowser } from '../contacts/ContactBrowser';
import { ContactForm } from '../contacts/ContactForm';
import { chatApi, type WebChannel } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Contact, CreateConversationResult } from '../../types/chat';

export function NewConversationPage() {
  const { session } = useSession();
  return <NewConversationContent key={`${session?.user.id}:${session?.currentOrganizationId}`} />;
}
function NewConversationContent() {
  const { session } = useSession(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [channels, setChannels] = useState<WebChannel[]>([]); const [channelId, setChannelId] = useState(''); const [phone, setPhone] = useState(''); const [recipientMode, setRecipientMode] = useState<'contact' | 'phone'>('contact');
  const contactId = params.get('contactId');
  const [selected, setSelected] = useState<Contact | null>(null); const [creatingContact, setCreatingContact] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [created, setCreated] = useState<CreateConversationResult | null>(null);
  const allowed = Boolean(session?.permissions.includes('conversations.create') && session.permissions.includes('conversations.read') && session.permissions.includes('contacts.read'));
  const contactRequest = useRef<AbortController | null>(null);
  const lock = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; contactRequest.current?.abort(); }; }, []);
  useEffect(() => { const controller = new AbortController(); contactRequest.current = controller; if (contactId && allowed) void chatApi.getContact(contactId, controller.signal).then((value) => { if (!controller.signal.aborted) setSelected(value); }).catch(() => { if (!controller.signal.aborted) setError('Não foi possível selecionar esse contato.'); }); return () => controller.abort(); }, [contactId, allowed]);
  useEffect(() => { const controller = new AbortController(); if (allowed && chatApi.listChannels) void chatApi.listChannels(controller.signal).then(value => { if (!controller.signal.aborted) setChannels(value.items); }).catch(() => undefined); return () => controller.abort(); }, [allowed]);
  async function create() {
    if (!allowed || lock.current || (recipientMode === 'contact' ? !selected : !channelId || !phone)) return;
    lock.current = true; setBusy(true); setError(''); let result = created;
    try {
      if (!result) { const controller = new AbortController(); contactRequest.current = controller;
        result = channelId ? await chatApi.createExternalConversation({ channelId, ...(recipientMode === 'phone' ? { phone } : { contactId: selected!.id }) }, controller.signal) : await chatApi.createConversation(selected!.id); if (!mounted.current) return; setCreated(result); }
      // Local commands use the same serial reconciliation as socket recovery; no fake event/cursor.
      if (session?.currentOrganizationId) await realtimeBus.reconcile(session.currentOrganizationId);
      if (mounted.current) navigate(`/app/conversations/${result.id}?scope=${result.assignedUserId === session?.user.id ? 'mine' : result.assignedUserId ? 'all' : 'unassigned'}`, { state: { conversationCreation: result.reused ? 'reused' : 'created' } });
    } catch (reason) {
      if (mounted.current) setError(result ? 'Conversa salva. Tente atualizar a inbox sem criar novamente.' : reason && typeof reason === 'object' && 'status' in reason && reason.status === 409 ? channelId ? 'Destinatário indisponível, não confirmado ou conversa inacessível. Nenhuma mensagem foi enviada.' : 'Há um conflito ao criar a conversa. Confira o contato e tente novamente.' : 'Não foi possível criar a conversa. Confira o contato, as permissões e a conexão.');
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  if (!allowed) return <p role="alert">Seu contexto não permite criar e abrir conversas.</p>;
  return <section className="new-conversation"><Link to="/app/conversations">← Conversas</Link><h1><MessagesSquare size={24} aria-hidden="true" />Nova conversa</h1><p className="muted">{channelId ? 'WhatsApp. A abertura valida o destinatário.' : 'Canal interno.'} {channelId ? 'Uma conversa externa acessível será reutilizada.' : 'Uma conversa interna aberta e acessível do contato será reutilizada.'} Criar a conversa não envia uma mensagem.</p>
    {!!channels.length && <label>Canal<select aria-label="Canal da nova conversa" value={channelId} disabled={busy || !!created} onChange={event => { setChannelId(event.target.value); setRecipientMode('contact'); setCreated(null); }}><option value="">Interno</option>{channels.map(channel => <option key={channel.id} value={channel.id} disabled={!channel.outboundEnabled}>{channel.name}{channel.outboundEnabled ? '' : ' — indisponível'}</option>)}</select></label>}
    {channelId && <div className="provider-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => setRecipientMode('contact')}>Contato existente</button>{session?.permissions.includes('contacts.write') && <button type="button" className="secondary-button" disabled={busy} onClick={() => setRecipientMode('phone')}>Número novo</button>}</div>}
    {recipientMode === 'phone' && <label>Número com DDI<input type="tel" aria-label="Número com DDI" placeholder="+5581999999999" value={phone} onChange={event => setPhone(event.target.value)} disabled={busy || !!created} /><small>Informe +, código do país e número. O WhatsApp será consultado somente ao abrir.</small></label>}
    {error && <p role="alert" className="error-text">{error}</p>}
    {created ? <p role="status">Conversa salva. Falta reconciliar a inbox.</p> : recipientMode === 'contact' ? <><ContactBrowser selectedId={selected?.id} onSelect={(contact) => { if (!busy && !created) { contactRequest.current?.abort(); setSelected(contact); setError(''); } }} />{session?.permissions.includes('contacts.write') && <button className="text-button" type="button" onClick={() => setCreatingContact((value) => !value)}>Cadastrar novo contato</button>}{creatingContact && <ContactForm onSaved={(contact) => { contactRequest.current?.abort(); setSelected(contact); setCreatingContact(false); }} onCancel={() => setCreatingContact(false)} />}</> : null}
    {selected && <p className="contact-selection" role="status">Contato selecionado: <strong>{selected.name}</strong> — {selected.displayIdentifier ?? contactIdentifier(selected.primaryIdentifier)}</p>}
    <button className="primary-button" type="button" onClick={() => void create()} disabled={(recipientMode === 'phone' ? !/^\+[1-9][0-9]{7,14}$/.test(phone) : !selected) || busy}>{busy ? 'Preparando conversa…' : created ? 'Atualizar inbox e abrir' : channelId ? 'Validar e abrir WhatsApp' : 'Criar ou abrir conversa interna'}</button>
  </section>;
}
