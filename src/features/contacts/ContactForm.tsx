import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { chatApi } from '../../lib/chatApi';
import { realtimeBus } from '../../lib/realtimeBus';
import { useSession } from '../session/SessionContext';
import type { Contact } from '../../types/chat';

function contactError(reason: unknown): string {
  if (reason && typeof reason === 'object' && 'status' in reason) {
    if (reason.status === 409) return 'Já existe um contato com esse identificador nesta organização.';
    if (reason.status === 403) return 'Seu contexto não permite esta operação.';
    if (reason.status === 400) return 'Confira os campos informados.';
  }
  return 'Não foi possível concluir a operação. Confira a conexão e tente novamente.';
}
export function ContactForm({ contact, onSaved, onCancel }: { contact?: Contact; onSaved: (value: Contact) => void; onCancel?: () => void }) {
  const { session } = useSession(); const id = useId();
  const [name, setName] = useState(contact?.name ?? ''); const [identifier, setIdentifier] = useState(contact?.primaryIdentifier ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState<Contact | null>(null);
  const lock = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const canWrite = session?.permissions.includes('contacts.write') ?? false;
  const linked = Boolean(contact?.providers?.length);
  async function reconcile(value: Contact) {
    if (session?.currentOrganizationId) await realtimeBus.reconcile(session.currentOrganizationId);
    if (mounted.current) onSaved(value);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current || !canWrite) return;
    if (!saved && (!name.trim() || name.trim().length > 120 || !identifier.trim() || identifier.trim().length > 254)) { setError('Informe nome e identificador válidos.'); return; }
    lock.current = true; setBusy(true); setError('');
    let committed = saved;
    try {
      if (!committed) {
        committed = contact ? await chatApi.updateContact(contact.id, { name: name.trim(), ...(!linked ? { primaryIdentifier: identifier.trim() } : {}) }) : await chatApi.createContact({ name: name.trim(), primaryIdentifier: identifier.trim() });
        if (!mounted.current) return;
        setSaved(committed);
      }
      await reconcile(committed);
    } catch (reason) { if (mounted.current) setError(committed ? 'Contato salvo. A atualização da tela falhou; tente atualizar sem cadastrar novamente.' : contactError(reason)); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <form className="contact-form" onSubmit={(event) => void submit(event)} aria-label={contact ? 'Editar contato' : 'Cadastrar contato'}>
    <label htmlFor={`${id}-name`}>Nome<input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} disabled={!canWrite || busy || Boolean(saved)} /></label>
    <label htmlFor={`${id}-identifier`}>Identificador principal<input id={`${id}-identifier`} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required maxLength={254} readOnly={linked} disabled={!canWrite || busy || Boolean(saved)} /></label>
    {linked && <p className="muted">Vínculo com {contact?.providers?.join(', ')} preservado. Nesta tela, edite somente o nome.</p>}
    {error && <p role="alert" className="error-text">{error}</p>}
    <div className="contact-form-actions"><button className="primary-button" type="submit" disabled={!canWrite || busy}>{busy ? 'Salvando…' : saved ? 'Atualizar tela' : 'Salvar contato'}</button>{onCancel && <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancelar</button>}</div>
  </form>;
}
