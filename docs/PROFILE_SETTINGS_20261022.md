# Meu perfil — identidade do usuário por organização (22/10/2026)

## Fluxo

Novo `/app/profile` sob sessão autenticada e organização selecionada, sem exigir privilégios de Owner ou Supervisor. Acesso pelo rodapé do menu lateral no desktop e pela seção **Conta** de **Mais** no mobile. Não depende de um recurso de catálogo comercial.

1. **Dados da conta**: nome cadastrado editável, e-mail atual somente leitura. Ao confirmar, PATCH `/api/v1/me/profile` e atualização dos dados de sessão. Nenhuma senha/credencial é capturada.
2. **Identidade de atendimento**: opção **Usar meu nome cadastrado** (alias nulo) ou um apelido exclusivo da organização. Prévia da assinatura de texto. Salvar realiza PATCH `/api/v1/me/organization-profile` e consulta a sessão novamente.
3. Nome efetivo aparece no menu/identificação do usuário, na conversa otimista e na apresentação de responsável. O Core mantém a autoridade para as mensagens persistidas e a assinatura transmitida ao WhatsApp.

## Limites e segurança

- Usuário com perfil AGENT pode atualizar **apenas seu próprio perfil**, independentemente de permissões de equipe. Nenhuma alteração no RBAC.
- Um nome de atendimento em uma organização não altera as demais.
- Conteúdo enviado anteriormente mantém `transmittedBody`; mensagens novas têm snapshot imutável no Core. Histórico legado não é alterado em massa.
- Campos de nome são tratados como texto, nunca HTML. Cliente faz pré-validação para UX; Core aplica validação final, origem/CSRF, sessão e tenancy.
- Troca de e-mail/senha, foto, preferências de notificações e personalização de cada canal não estão incluídas.

## Validação pendente

A branch inclui testes de formulário, alias e reset. Validar `npm ci && npm run lint && npm run typecheck && npm test && npm run build` antes do merge. Navegação, formulários e duas organizações devem passar em homologação manual do notebook, incluindo mobile. **Sem deploy ou homologação presumidos.**

Publicar somente após a migration aditiva e a versão correspondente do Core. Em caso de rollback, voltar Chat/Core para versões compatíveis mantendo os dados.
