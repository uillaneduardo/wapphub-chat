import { ApiError } from '../../lib/api';
export const roleLabels: Record<string, string> = { OWNER: 'Owner', SUPERVISOR: 'Supervisor', AGENT: 'Atendente' };
export function errorMessage(reason: unknown) {
  if (reason instanceof ApiError) {
    const messages: Record<string, string> = { PERMISSION_VERSION_CONFLICT: 'As permissões foram alteradas por outra pessoa. Recarregue antes de salvar.', LAST_FUNCTIONAL_OWNER_REQUIRED: 'A organização precisa manter ao menos um Owner ativo com acesso ao gerenciamento de permissões.', SELF_PERMISSION_CHANGE_DENIED: 'Você não pode alterar suas próprias permissões.', PERMISSION_DELEGATION_DENIED: 'Você só pode gerenciar permissões que possui.', PERMISSION_DEPENDENCY_REQUIRED: 'Gerenciar permissões também exige consultar a equipe.', MEMBER_NOT_FOUND: 'Membro não encontrado nesta organização.', PERMISSION_DENIED: 'Seu acesso a esta operação está indisponível.' };
    return messages[reason.code ?? ''] ?? 'Não foi possível concluir a operação. Tente novamente.';
  }
  return 'Não foi possível conectar. Tente novamente.';
}
