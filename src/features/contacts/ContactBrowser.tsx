import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContactRound, Search } from 'lucide-react';
import { chatApi } from '../../lib/chatApi';
import { contactIdentifier } from '../../lib/contactIdentifier';
import { realtimeBus } from '../../lib/realtimeBus';
import { useSession } from '../session/SessionContext';
import type { Contact } from '../../types/chat';

export function ContactBrowser({ onSelect, selectedId }: { onSelect?: (contact: Contact) => void; selectedId?: string }) {
  const { session } = useSession(); const id = useId(); const organizationId = session?.currentOrganizationId ?? undefined;
  const [input, setInput] = useState(''); const [query, setQuery] = useState(''); const [items, setItems] = useState<Contact[]>([]); const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); const [more, setMore] = useState(false); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  const epoch = useRef(0); const pagination = useRef<AbortController | null>(null);
  const canRead = session?.permissions.includes('contacts.read') ?? false;
  const load = useCallback(async (signal: AbortSignal) => {
    const generation = ++epoch.current; pagination.current?.abort(); setMore(false);
    let page;
    try { page = await chatApi.listContacts({ q: query || undefined }, signal); }
    catch (reason) {
      if (!signal.aborted && generation === epoch.current && reason && typeof reason === 'object' && 'status' in reason && (reason.status === 403 || reason.status === 404)) { setItems([]); setCursor(null); setError('Seu contexto não permite consultar contatos.'); setLoading(false); return; }
      throw reason;
    }
    if (!signal.aborted && generation === epoch.current) { setItems(page.items); setCursor(page.nextCursor); setError(''); setLoading(false); }
  }, [query]);
  useEffect(() => {
    const controller = new AbortController(); setItems([]); setCursor(null); setError('');
    if (canRead) { setLoading(true); const request = load(controller.signal); const generation = epoch.current; void request.catch(() => { if (!controller.signal.aborted && generation === epoch.current) setError('Não foi possível carregar os contatos.'); }).finally(() => { if (!controller.signal.aborted && generation === epoch.current) setLoading(false); }); }
    return () => { controller.abort(); epoch.current += 1; pagination.current?.abort(); };
  }, [canRead, load, revision, organizationId]);
  useEffect(() => {
    if (!canRead) return;
    return realtimeBus.subscribe((event, signal) => event.type === 'contacts.updated' ? load(signal) : undefined, { organizationId, reconcile: load });
  }, [canRead, organizationId, load]);
  async function loadMore() {
    if (!cursor || more) return;
    const generation = epoch.current; const controller = new AbortController(); pagination.current = controller; setMore(true);
    try { const page = await chatApi.listContacts({ q: query || undefined, cursor }, controller.signal); if (controller.signal.aborted || generation !== epoch.current) return; setItems((current) => [...current, ...page.items.filter((item) => !current.some((known) => known.id === item.id))]); setCursor(page.nextCursor); }
    catch { if (!controller.signal.aborted) setError('Não foi possível carregar mais contatos.'); }
    finally { if (!controller.signal.aborted) setMore(false); }
  }
  if (!canRead) return <p role="alert">Seu contexto não permite consultar contatos.</p>;
  return <section className="contact-browser" aria-label="Contatos da organização">
    <form className="contact-search" onSubmit={(event) => { event.preventDefault(); setQuery(input.trim()); setRevision((value) => value + 1); }}><label htmlFor={`${id}-search`}>Pesquisar contatos</label><div><input id={`${id}-search`} type="search" placeholder="Nome ou identificador" maxLength={254} value={input} onChange={(event) => setInput(event.target.value)} /><button className="secondary-button" type="submit"><Search size={18} aria-hidden="true" />Pesquisar</button></div></form>
    {loading && <p role="status">Carregando contatos…</p>}
    {error && <p role="alert">{error} <button className="text-button" type="button" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button></p>}
    {!loading && !error && !items.length && <p role="status">Nenhum contato encontrado.</p>}
    <ul className="contact-results">{items.map((contact) => {
      const content = <><ContactRound size={22} strokeWidth={2} aria-hidden="true" /><span><strong>{contact.name}</strong><small>{contactIdentifier(contact.primaryIdentifier)}</small></span></>;
      return <li key={contact.id}>{onSelect ? <button className="contact-row" type="button" aria-pressed={contact.id === selectedId} aria-label={`Selecionar ${contact.name}`} onClick={() => onSelect(contact)}>{content}</button> : <Link className="contact-row" to={`/app/contacts/${contact.id}`}>{content}</Link>}</li>;
    })}</ul>
    {cursor && <button className="secondary-button" type="button" onClick={() => void loadMore()} disabled={more}>{more ? 'Carregando…' : 'Carregar mais contatos'}</button>}
  </section>;
}
