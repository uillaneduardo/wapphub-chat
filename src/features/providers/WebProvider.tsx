import { useCallback, useEffect, useId, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { AppIcon } from '../../components/AppIcon';
import { ProviderDiagnosticsButton } from './ProviderDiagnostics';
import { ApiError } from '../../lib/api';
import { createRealtimeUrl, RealtimeClient } from '../../lib/realtime';
import { webProviderApi, type WebAction, type WebConnection, type WebQr, type WebState } from '../../lib/webProviderApi';
import { useSession } from '../session/SessionContext';
import './web-provider.css';
const labels: Record<WebState, string> = { DISCONNECTED: 'Desconectado', CONNECTING: 'Conectando', QR_READY: 'QR disponível', CONNECTED: 'Conectado', RECONNECTING: 'Reconectando', ERROR: 'Erro de conexão' };
const errors: Record<string, string> = {
  QR_NOT_AVAILABLE: 'O QR expirou ou ainda não foi gerado. Solicite um novo QR.', QR_EXPIRED: 'O QR expirou. Solicite um novo QR.', QR_CHANGED: 'O QR foi atualizado. Exiba o QR atual.',
  CONNECTION_VERSION_CONFLICT: 'A conexão mudou durante a operação. Confira o estado atual e tente novamente.', CONNECTION_OPERATION_PENDING: 'Há uma operação em andamento. Aguarde a atualização.',
  PROVIDER_UNAVAILABLE: 'O serviço está temporariamente indisponível. Tente novamente.', PROVIDER_NOT_ENABLED: 'A integração ainda não está habilitada.',
  CONNECTIONS_DISABLED: 'Novas conexões estão temporariamente bloqueadas.', COMMAND_AUTHORIZATION_REVOKED: 'O acesso mudou antes de executar o comando. Atualize sua sessão.',
  PAIRING_TIMEOUT: 'O prazo para vincular o aparelho terminou. Solicite um novo QR.', SESSION_REPLACED: 'A sessão foi substituída em outro aparelho.', SESSION_REVOKED: 'O vínculo foi revogado. Vincule o aparelho novamente.', RECONNECT_LIMIT: 'Não foi possível reconectar. Solicite uma nova conexão.', CONNECTION_LOST: 'Conexão interrompida. O serviço está tentando recuperar a sessão.',
};
const failure = (reason: unknown) => reason instanceof ApiError && reason.status === 403 ? 'Você não tem acesso para gerenciar esta conexão.' : reason instanceof ApiError ? errors[reason.code ?? ''] ?? 'Não foi possível concluir a operação. Confira a conexão e tente novamente.' : 'Não foi possível conectar à API. Tente novamente.';
const pending = (connection: WebConnection | null) => ['PENDING', 'PROCESSING'].includes(connection?.operation?.status ?? '');
function SyncProgress({ connection }: { connection: WebConnection }) {
  const sync = connection.sync; if (!sync) return null;
  const provider = sync.provider;
  const diagnostics = provider?.diagnostics;
  const failures = sync.failures + (provider?.failures ?? 0) + (sync.failedAttempts ?? 0);
  const rejected = (sync.rejectedItems ?? 0) + (diagnostics?.rejected ?? 0);
  const active = Boolean(provider?.queued || provider?.historyEnabled && ['CONTACTS', 'MESSAGES'].includes(provider.phase));
  const label = sync.failures || (provider?.failures ?? 0) || rejected || sync.pendingFailures || provider?.limited || provider?.phase === 'PARTIAL' ? 'Sincronização parcial ou com falhas' : active && provider?.phase === 'CONTACTS' ? 'Sincronizando contatos' : active ? 'Sincronizando conversas e mensagens' : provider?.phase === 'PROCESSED' ? 'Sincronização inicial processada' : provider?.phase === 'AWAITING_HISTORY' ? 'Aguardando histórico disponibilizado pelo WhatsApp' : 'Sincronização contínua ativa';
  return <section className="web-provider-sync" aria-label="Progresso da sincronização">
    <h3>{label}</h3>{active && <p role="status"><span className="web-provider-spinner" aria-hidden="true" />Processando em segundo plano. Você pode continuar navegando.</p>}
    <dl><div><dt>Contatos criados ou atualizados</dt><dd>{sync.contacts}</dd></div><div><dt>Conversas criadas</dt><dd>{sync.conversations}</dd></div><div><dt>Mensagens persistidas</dt><dd>{sync.messages}</dd></div><div><dt>Falhas de processamento</dt><dd>{failures}</dd></div></dl>
    <p className="muted">Contatos, conversas e mensagens acima refletem persistência no Core. Falhas incluem registros do Provider e tentativas malsucedidas do Core. Uma mensagem pode usar uma conversa já existente, sem aumentar “Conversas criadas”. Conversas sem atendente ficam em Não atribuídas e também em Todas para quem pode supervisionar.</p>
    {sync.diagnosticsSince && <dl><div><dt>Itens em lotes registrados no Core</dt><dd>{sync.receivedItems ?? 0}</dd></div><div><dt>Itens processados no Core</dt><dd>{sync.processedItems ?? 0}</dd></div><div><dt>Duplicidades no Core</dt><dd>{sync.duplicateItems ?? 0}</dd></div><div><dt>Itens rejeitados no Core</dt><dd>{sync.rejectedItems ?? 0}</dd></div><div><dt>Conversas localizadas em eventos</dt><dd>{sync.conversationsLocated ?? 0}</dd></div><div><dt>Tentativas com falha ao persistir</dt><dd>{sync.failedAttempts ?? 0}</dd></div><div><dt>Lotes com falha aguardando nova tentativa</dt><dd>{sync.pendingFailures ?? 0}</dd></div></dl>}
    {diagnostics && <><p>Diagnóstico do recebimento a partir de {new Date(diagnostics.since).toLocaleString('pt-BR')}:</p><dl><div><dt>Itens recebidos no Provider</dt><dd>{diagnostics.received}</dd></div><div><dt>Itens normalizados</dt><dd>{diagnostics.normalized}</dd></div><div><dt>Itens ignorados pelo protocolo ou conteúdo</dt><dd>{diagnostics.ignored}</dd></div><div><dt>Itens rejeitados antes do Core</dt><dd>{diagnostics.rejected}</dd></div><div><dt>Lotes publicados</dt><dd>{diagnostics.publishedBatches}</dd></div><div><dt>Lotes confirmados pelo Core</dt><dd>{diagnostics.acknowledgedBatches}</dd></div></dl>{diagnostics.legacyFailures > 0 && <p role="alert">Há {diagnostics.legacyFailures} registros anteriores de falha sem causa registrada. Eles foram preservados e não comprovam perda de mensagens. Os novos diagnósticos distinguem avisos do protocolo, rejeições e erros.</p>}</>}
    {!diagnostics && (provider?.failures ?? 0) > 0 && <p role="status">Há {provider?.failures} falhas registradas apenas como contador. Não é possível reconstruir seus detalhes com segurança.</p>}
    {provider && <p className="muted">Itens na fila: {provider.queued}</p>}
    {sync.lastErrorCode && <p role="alert">{sync.lastErrorCode === 'IDENTITY_MAPPING_CONFLICT' ? 'Uma identidade externa está vinculada a contatos distintos. Os dados foram preservados; a associação precisa ser revisada.' : 'Alguns itens não puderam ser processados. Os demais continuam sendo sincronizados.'}</p>}
    {!provider?.historyEnabled && <p>Histórico inicial desativado. Apenas mensagens novas e eventos recentes disponibilizados na sessão são processados. Nenhum novo pareamento será feito automaticamente.</p>}
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
// Parent mounts a new instance for each user/org/permission version. No QR or
// lifecycle state survives navigation, a permission change or tenant switching.
export function WebProviderCard({ organizationId }: { organizationId: string }) {
  const { expireSession, refreshSession } = useSession();
  const [connection, setConnection] = useState<WebConnection | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [wantsQr, setWantsQr] = useState(false), [qr, setQr] = useState<WebQr | null>(null), [qrLoading, setQrLoading] = useState(false), [expired, setExpired] = useState(false), [confirm, setConfirm] = useState(false), [live, setLive] = useState('connecting');
  const controller = useRef<AbortController | null>(null), commandBusy = useRef(false), readSequence = useRef(0), current = useRef<WebConnection | null>(null), disconnectButton = useRef<HTMLButtonElement>(null), confirmation = useRef<HTMLButtonElement>(null);
  const titleId = useId(), descriptionId = useId();
  const apply = useCallback((value: WebConnection | null) => {
    if (value && current.current?.id === value.id && value.version < current.current.version) return;
    current.current = value; setConnection(value);
  }, []);
  const load = useCallback(async (signal: AbortSignal) => {
    const sequence = ++readSequence.current;
    try { const value = await webProviderApi.read(signal); if (!signal.aborted && sequence === readSequence.current) { apply(value.connection); setError(''); } }
    catch (reason) { if (!signal.aborted && sequence === readSequence.current) { setError(failure(reason)); throw reason; } }
    finally { if (!signal.aborted) setLoading(false); }
  }, [apply]);
  useEffect(() => {
    const abort = new AbortController(); controller.current = abort;
    void load(abort.signal).catch(() => undefined);
    const url = new URL(createRealtimeUrl(import.meta.env.VITE_API_BASE_URL || window.location.origin)); url.pathname = '/api/v1/providers/realtime';
    const client = new RealtimeClient({ url: url.toString(), organizationId, checkpointStore: { get: () => null, set: () => undefined },
      onEvent: (event, signal) => event.type === 'provider.connection.updated' ? load(signal) : undefined, onReconcile: load,
      onUnauthorized: expireSession, onPermissionsChanged: () => void refreshSession(true), onState: setLive });
    client.connect(); const retry = () => client.retry(); window.addEventListener('online', retry);
    return () => { abort.abort(); client.close(); controller.current = null; window.removeEventListener('online', retry); };
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
      setError(''); setQr(value); timer = setTimeout(() => { setQr(null); setExpired(true); }, remaining);
    }).catch((reason) => { if (!abort.signal.aborted) { setError(failure(reason)); setExpired(true); } }).finally(() => { if (!abort.signal.aborted) setQrLoading(false); });
    return () => { abort.abort(); clearTimeout(timer); };
  }, [wantsQr, connection?.id, connection?.uiState, connection?.qrRevision, connection?.operation?.status, connection?.pairingPhase]);
  useEffect(() => { if (confirm) confirmation.current?.focus(); }, [confirm]);
  const cancel = () => { setConfirm(false); disconnectButton.current?.focus(); };
  async function command(action: WebAction | 'create') {
    const abort = controller.current; if (!abort || commandBusy.current || pending(current.current)) return;
    commandBusy.current = true; setBusy(true); setError(''); setQr(null);
    try {
      const value = action === 'create' ? await webProviderApi.create(crypto.randomUUID(), abort.signal) : current.current ? await webProviderApi.command(current.current, action, crypto.randomUUID(), abort.signal) : null;
      if (abort.signal.aborted) return; apply(value); setWantsQr(action === 'connect' || action === 'refresh');
    } catch (reason) { if (!abort.signal.aborted) { await load(abort.signal).catch(() => undefined); setError(failure(reason)); } }
    finally { commandBusy.current = false; if (!abort.signal.aborted) setBusy(false); }
  }
  const disabled = loading || busy || pending(connection), state = connection?.uiState ?? 'DISCONNECTED';
  return <article className="provider-card web-provider-card" aria-labelledby={titleId}>
    <div className="provider-card-head"><div><span className="provider-mark"><AppIcon name="providers" /></span><div><h2 id={titleId}>WhatsApp Web</h2><p>Vincule um aparelho à organização selecionada.</p></div></div><span className={`provider-state ${state === 'CONNECTED' ? 'is-enabled' : ''}`} role="status">{loading ? 'Carregando…' : connection ? `${connection.errorCode === 'PROVIDER_UNAVAILABLE' ? 'Último estado: ' : ''}${expired && state === 'QR_READY' ? 'QR indisponível' : labels[state]}` : 'Sem conexão'}</span></div>
    <p className="provider-warning">Esta integração utiliza um protocolo não oficial, sujeito a desconexões e restrições do WhatsApp.</p>
    {error && <p role="alert" className="error-text">{error}</p>}{!error && connection?.errorCode && <p role="alert">{errors[connection.errorCode] ?? 'A operação falhou. Confira a conexão e tente novamente.'}</p>}
    {live !== 'open' && <p role="status">Atualização de estado interrompida ou conectando. <button type="button" className="text-button" onClick={() => controller.current && void load(controller.current.signal).catch(() => undefined)}>Consultar estado</button></p>}
    {!error && connection?.operation?.status === 'FAILED' && connection.operation.errorCode !== connection.errorCode && <p role="status">Última operação: {errors[connection.operation.errorCode ?? ''] ?? 'não foi possível concluir. Tente novamente.'}</p>}
    {pending(connection) && <p role="status">Operação solicitada. Aguardando confirmação do serviço…</p>}
    {(busy || pending(connection) || state === 'CONNECTING' || connection?.pairingPhase === 'AUTHENTICATING') && <p role="status"><span className="web-provider-spinner" aria-hidden="true" />{connection?.pairingPhase === 'AUTHENTICATING' ? 'Autenticando…' : state === 'CONNECTING' && !pending(connection) ? 'Gerando QR Code…' : 'Preparando conexão…'}</p>}
    {state === 'QR_READY' && !expired && connection?.pairingPhase !== 'AUTHENTICATING' && <p role="status">Aguardando leitura do QR Code.</p>}
    {state === 'CONNECTED' && <p role="status">WhatsApp conectado.</p>}
    {connection && <SyncProgress connection={connection} />}
    <div className="provider-actions"><ProviderDiagnosticsButton provider="WHATSAPP_WEB" count={(connection?.sync?.provider?.failures ?? 0) + (connection?.sync?.pendingFailures ?? 0) + (connection?.sync?.rejectedItems ?? 0)} revision={connection?.version ?? 0} />
      {!connection && <button type="button" className="primary-button" disabled={disabled} onClick={() => void command('create')}>{busy ? 'Criando…' : 'Criar conexão'}</button>}
      {connection && ['DISCONNECTED', 'ERROR'].includes(state) && <button type="button" className="primary-button" disabled={disabled} onClick={() => void command('connect')}>{busy ? 'Solicitando…' : 'Solicitar QR Code'}</button>}
      {connection && state === 'QR_READY' && !wantsQr && <button type="button" className="primary-button" disabled={disabled} onClick={() => setWantsQr(true)}>Exibir QR Code</button>}
      {connection && ['QR_READY', 'CONNECTING'].includes(state) && <button type="button" className="secondary-button" disabled={disabled || qrLoading || connection.pairingPhase === 'AUTHENTICATING'} onClick={() => { setWantsQr(false); void command('refresh'); }}>Atualizar QR Code</button>}
      {connection && <button ref={disconnectButton} type="button" className="secondary-button" disabled={disabled || ['DISCONNECTED', 'ERROR'].includes(state)} onClick={() => setConfirm(true)}>Desconectar</button>}
    </div>
    {qrLoading && <p role="status">Buscando QR Code…</p>}{qr && connection?.uiState === 'QR_READY' && <div className="web-provider-pairing"><QrImage value={qr.qr} /><div><h3>Vincular aparelho</h3><ol><li>Abra o WhatsApp no telefone.</li><li>Acesse Aparelhos conectados e selecione Conectar um aparelho.</li><li>Escaneie este QR Code para autorizar o vínculo.</li></ol><p>O código expira em poucos segundos e será removido da tela. Você pode solicitar uma atualização.</p><button type="button" className="text-button" onClick={() => { setWantsQr(false); setQr(null); }}>Ocultar QR Code</button></div></div>}
    {expired && <p role="status">QR Code expirado ou indisponível. Atualize o código para continuar.</p>}
    <p className="provider-detail">Envio pelo Chat e recursos multimídia ainda indisponíveis nesta etapa.</p>
    {confirm && <div className="web-provider-backdrop"><section className="web-provider-dialog" role="dialog" aria-modal="true" aria-labelledby={`${titleId}-disconnect`} aria-describedby={descriptionId} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); cancel(); }
      if (event.key === 'Tab') { const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]; const first = buttons[0], last = buttons.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    }}><h2 id={`${titleId}-disconnect`}>Desconectar WhatsApp Web?</h2><p id={descriptionId}>Esta ação revoga o vínculo do aparelho. Será necessário escanear um novo QR para conectar novamente. O histórico permanece preservado.</p><button ref={confirmation} type="button" className="primary-button" onClick={() => { cancel(); setWantsQr(false); void command('disconnect'); }}>Confirmar desconexão</button><button type="button" className="secondary-button" onClick={cancel}>Cancelar</button></section></div>}
  </article>;
}
