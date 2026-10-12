import type { WebAction, WebConnection } from '../../lib/webProviderApi';
export const connectionPending = (c: WebConnection | null) => !c?.operation?.action.startsWith('history_') && ['PENDING', 'PROCESSING'].includes(c?.operation?.status ?? '');
export type ConnectionPresentation = { status: string; guidance: string; action: { label: string; command: WebAction | 'link' } | null; linked: boolean; connected: boolean };
export function connectionPresentation(c: WebConnection | null, verified: boolean, expired: boolean, now = Date.now()): ConnectionPresentation {
  const lifecycle = c?.lifecycle;
  const linked = !!lifecycle?.linked && lifecycle.termination?.remote !== 'CONFIRMED';
  const view = (status: string, guidance: string, action: ConnectionPresentation['action'] = null, connected = false) => ({ status, guidance, action, linked, connected });
  if (!c && !verified) return view('Não foi possível verificar', 'Consulte o estado atual antes de continuar.');
  if (!c) return view('Não vinculado', 'Vincule seu WhatsApp para disponibilizar o atendimento.', { label: 'Vincular WhatsApp', command: 'link' });
  if (!verified) return view('Não foi possível verificar', 'Consulte o estado atual antes de continuar.');
  if (lifecycle?.recovery?.state === 'AUTHENTICATED') return view('Confirmando conexão…', 'Autenticação confirmada. Aguardando 30 segundos de estabilidade.');
  if (lifecycle?.recovery?.state === 'RUNNING') return view('Restabelecendo conexão…', 'Uma única tentativa foi autorizada. Aguarde a confirmação.');
  if (connectionPending(c) && c.operation?.action !== 'create') return c.operation?.createdAt && now - Date.parse(c.operation.createdAt) >= 120000 ? view('Solicitação aguardando resultado', 'O serviço ainda não confirmou o resultado. Verifique novamente; nenhuma nova operação será iniciada automaticamente.') : view('Atualizando conexão…', 'Aguardando confirmação do serviço.');
  if (c.uiState === 'CONNECTED') return c.transportConfirmed ? view('Conectado', 'WhatsApp disponível para atendimento.', null, true) : view('Conexão temporariamente indisponível', 'O transporte ainda não confirmou a conexão.');
  if (c.pairingPhase === 'AUTHENTICATING') return view('Autenticando…', 'Confirmando o vínculo com o WhatsApp.');
  if (c.uiState === 'QR_READY') return view(expired ? 'QR Code expirado' : 'Aguardando leitura', 'Leia o código abaixo para autorizar a vinculação.', expired ? { label: 'Gerar outro QR Code', command: 'refresh' } : null);
  if (c.uiState === 'CONNECTING') return view('Preparando vinculação…', 'O QR Code aparecerá aqui quando estiver disponível.');
  if (c.uiState === 'RECONNECTING') return view('Reconectando…', 'Restabelecendo o transporte sem gerar um novo QR.');
  if (lifecycle?.recoveryEligible) return view('Não foi possível restabelecer a conexão', 'O vínculo existente pode receber uma tentativa de recuperação autorizada.', { label: 'Restabelecer conexão', command: 'recover' });
  if (lifecycle?.preparationEligible) return view(lifecycle.removalConfirmationRequired ? 'Remoção do aparelho não confirmada' : 'Não vinculado', lifecycle.removalConfirmationRequired ? 'A integração está parada. Remova este aparelho no WhatsApp do celular antes de vincular novamente.' : 'A desvinculação anterior foi confirmada. Você pode iniciar um novo vínculo.', { label: 'Vincular WhatsApp', command: 'link' });
  if (lifecycle?.pairingEligible || !lifecycle && c.uiState === 'DISCONNECTED' && !c.errorCode) return view('Não vinculado', 'Vincule seu WhatsApp para disponibilizar o atendimento.', { label: 'Vincular WhatsApp', command: 'link' });
  return view('Conexão temporariamente indisponível', 'Consulte o diagnóstico avançado para verificar o vínculo existente.');
}
