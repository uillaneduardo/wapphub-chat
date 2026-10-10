import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ContactRound, Plus, Pencil } from 'lucide-react';
import { ContactBrowser } from './ContactBrowser';
import { ContactForm } from './ContactForm';
import { useSession } from '../session/SessionContext';
import { chatApi } from '../../lib/chatApi';
import { contactIdentifier } from '../../lib/contactIdentifier';
import { realtimeBus } from '../../lib/realtimeBus';
import type { Contact } from '../../types/chat';

export function ContactsPage() {
  const { session } = useSession(); const navigate = useNavigate(); const [creating, setCreating] = useState(false);
  return <section className="contacts-page"><header className="contacts-heading"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1><ContactRound size={24} aria-hidden="true" />Contatos</h1></div>{session?.permissions.includes('contacts.write') && <button className="primary-button" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" />Novo contato</button>}</header>
    {creating && <section className="contact-card"><h2>Cadastrar contato</h2><ContactForm onSaved={(value) => navigate(`/app/contacts/${value.id}`)} onCancel={() => setCreating(false)} /></section>}
    <ContactBrowser />
  </section>;
}
export function ContactDetailPage() {
  const { contactId = '' } = useParams(); const { session } = useSession();
  return <ContactDetail key={`${session?.user.id}:${session?.currentOrganizationId}:${contactId}`} contactId={contactId} />;
}
function ContactDetail({ contactId }: { contactId: string }) {
  const { session } = useSession(); const [contact, setContact] = useState<Contact | null>(null); const [editing, setEditing] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  const epoch = useRef(0);
  const load = useCallback(async (signal: AbortSignal) => {
    const generation = ++epoch.current;
    let value;
    try { value = await chatApi.getContact(contactId, signal); }
    catch (reason) {
      if (!signal.aborted && generation === epoch.current && reason && typeof reason === 'object' && 'status' in reason && (reason.status === 403 || reason.status === 404)) { setContact(null); setError('O contato não está disponível neste contexto.'); setLoading(false); return; }
      throw reason;
    }
    if (!signal.aborted && generation === epoch.current) { setContact(value); setError(''); setLoading(false); }
  }, [contactId]);
  useEffect(() => { const controller = new AbortController(); setLoading(true); const request = load(controller.signal); const generation = epoch.current; void request.catch(() => { if (!controller.signal.aborted && generation === epoch.current) setError('Não foi possível abrir o contato.'); }).finally(() => { if (!controller.signal.aborted && generation === epoch.current) setLoading(false); }); return () => { controller.abort(); epoch.current += 1; }; }, [load, revision]);
  useEffect(() => realtimeBus.subscribe((event, signal) => event.type === 'contacts.updated' ? load(signal) : undefined, { organizationId: session?.currentOrganizationId ?? undefined, reconcile: load }), [load, session?.currentOrganizationId]);
  return <section className="contacts-page"><Link to="/app/contacts">← Contatos</Link>
    {loading && <p role="status">Carregando contato…</p>}
    {error && <p role="alert">{error} <button type="button" className="text-button" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button></p>}
    {!loading && !error && contact && <section className="contact-card"><header className="contacts-heading"><h1>{contact.name}</h1>{session?.permissions.includes('contacts.write') && !editing && <button type="button" className="secondary-button" onClick={() => setEditing(true)}><Pencil size={18} aria-hidden="true" />Editar contato</button>}</header>
      {editing ? <ContactForm contact={contact} onSaved={(updated) => { setContact(updated); setEditing(false); }} onCancel={() => setEditing(false)} /> : <><p className="contact-identifier">{contactIdentifier(contact.primaryIdentifier)}</p><p className="muted">Contato da organização ativa. O histórico e os vínculos existentes são preservados.</p>
        {session?.permissions.includes('conversations.create') && session.permissions.includes('conversations.read') && <Link className="primary-button contact-create-link" to={`/app/conversations/new?contactId=${encodeURIComponent(contact.id)}`}>Nova conversa interna</Link>}</>}
    </section>}
  </section>;
}
