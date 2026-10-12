import { useCallback, useEffect, useId, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { AppIcon } from '../../components/AppIcon';
import { HistoryControls } from './HistoryControls';
import { ProviderDiagnosticsButton } from './ProviderDiagnostics';
import { ApiError } from '../../lib/api';
import { createRealtimeUrl, RealtimeClient } from '../../lib/realtime';
import { webProviderApi, type WebAction, type WebConnection, type WebQr } from '../../lib/webProviderApi';
import { useSession } from '../session/SessionContext';
import { connectionPending as pending, connectionPresentation } from './webConnectionPresentation';
import './web-provider.css';
const errors: Record<string, string> = {
  SESSION_COMMAND_LIMIT: 'O limite de recibos administrativos foi atingido. Consulte o administrador; nenhuma operação será repetida automaticamente.',
  LINK_PREPARATION_DENIED: 'O vínculo ainda não permite uma nova vinculação segura.', SESSION_ARCHIVE_LIMIT: 'O limite de sessões anteriores foi atingido. Consulte o administrador.',
  QR_NOT_AVAILABLE: 'O QR expirou ou ainda não foi gerado. Solicite um novo QR.', QR_EXPIRED: 'O QR expirou. Solicite um novo QR.', QR_CHANGED: 'O QR foi atualizado. Exiba o QR atual.',
  CONNECTION_VERSION_CONFLICT: 'A conexão mudou durante a operação. Confira o estado atual e tente novamente.', CONNECTION_OPERATION_PENDING: 'Há uma operação em andamento. Aguarde a atualização.',
  PROVIDER_UNAVAILABLE: 'O serviço está temporariamente indisponível. Tente novamente.', PROVIDER_NOT_ENABLED: 'A integração ainda não está habilitada.',
  CONNECTIONS_DISABLED: 'Novas conexões estão temporariamente bloqueadas.', COMMAND_AUTHORIZATION_REVOKED: 'O acesso mudou antes de executar o comando. Atualize sua sessão.',
  RECOVERY_NOT_ELIGIBLE: 'A sessão não está elegível para recuperação segura.', RECOVERY_TIMEOUT: 'A recuperação não confirmou autenticação no prazo. Nenhuma nova tentativa será iniciada automaticamente.', RECOVERY_INTERRUPTED: 'A recuperação foi interrompida. Seu resultado precisa ser verificado antes de outra autorização.', LOGOUT_RESULT_UNKNOWN: 'O desligamento local foi concluído, mas a desvinculação remota não foi confirmada.', LOGOUT_REMOTE_FAILED: 'A desvinculação remota falhou. A conexão permanece parada localmente.', LOGOUT_TRANSPORT_UNAVAILABLE: 'Sem transporte disponível para confirmar a desvinculação remota.', CONTROLLED_RECOVERY_REQUIRED: 'Use a recuperação controlada para a sessão existente.', PAIRING_TIMEOUT: 'O prazo para vincular o aparelho terminou. Solicite um novo QR.', SESSION_REPLACED: 'A sessão foi substituída em outro aparelho.', SESSION_REVOKED: 'O vínculo foi revogado. Vincule o aparelho novamente.', RECONNECT_LIMIT: 'O limite de reconexões foi atingido. Uma tentativa de recuperação exige autorização explícita.', CONNECTION_LOST: 'Conexão interrompida. Confira o estado da recuperação antes de autorizar outra tentativa.', BAD_SESSION: 'O protocolo indicou uma sessão inválida. As credenciais foram preservadas para diagnóstico.', RECOVERY_START_FAILED: 'Não foi possível iniciar a recuperação com segurança. As credenciais foram preservadas para diagnóstico.',
};
const failure = (reason: unknown) => reason instanceof ApiError && reason.status === 403 ? 'Você não tem acesso para gerenciar esta conexão.' : reason instanceof ApiError ? errors[reason.code ?? ''] ?? 'Não foi possível concluir a operação. Confira a conexão e tente novamente.' : 'Não foi possível conectar à API. Tente novamente.';
function SyncProgress({ connection }: { connection: WebConnection }) {
  const sync = connection.sync; if (!sync) return null;
  const provider = sync.provider;
  const diagnostics = provider?.diagnostics;
  const failures = sync.pendingFailures ?? sync.failures;
  const rejected = (sync.rejectedItems ?? 0) + (diagnostics?.rejected ?? 0);
  const active = Boolean(provider?.queued || provider?.historyEnabled && ['CONTACTS', 'MESSAGES'].includes(provider.phase));
  const label = sync.pendingFailures || diagnostics?.failures || rejected || sync.pendingFailures || provider?.limited || provider?.phase === 'PARTIAL' ? 'Sincronização parcial ou com falhas' : active && provider?.phase === 'CONTACTS' ? 'Sincronizando contatos' : active ? 'Sincronizando conversas e mensagens' : provider?.phase === 'PROCESSED' ? 'Sincronização inicial processada' : provider?.phase === 'AWAITING_HISTORY' ? 'Aguardando histórico disponibilizado pelo WhatsApp' : 'Sincronização contínua ativa';
  return <section className="web-provider-sync" aria-label="Progresso da sincronização">
    <h3>{label}</h3>{active && <p role="status"><span className="web-provider-spinner" aria-hidden="true" />Processando em segundo plano. Você pode continuar navegando.</p>}
    <dl><div><dt>Contatos criados ou atualizados</dt><dd>{sync.contacts}</dd></div><div><dt>Conversas criadas</dt><dd>{sync.conversations}</dd></div><div><dt>Mensagens persistidas</dt><dd>{sync.messages}</dd></div><div><dt>Falhas atuais no Core</dt><dd>{failures}</dd></div></dl>
    <p className="muted">Contatos, conversas e mensagens acima refletem persistência no Core. Falhas atuais, tentativas e registros legados são indicadores distintos. Uma mensagem pode usar uma conversa já existente, sem aumentar “Conversas criadas”. Conversas sem atendente ficam em Não atribuídas e também em Todas para quem pode supervisionar.</p>
    {sync.diagnosticsSince && <dl><div><dt>Itens em lotes registrados no Core</dt><dd>{sync.receivedItems ?? 0}</dd></div><div><dt>Itens processados no Core</dt><dd>{sync.processedItems ?? 0}</dd></div><div><dt>Duplicidades no Core</dt><dd>{sync.duplicateItems ?? 0}</dd></div><div><dt>Itens rejeitados no Core</dt><dd>{sync.rejectedItems ?? 0}</dd></div><div><dt>Conversas localizadas em eventos</dt><dd>{sync.conversationsLocated ?? 0}</dd></div><div><dt>Tentativas com falha ao persistir</dt><dd>{sync.failedAttempts ?? 0}</dd></div><div><dt>Lotes com falha aguardando nova tentativa</dt><dd>{sync.pendingFailures ?? 0}</dd></div></dl>}
    {diagnostics && <><p>Diagnóstico do recebimento a partir de {new Date(diagnostics.since).toLocaleString('pt-BR')}:</p><dl><div><dt>Itens recebidos no Provider</dt><dd>{diagnostics.received}</dd></div><div><dt>Itens normalizados</dt><dd>{diagnostics.normalized}</dd></div><div><dt>Itens ignorados pelo protocolo ou conteúdo</dt><dd>{diagnostics.ignored}</dd></div><div><dt>Itens rejeitados antes do Core</dt><dd>{diagnostics.rejected}</dd></div><div><dt>Lotes publicados</dt><dd>{diagnostics.publishedBatches}</dd></div><div><dt>Lotes confirmados pelo Core</dt><dd>{diagnostics.acknowledgedBatches}</dd></div></dl>{diagnostics.legacyFailures > 0 && <p role="alert">Há {diagnostics.legacyFailures} registros anteriores de falha sem causa registrada. Eles foram preservados e não comprovam perda de mensagens. Os novos diagnósticos distinguem avisos do protocolo, rejeições e erros.</p>}</>}
    {!diagnostics && (provider?.failures ?? 0) > 0 && <p role="status">Há {provider?.failures} falhas registradas apenas como contador. Não é possível reconstruir seus detalhes com segurança.</p>}
    {provider && <p className="muted">Itens na fila: {provider.queued}</p>}
    {sync.lastErrorCode && <p role="alert">{sync.lastErrorCode === 'IDENTITY_MAPPING_CONFLICT' ? 'Uma identidade externa está vinculada a contatos distintos. Os dados foram preservados; a associação precisa ser revisada.' : 'Alguns itens não puderam ser processados. Os demais continuam sendo sincronizados.'}</p>}
    {!provider?.historyEnabled && provider?.phase !== 'PROCESSED' && <p>Histórico inicial desativado. Apenas mensagens novas e eventos recentes disponibilizados na sessão são processados. Nenhum novo pareamento será feito automaticamente.</p>}
    {provider?.phase === 'PROCESSED' && <p>Os lotes disponibilizados foram processados. Isso não comprova a importação de todo o histórico da conta.</p>}
    {provider?.limited && <p>Um limite de processamento foi atingido ou há histórico anterior pendente. Mensagens novas continuam tendo prioridade.</p>}
  </section>;
}
function QrImage({ value }: { value: string }) {
  try {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const path: string[] = [];
    for (let row = 0; row < modules.size; row++) for (let col = 0; col < modules.size; col++) if (modules.get(row, col)) path.push(`M${col + 4} ${row + 4}h1v1h-1z`);
    return <svg className="web-provider-qr" role="img" aria-label="QR Code para vincular o WhatsApp" viewBox={`0 0 ${modules.size + 8} ${modules.size + 8}`} shapeRendering="crispEdges"><rect width="100%" height="100%" fill="white" /><path d={path.join('')} fill="black" /></svg>;
  } catch { return <p role="alert">Não foi possível representar o QR. Solicite um novo código.</p>; }
}
function QrExpiry({ ttl }: { ttl: number }) {
  const [remaining, setRemaining] = useState(Math.ceil(ttl / 1000));
  useEffect(() => {
    const end = performance.now() + ttl;
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((end - performance.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [ttl]);
  return <p>Expira em {remaining} segundos.</p>;
}
// Parent mounts a new instance for each user/org/permission version. No QR or
// lifecycle state survives navigation, a permission change or tenant switching.
export function WebProviderCard({ organizationId }: { organizationId: string }) {
  const { expireSession, refreshSession } = useSession();
  const [connection, setConnection] = useState<WebConnection | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState(Date.now()), [queryError, setQueryError] = useState(''), [checking, setChecking] = useState(false), [removedOnPhone, setRemovedOnPhone] = useState(false);
  const reading = useRef<Promise<void> | null>(null), lastRead = useRef(0);
  const [capabilityConfirm, setCapabilityConfirm] = useState(false);
  const [historySummary, setHistorySummary] = useState('Não ativado');
  const [wantsQr, setWantsQr] = useState(true), [qr, setQr] = useState<WebQr | null>(null), [qrLoading, setQrLoading] = useState(false), [expired, setExpired] = useState(false), [confirm, setConfirm] = useState<'disconnect' | 'logout' | 'recover' | 'prepare_link' | null>(null), [live, setLive] = useState('connecting');
  const controller = useRef<AbortController | null>(null), commandBusy = useRef(false), readSequence = useRef(0), current = useRef<WebConnection | null>(null), disconnectButton = useRef<HTMLButtonElement>(null), confirmation = useRef<HTMLButtonElement>(null), confirmationTrigger = useRef<HTMLElement | null>(null);
  const linkFlow = useRef<{ id: string; stage: 'create' | 'prepare_link' } | null>(null);
  const titleId = useId(), descriptionId = useId();
  const apply = useCallback((value: WebConnection | null) => {
    if (value && current.current?.id === value.id && (value.version < current.current.version || value.version === current.current.version && Date.parse(value.lastCheckedAt ?? '') < Date.parse(current.current.lastCheckedAt ?? ''))) return;
    current.current = value; setConnection(value);
  }, []);
  const load = useCallback((signal: AbortSignal): Promise<void> => {
    if (reading.current) return reading.current;
    const sequence = ++readSequence.current; lastRead.current = Date.now(); setChecking(true);
    const task = (async () => {
      try { const value = await webProviderApi.read(signal); if (!signal.aborted && sequence === readSequence.current) { apply(value.connection); setQueryError(''); setCheckedAt(Date.now()); } }
      catch (reason) { if (!signal.aborted && sequence === readSequence.current) { setQueryError(failure(reason)); setCheckedAt(Date.now()); throw reason; } }
      finally { if (!signal.aborted && sequence === readSequence.current) { setLoading(false); setChecking(false); } }
    })();
    reading.current = task;
    void task.finally(() => { if (reading.current === task) reading.current = null; }).catch(() => undefined);
    return task;
  }, [apply]);
  useEffect(() => {
    const abort = new AbortController(); controller.current = abort;
    void load(abort.signal).catch(() => undefined);
    const url = new URL(createRealtimeUrl(import.meta.env.VITE_API_BASE_URL || window.location.origin)); url.pathname = '/api/v1/providers/realtime';
    const reconcile = () => load(abort.signal);
    const client = new RealtimeClient({ url: url.toString(), organizationId, checkpointStore: { get: () => null, set: () => undefined },
      onEvent: (event) => event.type === 'provider.connection.updated' ? reconcile() : undefined, onReconcile: reconcile,
      onUnauthorized: expireSession, onPermissionsChanged: () => void refreshSession(true), onState: setLive });
    const revalidate = () => { if (document.visibilityState !== 'hidden' && Date.now() - lastRead.current >= 10000) void reconcile().catch(() => undefined); };
    const online = () => { client.retry(); revalidate(); };
    client.connect(); window.addEventListener('online', online); window.addEventListener('focus', revalidate); document.addEventListener('visibilitychange', revalidate);
    // Bounded REST fallback when unchanged backend metadata emits no realtime.
    const timer = setInterval(revalidate, 30000);
    return () => { abort.abort(); reading.current = null; client.close(); controller.current = null; clearInterval(timer); window.removeEventListener('online', online); window.removeEventListener('focus', revalidate); document.removeEventListener('visibilitychange', revalidate); };
  }, [organizationId, load, expireSession, refreshSession]);
  useEffect(() => {
    setQr(null); setExpired(false);
    if (!wantsQr || ['PENDING', 'PROCESSING'].includes(connection?.operation?.status ?? '') || connection?.uiState !== 'QR_READY' || connection?.pairingPhase === 'AUTHENTICATING') { setQrLoading(false); return; }
    const abort = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now(); setQrLoading(true);
    void webProviderApi.qr(connection.id, abort.signal).then((value) => {
      if (abort.signal.aborted || value.revision !== current.current?.qrRevision) return;
      const remaining = value.expiresInMs - (performance.now() - started);
      if (remaining <= 0) { setExpired(true); return; }
      setError(''); setQr({ ...value, expiresInMs: remaining }); timer = setTimeout(() => { setQr(null); setExpired(true); }, remaining);
    }).catch((reason) => { if (!abort.signal.aborted) { setError(failure(reason)); setExpired(true); } }).finally(() => { if (!abort.signal.aborted) setQrLoading(false); });
    return () => { abort.abort(); clearTimeout(timer); };
  }, [wantsQr, connection?.id, connection?.uiState, connection?.qrRevision, connection?.operation?.status, connection?.pairingPhase]);
  useEffect(() => {
    setCheckedAt(Date.now());
    const age = connection?.lastCheckedAt ? Date.now() - Date.parse(connection.lastCheckedAt) : 30000;
    if (age >= 30000) return;
    const timer = setTimeout(() => { setCheckedAt(Date.now()); if (controller.current && document.visibilityState !== 'hidden' && Date.now() - lastRead.current >= 10000) void load(controller.current.signal).catch(() => undefined); }, 30000 - age);
    return () => clearTimeout(timer);
  }, [connection?.lastCheckedAt, load]);
  useEffect(() => { if (confirm) (confirmation.current?.closest('[role=dialog]')?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled)'))?.focus(); }, [confirm]);
  const cancel = () => { setRemovedOnPhone(false); setConfirm(null); (confirmationTrigger.current ?? disconnectButton.current)?.focus(); };
  async function command(action: WebAction | 'create', removedOnPhone?: boolean) {
    const abort = controller.current; if (!abort || commandBusy.current || pending(current.current) && !['disconnect', 'logout'].includes(action)) return;
    commandBusy.current = true; setBusy(true); setError(''); setQr(null);
    const commandId = crypto.randomUUID();
    if (action === 'create' || action === 'prepare_link') linkFlow.current = { id: commandId, stage: action };
    try {
      const value = action === 'create' ? await webProviderApi.create(commandId, abort.signal) : current.current ? await (removedOnPhone === undefined ? webProviderApi.command(current.current, action, commandId, abort.signal) : webProviderApi.command(current.current, action, commandId, abort.signal, removedOnPhone)) : null;
      if (abort.signal.aborted) return;
      if (action === 'create' && value?.operation?.action === 'create') linkFlow.current = { id: value.operation.id, stage: 'create' };
      apply(value); setWantsQr(action === 'connect' || action === 'refresh');
    } catch (reason) { if (!abort.signal.aborted) { linkFlow.current = null; await load(abort.signal).catch(() => undefined); setError(failure(reason)); } }
    finally { commandBusy.current = false; if (!abort.signal.aborted) setBusy(false); }
  }
  // Only the initiating gesture authorizes the second stage. REST/realtime
  // supplies the completed receipt/version; never issue connect concurrently.
  useEffect(() => {
    const flow = linkFlow.current;
    if (!flow || busy || !connection || connection.operation?.id !== flow.id) return;
    if (connection.operation.status === 'FAILED') { linkFlow.current = null; return; }
    if (connection.operation.status === 'COMPLETED') { linkFlow.current = null; void command('connect'); }
  });
  async function link() {
    const abort = controller.current; if (!abort || commandBusy.current) return;
    commandBusy.current = true; setBusy(true);
    try {
      const result = await webProviderApi.read(abort.signal); if (abort.signal.aborted) return;
      apply(result.connection); const c = result.connection;
      if (c?.operation?.action === 'create' && pending(c)) { linkFlow.current = { id: c.operation.id, stage: 'create' }; return; }
      if (c?.lifecycle?.preparationEligible && !pending(c)) { setRemovedOnPhone(false); setConfirm('prepare_link'); return; }
      if (c && !connectionPresentation(c, true, false).action) return;
      commandBusy.current = false; await command(c ? 'connect' : 'create');
    } catch (reason) { if (!abort.signal.aborted) setError(failure(reason)); }
    finally { commandBusy.current = false; if (!abort.signal.aborted) setBusy(false); }
  }
  async function setCapabilities(outboundEnabled: boolean, mediaEnabled: boolean) {
    const abort = controller.current, c = current.current;
    if (!abort || !c || commandBusy.current) return;
    commandBusy.current = true; setBusy(true); setError('');
    try { await webProviderApi.capabilities(c.id, outboundEnabled, mediaEnabled, abort.signal); if (!abort.signal.aborted) await load(abort.signal); }
    catch (reason) { if (!abort.signal.aborted) setError(failure(reason)); }
    finally { commandBusy.current = false; if (!abort.signal.aborted) { setBusy(false); setCapabilityConfirm(false); } }
  }
  const verified = !queryError && !loading && (!connection || connection.errorCode !== 'PROVIDER_UNAVAILABLE' && !!connection.lastCheckedAt && checkedAt - Date.parse(connection.lastCheckedAt) < 30000);
  const presentation = connectionPresentation(connection, verified, expired, checkedAt);
  const delayed = pending(connection) && !!connection?.operation?.createdAt && checkedAt - Date.parse(connection.operation.createdAt) >= 120000;
  const confirmed = presentation.connected, state = connection?.uiState ?? 'DISCONNECTED';
  const recovering = ['RUNNING', 'AUTHENTICATED'].includes(connection?.lifecycle?.recovery?.state ?? '');
  const disabled = loading || busy || pending(connection) || recovering;
  return <section className="web-provider-stack"><article className="provider-card web-provider-card" aria-labelledby={titleId}>
    <div className="provider-card-head"><div><span className="provider-mark"><AppIcon name="providers" /></span><div><h2 id={titleId}>WhatsApp</h2><p>Canal da organização selecionada.</p></div></div><span className={`provider-state ${confirmed ? 'is-enabled' : ''}`} role="status"><AppIcon name={confirmed ? 'providers' : 'status'} />{loading ? 'Carregando…' : presentation.status}</span></div>
    <p role="status">{presentation.guidance}</p>
    {connection?.lastCheckedAt && <p className="muted">Última verificação: {new Date(connection.lastCheckedAt).toLocaleString('pt-BR')}</p>}
    {error && <p role="alert" className="error-text">{error}</p>}
    {queryError && <p role="alert" className="error-text">Consulta do estado: {queryError} O último estado registrado foi preservado.</p>}
    {connection?.operation?.status === 'FAILED' && !connection.operation.action.startsWith('history_') && <p role="alert">A última solicitação não foi concluída: {errors[connection.operation.errorCode ?? ''] ?? 'Consulte o diagnóstico avançado.'}</p>}
    {connection?.lifecycle?.termination?.remote === 'CONFIRMED' && <p role="status">Desvinculação remota confirmada pelo WhatsApp.</p>}
    {connection?.lifecycle?.termination?.remote === 'UNCONFIRMED' && <p role="status">A remoção do aparelho no WhatsApp não foi confirmada. No celular, abra WhatsApp → Aparelhos conectados e desconecte este aparelho.</p>}
    {connection?.lifecycle?.termination?.action === 'disconnect' && <p role="status">Conexão parada. O vínculo e as credenciais foram preservados.</p>}
    <div className="provider-actions web-provider-primary-actions">
      {presentation.action && <button type="button" className="primary-button" disabled={loading || busy || recovering || pending(connection) && connection?.operation?.action !== 'create'} onClick={event => { const action = presentation.action!.command; if (action === 'recover') { confirmationTrigger.current = event.currentTarget; setConfirm('recover'); } else if (action === 'link') { confirmationTrigger.current = event.currentTarget; void link(); } else void command(action); }}>{busy ? 'Aguarde…' : presentation.action.label}</button>}
      {(!verified || delayed) && <button type="button" className="primary-button" disabled={checking || busy} onClick={() => controller.current && void load(controller.current.signal).catch(() => undefined)}>{checking ? 'Verificando…' : 'Verificar novamente'}</button>}
      {presentation.linked && <button type="button" className="secondary-button web-provider-unlink" disabled={loading || busy} onClick={event => { confirmationTrigger.current = event.currentTarget; setConfirm('logout'); }}>Desvincular WhatsApp</button>}
    </div>
    {(busy || pending(connection) && !delayed) && <p role="status"><span className="web-provider-spinner" aria-hidden="true" />Processando solicitação…</p>}
    {delayed && <p role="status">O resultado desta solicitação ainda não foi confirmado. {connection?.operation?.errorCode ? (errors[connection.operation.errorCode] ?? 'O serviço registrou uma falha de processamento.') : 'Aguardando reconciliação do serviço.'} Nenhuma nova operação será iniciada automaticamente.</p>}
    {qrLoading && <p role="status">Buscando QR Code…</p>}
    {qr && state === 'QR_READY' && <div className="web-provider-pairing"><QrImage value={qr.qr} /><div><h3>Vincular aparelho</h3><ol><li>Abra o WhatsApp no telefone.</li><li>Acesse Aparelhos conectados e selecione Conectar um aparelho.</li><li>Escaneie este QR Code para autorizar o vínculo.</li></ol><QrExpiry ttl={qr.expiresInMs} /><button type="button" className="text-button" onClick={() => { setWantsQr(false); setQr(null); }}>Ocultar QR Code</button></div></div>}
    {state === 'QR_READY' && !wantsQr && !expired && <button type="button" className="text-button" onClick={() => setWantsQr(true)}>Exibir QR Code</button>}
    {expired && <p role="status">QR Code expirado ou indisponível. Gere outro código para continuar.</p>}
  </article>
  {connection && <article className="provider-card">
    <section aria-label="Permissões de atendimento"><h3>Atendimento pelo Chat</h3><p className="muted">Envio: {connection.sendingEnabled ? 'autorizado' : 'desativado'}. Mídia: {connection.mediaEnabled ? 'autorizada' : 'desativada'}.</p><button type="button" className="secondary-button" disabled={disabled} onClick={() => setCapabilityConfirm(true)}>Configurar atendimento</button>{capabilityConfirm && <div role="group" aria-label="Confirmar autorização de atendimento"><p>Autorize somente texto para o piloto. Mensagens reais serão enviadas apenas quando um atendente clicar em Enviar. As permissões da organização continuam obrigatórias.</p><button type="button" className="primary-button" disabled={busy} onClick={() => void setCapabilities(true, false)}>Autorizar envio de texto</button><button type="button" className="secondary-button" disabled={busy} onClick={() => void setCapabilities(true, true)}>Autorizar envio e mídia</button><button type="button" className="secondary-button" disabled={busy} onClick={() => void setCapabilities(false, false)}>Desativar atendimento</button><button type="button" className="text-button" onClick={() => setCapabilityConfirm(false)}>Cancelar</button></div>}</section>
  </article>}
    {confirm && <div className="web-provider-backdrop"><section className="web-provider-dialog" role="dialog" aria-modal="true" aria-labelledby={`${titleId}-disconnect`} aria-describedby={descriptionId} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); cancel(); }
      if (event.key === 'Tab') { const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')]; const first = buttons[0], last = buttons.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    }}><h2 id={`${titleId}-disconnect`}>{confirm === 'prepare_link' ? 'Vincular WhatsApp novamente?' : confirm === 'recover' ? 'Restabelecer conexão?' : confirm === 'logout' ? 'Desvincular conta WhatsApp?' : 'Parar conexão?'}</h2><p id={descriptionId}>{confirm === 'prepare_link' ? (connection?.lifecycle?.removalConfirmationRequired ? 'Confirme que você já removeu este aparelho em WhatsApp → Aparelhos conectados no celular. Somente depois desta confirmação as credenciais anteriores serão aposentadas e um novo QR poderá ser solicitado. O histórico interno será preservado.' : 'A desvinculação remota foi confirmada. As credenciais anteriores serão aposentadas com segurança antes de solicitar um novo QR. O histórico interno será preservado.') : confirm === 'recover' ? 'Vamos tentar restabelecer o vínculo utilizando as credenciais existentes. Nenhum novo QR será gerado. Apenas uma tentativa será autorizada.' : confirm === 'logout' ? 'Solicita a remoção deste aparelho no WhatsApp e interrompe a conexão local. Se o serviço não conseguir confirmar a remoção, revogue o aparelho no celular. Histórico, contatos, tags e atribuições permanecem preservados.' : 'Interrompe a conexão e as tentativas pendentes, preservando as credenciais e os dados. A parada local não revoga o aparelho no WhatsApp.'}</p>{confirm === 'prepare_link' && connection?.lifecycle?.removalConfirmationRequired && <label className="web-provider-removal-confirmation"><input type="checkbox" checked={removedOnPhone} onChange={event => setRemovedOnPhone(event.target.checked)} />Já removi este aparelho em Aparelhos conectados no WhatsApp do celular.</label>}<button ref={confirmation} disabled={confirm === 'prepare_link' && !!connection?.lifecycle?.removalConfirmationRequired && !removedOnPhone} type="button" className="primary-button" onClick={() => { const action = confirm; cancel(); setWantsQr(false); if (action) void command(action, action === 'prepare_link' ? removedOnPhone : undefined); }}>{confirm === 'prepare_link' ? (connection?.lifecycle?.removalConfirmationRequired ? 'Já removi o aparelho; vincular novamente' : 'Confirmar nova vinculação') : confirm === 'recover' ? 'Autorizar uma tentativa' : confirm === 'logout' ? 'Confirmar desvinculação' : 'Confirmar parada'}</button><button type="button" className="secondary-button" onClick={cancel}>Cancelar</button></section></div>}
    {connection && <article className="provider-card"><div className="provider-card-head"><div><span className="provider-mark"><AppIcon name="conversations" /></span><div><h2>Sincronização de mensagens</h2><p>Recebimento automático de novas mensagens.</p></div></div><span className={`provider-state ${confirmed && state === 'CONNECTED' ? 'is-enabled' : ''}`}>{confirmed && state === 'CONNECTED' ? 'Ativa' : 'Aguardando conexão confirmada'}</span></div><p>Mensagens recebidas e enviadas pelo celular são incorporadas à Inbox em tempo real.</p><p className="muted">Histórico: {historySummary}</p><p className="muted">Última atividade confirmada: {connection.sync?.lastProcessedAt ? new Date(connection.sync.lastProcessedAt).toLocaleString('pt-BR') : 'Ainda sem atividade registrada'}</p>{!!connection.sync?.pendingFailures && <p role="status">Alguns dados aguardam nova tentativa. Consulte o diagnóstico.</p>}</article>}
    {connection && <HistoryControls connectionId={connection.id} revision={connection.version} connected={confirmed && state === 'CONNECTED' && !connection.errorCode} onStatus={setHistorySummary} />}
    <details className="provider-card provider-advanced"><summary>Diagnóstico avançado</summary><p className="muted">Esta integração utiliza um protocolo não oficial, sujeito a desconexões e restrições do WhatsApp.</p><p>Transporte: {connection?.transportConfirmed ? 'confirmado' : 'indisponível'}. Estado registrado: {connection?.state ?? 'sem registro'}.</p>{connection?.errorCode && <p role="alert">{errors[connection.errorCode] ?? 'Confira o diagnóstico do serviço.'} Código: {connection.errorCode}</p>}{connection?.operation?.status === 'FAILED' && <p>Última operação: {connection.operation.action} — {connection.operation.errorCode ?? 'falhou'}.</p>}{live !== 'open' && <p role="status">Atualização de estado interrompida ou conectando. <button type="button" className="text-button" onClick={() => controller.current && void load(controller.current.signal).catch(() => undefined)}>Consultar estado</button></p>}<div className="provider-actions">{connection && <button ref={disconnectButton} type="button" className="secondary-button" disabled={loading || busy} onClick={event => { confirmationTrigger.current = event.currentTarget; setConfirm('disconnect'); }}>Parar conexão</button>}<ProviderDiagnosticsButton provider="WHATSAPP_WEB" revision={connection?.version ?? 0} /></div>{connection && <SyncProgress connection={connection} />}</details>
  </section>;
}
