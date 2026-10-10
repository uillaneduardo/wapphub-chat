import { useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { providerDiagnosticsApi, sanitizedDiagnostic, type DiagnosticOccurrence, type DiagnosticPage, type DiagnosticHealth, type DiagnosticProvider } from '../../lib/providerDiagnosticsApi';
import { useSession } from '../session/SessionContext';
import './provider-diagnostics.css';
const states: Record<string, string> = { ACTIVE: 'Aguardando retentativa', RECOVERED: 'Recuperada', REJECTED: 'Rejeitada', DEAD_LETTER: 'Dead-letter', ACCEPTED: 'Aceita', WAITING: 'Aguardando processamento' };
const time = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : 'Não disponível';
function Occurrence({ row, provider }: { row: DiagnosticOccurrence; provider: DiagnosticProvider }) {
 const [detail, setDetail] = useState<DiagnosticOccurrence | null>(null), [error, setError] = useState(''), [copy, setCopy] = useState('');
 const controller = useRef<AbortController | null>(null);
 useEffect(() => () => controller.current?.abort(), []);
 async function expand(open: boolean) {
  if (!open || detail) return; controller.current?.abort(); const request = new AbortController(); controller.current = request;
  try { const value = await providerDiagnosticsApi.detail(provider, row.id, request.signal); if (!request.signal.aborted) { setDetail(value); setError(''); } }
  catch { if (!request.signal.aborted) setError('Não foi possível consultar os detalhes.'); }
 }
 async function exportDiagnostic() { try { await navigator.clipboard.writeText(sanitizedDiagnostic(detail ?? row)); setCopy('Diagnóstico copiado.'); } catch { setCopy('Não foi possível copiar. Verifique a permissão de área de transferência.'); } }
 return <li className="diagnostic-occurrence"><div className="diagnostic-row-heading"><strong>{row.code}</strong><span>{states[row.status] ?? row.status}</span></div><time dateTime={row.occurredAt}>{time(row.occurredAt)}</time><p>{row.component} · {row.stage}</p><p>{row.description}</p><details onToggle={(event) => void expand(event.currentTarget.open)}><summary>Detalhes da ocorrência</summary><dl><div><dt>Correlação</dt><dd>{row.correlationId ?? 'Não disponível'}</dd></div><div><dt>Evento</dt><dd>{row.eventType ?? 'Não disponível'}</dd></div><div><dt>Tentativas</dt><dd>{(detail ?? row).attempts ?? 'Não disponível'}</dd></div><div><dt>Itens no lote</dt><dd>{(detail ?? row).items ?? 'Não disponível'}</dd></div><div><dt>Última tentativa</dt><dd>{time((detail ?? row).lastAttemptAt)}</dd></div><div><dt>Recuperação</dt><dd>{time((detail ?? row).recoveredAt)}</dd></div></dl>{error && <p role="alert">{error}</p>}<button className="secondary-button" onClick={() => void exportDiagnostic()}>Copiar diagnóstico sanitizado</button>{copy && <p role="status">{copy}</p>}</details></li>;
}
export function ProviderDiagnosticsButton({ provider, count = 0, revision = 0 }: { provider: DiagnosticProvider; count?: number; revision?: number }) {
 const { session } = useSession();
 const allowed = Boolean(session?.permissions.includes('providers.manage') && session.permissions.includes('providers.diagnostics.read'));
 const scope = `${session?.currentOrganizationId}:${session?.membership?.permissionVersion}:${allowed}`;
 const [open, setOpen] = useState(false), [openedScope, setOpenedScope] = useState('');
 const trigger = useRef<HTMLButtonElement>(null);
 const visible = open && openedScope === scope && allowed;
 function close() { setOpen(false); trigger.current?.focus(); }
 if (!allowed) return null;
 return <><button ref={trigger} className="text-button provider-diagnostics-trigger" onClick={() => { setOpenedScope(scope); setOpen(true); }}>Ver diagnóstico{count > 0 && <span className="diagnostic-badge" aria-label={`${count} ocorrências relevantes`}>{count}</span>}</button>{visible && <DiagnosticsPanel key={scope} provider={provider} revision={revision} onClose={close} />}</>;
}
function DiagnosticsPanel({ provider, revision, onClose }: { provider: DiagnosticProvider; revision: number; onClose: () => void }) {
 const title = useId(), tabsId = useId(), panel = useRef<HTMLElement>(null), close = useRef<HTMLButtonElement>(null);
 const [tab, setTab] = useState('ERRORS'), [page, setPage] = useState(1), [filters, setFilters] = useState({ from: '', to: '', severity: '', stage: '', status: '' });
 const [data, setData] = useState<DiagnosticPage | null>(null), [health, setHealth] = useState<DiagnosticHealth | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
 useEffect(() => { close.current?.focus(); }, []);
 useEffect(() => {
  const request = new AbortController(); setLoading(true); setError(''); setData(null); setHealth(null);
  const timer = setTimeout(() => {
   const query = { ...filters, from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined, to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined, kind: tab, page, limit: 20 };
   const promise = tab === 'HEALTH' ? providerDiagnosticsApi.health(provider, request.signal).then((value) => { if (!request.signal.aborted) setHealth(value); }) : providerDiagnosticsApi.list(provider, query, request.signal).then((value) => { if (!request.signal.aborted) setData(value); });
   void promise.catch((reason: unknown) => { if (!request.signal.aborted) setError(reason instanceof ApiError && reason.status === 403 ? 'Você não tem permissão para consultar o diagnóstico.' : 'Diagnóstico indisponível. Tente novamente.'); }).finally(() => { if (!request.signal.aborted) setLoading(false); });
  }, 200); // Coalesce connection realtime updates; never poll the provider.
  return () => { clearTimeout(timer); request.abort(); };
 }, [provider, tab, page, filters, revision, refresh]);
 function keyboard(event: React.KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); onClose(); }
  if (event.key !== 'Tab') return;
  const controls = panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), select, input, summary, [tabindex="0"]');
  const first = controls?.[0], last = controls?.[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
 }
 return <div className="diagnostic-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={panel} role="dialog" aria-modal="true" aria-labelledby={title} className="diagnostic-panel" onKeyDown={keyboard}><header><div><p className="eyebrow">PROVEDORES</p><h2 id={title}>Diagnóstico · {provider === 'WHATSAPP_WEB' ? 'WhatsApp Web' : provider}</h2></div><button ref={close} className="text-button" onClick={onClose} aria-label="Fechar diagnóstico">Fechar</button></header><div role="tablist" aria-label="Diagnóstico do provider">{[['ERRORS', 'Erros'], ['EVENTS', 'Eventos'], ['HEALTH', 'Saúde']].map(([id, label]) => <button key={id} id={`${tabsId}-${id}`} role="tab" aria-selected={tab === id} aria-controls={`${tabsId}-content`} className={tab === id ? 'selected' : ''} onClick={() => { setTab(id!); setPage(1); }}>{label}</button>)}</div><section id={`${tabsId}-content`} role="tabpanel" aria-labelledby={`${tabsId}-${tab}`}>
  {tab !== 'HEALTH' && <form className="diagnostic-filters" onSubmit={(event) => event.preventDefault()}>{[['from', 'Desde'], ['to', 'Até']].map(([key, label]) => <label key={key}>{label}<input type="date" value={filters[key as 'from' | 'to']} onChange={(event) => { setFilters({ ...filters, [key!]: event.target.value }); setPage(1); }} /></label>)}{[['severity', 'Severidade', [['ERROR', 'Erro'], ['INFO', 'Informação']]], ['stage', 'Etapa', [['PERSISTENCE', 'Persistência'], ['VALIDATION', 'Validação'], ['LIFECYCLE', 'Conexão']]], ['status', 'Estado', Object.entries(states)]].map(([key, label, values]) => <label key={String(key)}>{String(label)}<select value={filters[key as 'severity' | 'stage' | 'status']} onChange={(event) => { setFilters({ ...filters, [String(key)]: event.target.value }); setPage(1); }}><option value="">Todos</option>{(values as string[][]).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}</form>}
  {loading && <p role="status">Carregando diagnóstico…</p>}{error && <p role="alert">{error} <button className="text-button" onClick={() => setRefresh(refresh + 1)}>Tentar novamente</button></p>}
  {data && <><p className="muted">Ocorrências retidas: {data.counters.active} ativas · {data.counters.recovered} recuperadas. Janela de {data.retentionDays} dias.</p>{data.legacyFailures > 0 && <p role="status" className="provider-warning">{data.legacyFailures} falhas sem detalhes individuais. {data.legacyDescription}</p>}{data.truncated && <p className="muted">Exibindo uma janela limitada de registros recentes.</p>}{!data.items.length && <p>Nenhuma ocorrência corresponde aos filtros.</p>}<ol className="diagnostic-timeline">{data.items.map((row) => <Occurrence key={`${row.id}:${row.status}`} row={row} provider={provider} />)}</ol><nav aria-label="Paginação do diagnóstico"><button className="secondary-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {data.page}</span><button className="secondary-button" disabled={!data.hasMore} onClick={() => setPage(page + 1)}>Próxima</button></nav></>}
  {health && <dl className="diagnostic-health">{[['Estado da conexão', health.state], ['Itens na fila', health.backlog], ['Falhas pendentes conhecidas', health.pendingFailures], ['Tentativas com falha', health.failedAttempts], ['Dead-letter conhecido', health.deadLetters], ['Comandos pendentes', health.pendingCommands], ['Falhas sem detalhes individuais', health.legacyFailures], ['Último processamento', time(health.lastProcessedAt)], ['Última observação', time(health.lastCheckedAt)], ['Diagnóstico detalhado desde', time(health.diagnosticsSince)]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value ?? 'Não disponível'}</dd></div>)}</dl>}
 </section><footer><p className="muted">Consulta somente leitura pelo Core. Conteúdo de mensagens e credenciais não fazem parte deste diagnóstico.</p><button className="text-button" onClick={() => setRefresh(refresh + 1)}>Atualizar diagnóstico</button></footer></aside></div>;
}
