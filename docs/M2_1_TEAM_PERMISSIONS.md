# M2.1 — Equipe e permissões no Chat

Core é autoridade de catálogo/permissões. Session/bootstrap mantém resources,
permissions efetivas e membership.permissionVersion, sem inferir role ou plano.
Catálogo imutável vem do Core; fixture do catálogo em src/test só alimenta testes.
Não há catálogo fallback liberando links se bootstrap não fornecer recursos.

Gestão → Equipe e permissões (/app/team) exige team.read. Diretório paginado
mostra nome/e-mail/perfil/estado reais de membros. Acesso ao editor
/app/team/:membershipId/permissions exige também team.permissions.manage.
Editor consulta catálogo de operações e estado do vínculo no Core; agrupa
por módulo e indica herança, concessões, revogações e acesso efetivo. Mudanças
usam PUT com expectedVersion; restaurar usa POST/reset. Confirmação inline tem
foco inicial, Escape/Cancelar com retorno, bloqueio de submissão dupla e feedback.
Membro selecionado tem componente isolado por id; Organization/User/revisão também
remontam conteúdo, descartando consultas antigas. Edição do próprio vínculo é
somente leitura. Operações ausentes da autoridade do ator são desabilitadas;
backend revalida essas regras. Recursos futuros são apresentados como informação,
sem seletores para ativação. Conflito 409 orienta recarregar, sem sobrescrever estado.

Navegação declarativa conserva todos os contextos e itens públicos. Apenas
recursos AVAILABLE/navigation=true autorizados são links; os demais são controles
desabilitados com motivo acessível. Arquivos/Configurações continuam planejados,
e a página reservada de Etiquetas não é ativada. Não cria páginas de módulos futuros.
[Refinamento do editor e estados da navegação](PERMISSIONS_UI_POLISH.md).
Rodapé, realtime/retry/logout, troca segura de Organization e menu recolhível preservados.
Mobile mantém Conversas/Contatos e Mais para todos os contextos secundários, incluindo
troca de Organization mesmo quando não há recursos visíveis.

Realtime close 4003 sinaliza alteração de permissões, sem exigir novo login.
Chat aborta conexão/reconciliação anterior, descarta checkpoints, desmonta shell
na revalidação forçada e consulta sessão/bootstrap. Mesmo sem conversations.read,
um canal /session/updates read-only recebe invalidações; não transporta mensagens.
Conteúdo tem key de User/Organization/revisão/conjunto efetivo. Respostas antigas
não podem recolocar tenant/autoridade anteriores após troca/logout. Revalidações
passivas por foco/visibilidade preservam compositor/drafts quando autoridade não mudou,
sem polling. Autoridade modificada remonta conteúdo e restabelece canal autorizado.

Visual mantém tokens neutros/accent, Lucide, tipografia e compositor M1. Lista e
editor usam grid responsivo, selects/botões com 44px, sem tabela larga no mobile.
Nenhum browser ou screenshot executado no homelab; homologação desktop Full HD,
mobile, navegação/edição/erros/troca/sessões e M1 pertence ao usuário.

Nenhum convite, troca de perfil, entitlement comercial, assinatura ou Meta implementado.
REST/OpenAPI e segurança documentados no Core em M2_1_RESOURCES_RBAC.md.
