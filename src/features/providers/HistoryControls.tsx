import { useEffect, useId, useRef, useState } from 'react';
import { History, Pause, Play, Power } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { webHistoryApi, type HistoryStatus } from '../../lib/webHistoryApi';
import { useSession } from '../session/SessionContext';
const labels = { PREPARED: 'Aguardando dados', RUNNING: 'Sincronizando', WAITING: 'Aguardando dados', BACKPRESSURE: 'Sincronizando', PAUSED: 'Em pausa', CANCELLED: 'Não ativado', COMPLETED: 'Atualizado até os dados conhecidos', PARTIAL: 'Parcial', NO_DATA: 'Sem histórico adicional disponível', FAILED: 'Erro' };
const errors: Record<string, string> = {
 HISTORY_EXECUTION_DISABLED: 'A sincronização histórica está indisponível neste momento.',
 HISTORY_TRANSPORT_UNAVAILABLE: 'Aguarde a confirmação da conexão para ativar.',
 HISTORY_BUDGET_OR_REVIEW_REQUIRED: 'O limite autorizado foi atingido ou a tentativa precisa de revisão. O orçamento não será ampliado automaticamente.',
 CONNECTION_VERSION_CONFLICT: 'O estado mudou. Consulte novamente antes de tentar.',
 HISTORY_RESPONSE_TIMEOUT: 'O WhatsApp não retornou dados no prazo. A tentativa é inconclusiva e não será repetida automaticamente.',
 HISTORY_REQUEST_UNCERTAIN: 'Não foi possível confirmar o resultado da solicitação. Novas tentativas foram interrompidas.',
 HISTORY_RESTART_UNCERTAIN: 'Uma solicitação foi interrompida e seu resultado é incerto. Ela não será repetida automaticamente.',
 HISTORY_RESTART_PAUSED: 'Retomando os dados preservados após reinício.',
 HISTORY_AUTHORIZATION_EXPIRED: 'A sincronização foi pausada até o backend confirmar que pode continuar.',
 HISTORY_LIVE_BACKLOG: 'O histórico está em pausa para priorizar mensagens novas.',
 HISTORY_MEMORY_PRESSURE: 'O histórico está em pausa para preservar os recursos do serviço.',
 HISTORY_BYTE_LIMIT: 'O limite de volume foi atingido. Os dados já importados foram preservados.',
};
export function HistoryControls({ connectionId, revision, connected, onStatus }: { connectionId: string; revision: number; connected: boolean; onStatus?: (label: string) => void }) {
 const { session } = useSession();
 const allowed = ['providers.manage', 'providers.diagnostics.read', 'conversations.supervise', 'messages.read'].every((permission) => session?.permissions.includes(permission));
 return allowed ? <HistoryPanel key={`${session?.currentOrganizationId}:${connectionId}`} connectionId={connectionId} revision={revision} connected={connected} onStatus={onStatus} /> : null;
}
function HistoryPanel({ connectionId, revision, connected, onStatus }: { connectionId: string; revision: number; connected: boolean; onStatus?: (label: string) => void }) {
 const [status, setStatus] = useState<HistoryStatus | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0), [confirm, setConfirm] = useState(false);
 const commandAbort = useRef<AbortController | null>(null), locked = useRef(false), enableButton = useRef<HTMLButtonElement>(null), cancelButton = useRef<HTMLButtonElement>(null), title = useId();
 useEffect(() => () => commandAbort.current?.abort(), []);
 useEffect(() => { if (confirm) cancelButton.current?.focus(); }, [confirm]);
 useEffect(() => { const request = new AbortController(); const timer = setTimeout(() => {
  void webHistoryApi.read(connectionId, request.signal).then((value) => { if (!request.signal.aborted) { setStatus(value); setError(''); } }).catch(() => { if (!request.signal.aborted) setError('Histórico indisponível. Tente consultar novamente.'); });
 }, 200); return () => { clearTimeout(timer); request.abort(); }; }, [connectionId, revision, refresh]);
 const closeConfirm = () => { setConfirm(false); enableButton.current?.focus(); };
 async function run(action: 'enable' | 'pause' | 'disable') {
  if (!status || locked.current) return;
  const request = new AbortController(); commandAbort.current = request;
  locked.current = true; setBusy(true); setError(''); setConfirm(false);
  try {
   await webHistoryApi.configure(connectionId, status.version, action, crypto.randomUUID(), request.signal, action === 'enable');
   if (!request.signal.aborted) setRefresh((n) => n + 1);
  } catch (reason) { if (!request.signal.aborted) { setError(reason instanceof ApiError ? errors[reason.code ?? ''] ?? 'Não foi possível concluir. Consulte o estado antes de tentar novamente.' : 'Não foi possível conectar à API.'); setRefresh((n) => n + 1); } }
  finally { locked.current = false; if (!request.signal.aborted) setBusy(false); }
 }
 const op = status?.operation, grant = op?.authorization, enabled = grant?.state === 'ENABLED';
 const exhausted = !!op && (op.source?.messages === op.limits.messages || op.source?.requests === 16);
 const uncertain = ['HISTORY_RESPONSE_TIMEOUT', 'HISTORY_REQUEST_UNCERTAIN', 'HISTORY_RESTART_UNCERTAIN'].includes(op?.source?.errorCode ?? '');
 const label = !grant || grant.state === 'DISABLED' ? 'Não ativado' : grant.state === 'PAUSED' ? 'Em pausa' : exhausted ? 'Limite autorizado atingido' : uncertain ? 'Tentativa inconclusiva' : op?.source?.state === 'NO_DATA' && op.source.requests === 0 ? 'Aguardando dados' : op ? labels[op.state] : 'Aguardando dados';
 useEffect(() => { onStatus?.(status ? label : 'Consultando…'); }, [label, onStatus, status]);
 return <article className="provider-card web-provider-history" aria-labelledby={title}>
  <div className="provider-card-head"><div><span className="provider-mark"><History size={20} aria-hidden="true" /></span><div><h2 id={title}>Histórico de conversas</h2><p>Sincronização de histórico em segundo plano.</p></div></div><span className="provider-state" role="status">{status ? label : 'Consultando…'}</span></div>
  <p className="muted">Nem todo histórico pode estar disponível. A recuperação usa referências de conversas conhecidas e pode ser parcial.</p>
  {error && <p role="alert" className="error-text">{error}</p>}
  {op && grant && <><p><strong>{op.persisted.messages}</strong> mensagens efetivamente importadas · limite autorizado de {op.limits.messages} mensagens.</p><p className="muted">Última atividade: {new Date(op.source?.lastProcessedAt ?? grant.authorizedAt).toLocaleString('pt-BR')}</p>{(op.source?.errorCode || op.errorCode) && <p role="status">{errors[op.source?.errorCode ?? op.errorCode ?? ''] ?? 'A recuperação encontrou uma limitação. Consulte o diagnóstico avançado.'}</p>}{exhausted && <p>O piloto atingiu seu orçamento. Novas operações exigem ampliação explícita da política da organização.</p>}</>}
  {status && <div className="provider-actions">
   {!enabled && <button ref={enableButton} className="primary-button" disabled={busy || !connected || !status.executionEnabled || exhausted || uncertain} onClick={() => setConfirm(true)}><Play size={16} aria-hidden="true" />{grant ? 'Retomar sincronização' : 'Ativar sincronização'}</button>}
   {enabled && <button className="secondary-button" disabled={busy} onClick={() => void run('pause')}><Pause size={16} aria-hidden="true" />Pausar sincronização</button>}
   {grant && grant.state !== 'DISABLED' && <button className="text-button" disabled={busy} onClick={() => void run('disable')}><Power size={16} aria-hidden="true" />Desativar histórico</button>}
   <button className="text-button" disabled={busy} onClick={() => setRefresh((n) => n + 1)}>Consultar estado do histórico</button>
  </div>}
  {status && !status.executionEnabled && <p className="muted">Sincronização histórica temporariamente indisponível.</p>}
  {busy && <p role="status">Registrando configuração…</p>}
  {confirm && <div className="web-provider-backdrop"><section className="web-provider-dialog" role="dialog" aria-modal="true" aria-labelledby={`${title}-confirm`} onKeyDown={(event) => {
   if (event.key === 'Escape') { event.preventDefault(); closeConfirm(); }
   if (event.key === 'Tab') { const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]; const first = buttons[0], last = buttons.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
  }}><h2 id={`${title}-confirm`}>Ativar sincronização de histórico?</h2><p>Você autoriza solicitações reais de histórico à conta WhatsApp desta conexão, exclusivamente nesta organização.</p><p>Limite inicial: 20 mensagens, janela de 30 dias e até 16 solicitações. A recuperação pode ser parcial ou indisponível.</p><p>O backend continuará trabalhando mesmo com esta aba fechada. Você pode pausar ou desativar futuras solicitações; os dados importados serão preservados.</p><div className="provider-actions"><button className="primary-button" disabled={busy} onClick={() => void run('enable')}>Confirmar ativação</button><button ref={cancelButton} className="secondary-button" onClick={closeConfirm}>Cancelar</button></div></section></div>}
  {op && <details className="provider-advanced"><summary>Diagnóstico do histórico</summary><dl><div><dt>Mensagens novas persistidas</dt><dd>{op.persisted.messages}</dd></div><div><dt>Contatos novos persistidos</dt><dd>{op.persisted.contacts}</dd></div><div><dt>Conversas novas persistidas</dt><dd>{op.persisted.conversations}</dd></div><div><dt>Duplicidades no Core</dt><dd>{op.duplicates}</dd></div><div><dt>Itens rejeitados no Core</dt><dd>{op.rejected}</dd></div>{op.source && <><div><dt>Requisições históricas</dt><dd>{op.source.requests}</dd></div><div><dt>Itens históricos na fila</dt><dd>{op.source.queued}</dd></div><div><dt>Falhas do produtor</dt><dd>{op.source.failures}</dd></div><div><dt>Mensagens admitidas na origem</dt><dd>{op.source.messages}</dd></div></>}</dl><p>Janela: {new Date(op.from).toLocaleDateString('pt-BR')} a {new Date(op.to).toLocaleDateString('pt-BR')}. Até 500 contatos e 500 conversas. Estado da operação anterior ou atual: {labels[op.state]}.</p><p className="muted">Recibos e checkpoints são duráveis. Lotes já admitidos podem concluir a persistência após pausa. Nenhum contador comprova a recuperação de todo o histórico.</p></details>}
 </article>;
}
