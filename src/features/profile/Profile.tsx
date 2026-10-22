import { useEffect, useState, type FormEvent } from 'react';
import { useSession } from '../session/SessionContext';
import { profileApi } from '../../lib/profileApi';
import './profile.css';

function profileError(reason: unknown): string {
  const code = reason instanceof Error && 'code' in reason ? String(reason.code) : '';
  if (code === 'INVALID_PROFILE_NAME' || code === 'INVALID_REQUEST') return 'Informe um nome válido, sem formatação especial ou caracteres invisíveis.';
  if (code === 'ORGANIZATION_ACCESS_DENIED') return 'Sua participação nesta organização não está mais ativa.';
  return 'Não foi possível salvar as alterações. Confira a conexão e tente novamente.';
}

function invalidName(value: string, max: number): boolean {
  return value.length < 2 || value.length > max || /[\p{Cc}\p{Cf}*_~]/u.test(value) || value.includes(String.fromCharCode(96));
}

export function ProfilePage() {
  const { session, refreshSession } = useSession();
  const [name, setName] = useState(session?.user.name ?? '');
  const [alias, setAlias] = useState(session?.membership?.displayName ?? '');
  const [inherit, setInherit] = useState(session?.membership?.displayName == null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [organizationBusy, setOrganizationBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [organizationMessage, setOrganizationMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [organizationError, setOrganizationError] = useState('');

  useEffect(() => {
    setName(session?.user.name ?? '');
  }, [session?.user.id, session?.user.name]);
  useEffect(() => {
    setAlias(session?.membership?.displayName ?? '');
    setInherit(session?.membership?.displayName == null);
    setOrganizationError('');
    setOrganizationMessage('');
  }, [session?.organization?.id, session?.membership?.displayName]);

  if (!session?.organization || !session.membership) return null;
  const normalizedName = name.trim().replace(/\s+/gu, ' ');
  const normalizedAlias = alias.trim().replace(/\s+/gu, ' ');
  const displayPreview = inherit ? normalizedName || session.user.name : normalizedAlias || session.membership.effectiveDisplayName || session.user.name;

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accountBusy || invalidName(normalizedName, 120)) return;
    setAccountBusy(true); setAccountMessage(''); setAccountError('');
    try {
      await profileApi.updateAccount(normalizedName);
      await refreshSession();
      setAccountMessage('Dados pessoais atualizados.');
    } catch (reason) { setAccountError(profileError(reason)); }
    finally { setAccountBusy(false); }
  }
  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (organizationBusy || (!inherit && invalidName(normalizedAlias, 80))) return;
    setOrganizationBusy(true); setOrganizationMessage(''); setOrganizationError('');
    try {
      await profileApi.updateOrganization(inherit ? null : normalizedAlias);
      await refreshSession();
      setOrganizationMessage('Nome de atendimento atualizado para esta organização.');
    } catch (reason) { setOrganizationError(profileError(reason)); }
    finally { setOrganizationBusy(false); }
  }

  return <section className="profile-page">
    <header className="profile-heading"><p className="eyebrow">MINHA CONTA</p><h1>Meu perfil</h1><p className="muted">Gerencie seus dados e como você aparece no atendimento.</p></header>
    <div className="profile-grid">
      <section className="profile-card" aria-labelledby="profile-account-title">
        <div className="profile-card-heading"><h2 id="profile-account-title">Dados da conta</h2><p>Identidade utilizada para acessar o WappHub, inclusive em outras organizações.</p></div>
        <form onSubmit={(event) => void saveAccount(event)}>
          <label htmlFor="profile-name">Nome cadastrado</label>
          <input id="profile-name" value={name} maxLength={120} autoComplete="name" required onChange={(event) => { setName(event.target.value); setAccountMessage(''); }} />
          <label htmlFor="profile-email">E-mail de acesso</label>
          <input id="profile-email" value={session.user.email} readOnly aria-describedby="profile-email-hint" />
          <small id="profile-email-hint" className="profile-hint">A alteração do e-mail ainda não está disponível neste módulo.</small>
          {accountError && <p role="alert" className="error-text">{accountError}</p>}
          {accountMessage && <p role="status" className="profile-success">{accountMessage}</p>}
          <button type="submit" className="primary-button" disabled={accountBusy || invalidName(normalizedName, 120) || normalizedName === session.user.name}>{accountBusy ? 'Salvando…' : 'Salvar dados da conta'}</button>
        </form>
      </section>
      <section className="profile-card" aria-labelledby="profile-organization-title">
        <div className="profile-card-heading"><h2 id="profile-organization-title">Identidade de atendimento</h2><p>Apelido utilizado somente na organização <strong>{session.organization.name}</strong>.</p></div>
        <form onSubmit={(event) => void saveOrganization(event)}>
          <label className="profile-check"><input type="checkbox" checked={inherit} onChange={(event) => { setInherit(event.target.checked); setOrganizationMessage(''); }} />Usar meu nome cadastrado</label>
          <label htmlFor="profile-display-name">Nome de exibição nas mensagens</label>
          <input id="profile-display-name" value={alias} maxLength={80} disabled={inherit} required={!inherit} placeholder="Ex.: Ana • Atendimento" onChange={(event) => { setAlias(event.target.value); setOrganizationMessage(''); }} />
          <div className="profile-preview" aria-label="Prévia do nome de atendimento">
            <span>PRÉVIA DA ASSINATURA NO WHATSAPP</span>
            <strong>{displayPreview}</strong>
            <p>Olá! Como posso ajudar?</p>
          </div>
          <small className="profile-hint">A nova assinatura vale para os próximos envios. Mensagens já transmitidas ao WhatsApp não são alteradas.</small>
          {organizationError && <p role="alert" className="error-text">{organizationError}</p>}
          {organizationMessage && <p role="status" className="profile-success">{organizationMessage}</p>}
          <button type="submit" className="primary-button" disabled={organizationBusy || (!inherit && invalidName(normalizedAlias, 80)) || (inherit ? session.membership.displayName == null : normalizedAlias === session.membership.displayName)}>{organizationBusy ? 'Salvando…' : 'Salvar nome de atendimento'}</button>
        </form>
      </section>
    </div>
  </section>;
}
