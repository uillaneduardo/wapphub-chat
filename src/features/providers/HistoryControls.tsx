import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { webHistoryApi, type HistoryAction, type HistoryStatus } from '../../lib/webHistoryApi';
import { useSession } from '../session/SessionContext';
const labels = { PREPARED: 'Preparada', RUNNING: 'Processando', WAITING: 'Aguardando resposta', BACKPRESSURE: 'Aguardando espaço na fila', PAUSED: 'Pausada', CANCELLED: 'Cancelada', COMPLETED: 'Lotes disponibilizados processados', PARTIAL: 'Parcial ou com falhas', NO_DATA: 'Sem resposta no prazo', FAILED: 'Falhou' };
const errors: Record<string, string> = { HISTORY_EXECUTION_DISABLED: 'A execução real está bloqueada. É necessária autorização específica para ativá-la.', HISTORY_ANCHOR_REQUIRED: 'Nenhuma conversa com mensagem de referência está disponível. O protocolo não oferece uma listagem completa de conversas por esta operação.', HISTORY_OPERATION_PENDING: 'Já há uma preparação ou operação pendente.', HISTORY_TRANSPORT_UNAVAILABLE: 'A conexão precisa estar disponível para preparar o histórico.', CONNECTION_VERSION_CONFLICT: 'O estado mudou. Consulte novamente antes de tentar.', HISTORY_RESPONSE_TIMEOUT: 'O WhatsApp não retornou dados no prazo. Isso não comprova ausência de histórico.', HISTORY_RESTART_PAUSED: 'A operação foi pausada após reinício. As credenciais e os itens admitidos foram preservados.', HISTORY_AUTHORIZATION_EXPIRED: 'A autorização temporária expirou. A operação foi pausada.', HISTORY_BACKPRESSURE: 'O produtor foi pausado para preservar a fila.', HISTORY_BYTE_LIMIT: 'O limite de volume foi atingido. Os dados já admitidos foram preservados.' };
export function HistoryControls({ connectionId, revision, connected }: { connectionId: string; revision: number; connected: boolean }) {
 const { session } = useSession();
 const allowed = ['providers.manage', 'providers.diagnostics.read', 'conversations.supervise', 'messages.read'].every((permission) => session?.permissions.includes(permission));
 return allowed ? <HistoryPanel key={`${session?.currentOrganizationId}:${connectionId}`} connectionId={connectionId} revision={revision} connected={connected} /> : null;
}
function HistoryPanel({ connectionId, revision, connected }: { connectionId: string; revision: number; connected: boolean }) {
 const [open, setOpen] = useState(false), [status, setStatus] = useState<HistoryStatus | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [messages, setMessages] = useState(20), [refresh, setRefresh] = useState(0), [confirm, setConfirm] = useState<HistoryAction | null>(null);
 const commandAbort = useRef<AbortController | null>(null), locked = useRef(false);
 useEffect(() => () => commandAbort.current?.abort(), []);
 useEffect(() => { if (!open) return; const request = new AbortController(); const timer = setTimeout(() => {
  void webHistoryApi.read(connectionId, request.signal).then((value) => { if (!request.signal.aborted) { setStatus(value); setError(''); } }).catch(() => { if (!request.signal.aborted) setError('Histórico indisponível. Tente consultar novamente.'); });
 }, 200); return () => { clearTimeout(timer); request.abort(); }; }, [open, connectionId, revision, refresh]);
 async function run(action: 'prepare' | HistoryAction) {
  if (!status || locked.current) return;
  const request = new AbortController(); commandAbort.current = request;
  locked.current = true; setBusy(true); setError(''); setConfirm(null);
  try {
   if (action === 'prepare') await webHistoryApi.prepare(connectionId, status.version, messages, crypto.randomUUID(), request.signal);
   else if (status.operation) await webHistoryApi.command(connectionId, status.version, status.operation.id, action, crypto.randomUUID(), request.signal);
   if (!request.signal.aborted) setRefresh((n) => n + 1);
  } catch (reason) { if (!request.signal.aborted) { setError(reason instanceof ApiError ? errors[reason.code ?? ''] ?? 'Não foi possível concluir. Consulte o estado antes de tentar novamente.' : 'Não foi possível conectar à API.'); } }
  finally { locked.current = false; if (!request.signal.aborted) setBusy(false); }
 }
 const op = status?.operation, active = op && ['PREPARED', 'RUNNING', 'WAITING', 'BACKPRESSURE', 'PAUSED'].includes(op.state);
 return <section className="web-provider-history" aria-label="Importação histórica controlada"><button className="text-button" aria-expanded={open} onClick={() => { setOpen(!open); setConfirm(null); }}>Histórico controlado</button>{open && <div>
  <p>Operação limitada aos dados que o protocolo disponibilizar. Conversas conhecidas fornecem referências; a descoberta de todas as conversas antigas não é garantida.</p>
  {!status && !error && <p role="status">Consultando preparação…</p>}{error && <p role="alert">{error}</p>}
  {status && <><p role="status">{status.executionEnabled ? 'Execução habilitada para operações administrativas autorizadas.' : 'Execução real bloqueada. Preparar não solicita dados ao WhatsApp.'}</p>
   <p className="muted">Até 500 contatos, 500 conversas, 1.000 mensagens e janela de 30 dias. Sem download de mídias. Mensagens novas têm prioridade.</p>
   {op && <><h3>{labels[op.state]}</h3><p>Janela: {new Date(op.from).toLocaleDateString('pt-BR')} a {new Date(op.to).toLocaleDateString('pt-BR')} · Limite de mensagens: {op.limits.messages}</p><dl><div><dt>Contatos novos persistidos</dt><dd>{op.persisted.contacts}</dd></div><div><dt>Conversas novas persistidas</dt><dd>{op.persisted.conversations}</dd></div><div><dt>Mensagens novas persistidas</dt><dd>{op.persisted.messages}</dd></div><div><dt>Duplicidades no Core</dt><dd>{op.duplicates}</dd></div><div><dt>Itens rejeitados no Core</dt><dd>{op.rejected}</dd></div>{op.source && <><div><dt>Itens admitidos na origem</dt><dd>{op.source.contacts + op.source.conversations + op.source.messages}</dd></div><div><dt>Solicitações de protocolo</dt><dd>{op.source.requests}</dd></div><div><dt>Itens históricos na fila</dt><dd>{op.source.queued}</dd></div><div><dt>Falhas do produtor</dt><dd>{op.source.failures}</dd></div></>}</dl>{op.source?.errorCode && <p role="status">{errors[op.source.errorCode] ?? 'A operação encontrou uma limitação. Consulte o diagnóstico autorizado.'}</p>}<p className="muted">Operação: {op.id}. Estes contadores não comprovam a importação de todo o histórico.</p></>}
   {!active && <form onSubmit={(event) => { event.preventDefault(); void run('prepare'); }}><label>Limite de mensagens<input type="number" min={1} max={1000} required value={messages} onChange={(event) => setMessages(Number(event.target.value))} /></label><button className="secondary-button" disabled={busy || !connected || messages < 1 || messages > 1000 || !Number.isInteger(messages)}>Preparar operação</button></form>}
   {op && <div className="provider-actions">{op.state === 'PREPARED' && <button className="secondary-button" disabled={busy || !connected || !status.executionEnabled} onClick={() => setConfirm('start')}>Iniciar importação</button>}{op.state === 'PAUSED' && <button className="secondary-button" disabled={busy || !connected || !status.executionEnabled} onClick={() => setConfirm('resume')}>Retomar importação</button>}{['RUNNING', 'WAITING', 'BACKPRESSURE'].includes(op.state) && <button className="secondary-button" disabled={busy} onClick={() => void run('pause')}>Pausar produtor</button>}{!['COMPLETED', 'NO_DATA', 'FAILED', 'CANCELLED'].includes(op.state) && <button className="secondary-button" disabled={busy} onClick={() => void run('cancel')}>Cancelar produtor</button>}</div>}
   {confirm && <div role="group" aria-label="Confirmar importação"><p>Esta ação solicita histórico ao aparelho existente dentro dos limites preparados. Não garante completude. Deseja executar a operação autorizada?</p><button className="primary-button" disabled={busy} onClick={() => void run(confirm)}>Confirmar execução</button><button className="text-button" onClick={() => setConfirm(null)}>Voltar</button></div>}
  </>}{busy && <p role="status">Solicitando operação pelo Core…</p>}<button className="text-button" disabled={busy} onClick={() => setRefresh((n) => n + 1)}>Consultar preparação</button><p className="muted">Pausa e cancelamento interrompem o produtor; lotes já admitidos podem concluir a persistência. Nenhum dado existente será apagado.</p>
 </div>}</section>;
}
