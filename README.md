# WappHub Chat

> **M1 funcionalmente homologado; consolidação administrativa Git pendente.** [Aceite formal](docs/M1_FINAL_ACCEPTANCE.md) e [STATUS](docs/STATUS.md). Nenhuma nova função/M2 ou publicação nesta auditoria.

Frontend operacional de atendimento do ecossistema WappHub.

## Responsabilidade

O WappHub Chat é a aplicação usada por Owner, Supervisor e Atendente para operar o atendimento da organização atual.

O Chat não administra catálogo comercial global, preços ou produtos da WappHub. Esses recursos pertencem ao `wapphub-platform`.

O WappHub Core é a autoridade de domínio, segurança, persistência, permissões, isolamento multi-tenant e realtime. O frontend não duplica essas regras.

## Estado atual

M1 funcionalmente homologado pelo usuário; encerramento administrativo Git pendente. Frontend publicado `6b04e65`, Core/API/Worker `a45fb33`. P0/P1 e contatos/criação manual passaram na homologação informada. Fontes/evidências atuais conferidas; main remota ainda anterior à produção. Não iniciar M2 sem nova execução autorizada.

[Aceite e matriz](docs/M1_FINAL_ACCEPTANCE.md), [STATUS](docs/STATUS.md), [consolidação Git](docs/M1_FINAL_GIT_CONSOLIDATION.md), [releases](docs/M1_RELEASE_HISTORY.md). API: https://api.wapphub.com.br; Chat: https://chat.wapphub.com.br.

## Escopo do frontend M1

- Login e sessão compartilhada com o WappHub Core.
- Seleção e alternância de Organization.
- URLs reais e visíveis na barra de endereço.
- Contatos.
- Inbox de conversas.
- Mensagens internas de texto.
- Envio otimista e reconciliação por `clientMessageId`.
- WebSocket, reconexão e replay.
- Atribuição manual.
- Transferência de conversa com histórico completo, limitado ou sem histórico.
- Notas internas.
- Tags.
- Arquivamento e consulta de arquivadas.
- Supervisão conforme permissions.

## Roadmap posterior ao M1

Continuam no roadmap do produto, mas não devem ser implementados nesta etapa:

- Entitlements, planos, assentos e fluxos comerciais completos — M2.
- Integração Meta/WhatsApp e diagnóstico de canal — M3.
- Imagem, áudio, gravação e galeria de mídia — M4.
- Round-robin e fechamento do MVP comercial — milestones posteriores.
- Android nativo — pós-MVP.

## Rotas

A navegação deve usar rotas reais com History API/BrowserRouter e suportar refresh direto.

Exemplos:

- `/login`
- `/organizations`
- `/app/conversations`
- `/app/conversations/:conversationId`
- `/app/contacts`
- `/app/files`
- `/app/team`
- `/app/tags`
- `/app/settings`

A especificação completa fica em `docs/ROUTES.md`.

## Segurança e contratos

A aplicação web usa a sessão server-side do Core. Não introduzir JWT paralelo em `localStorage`.

Operações mutáveis respeitam o contrato de Origin/CSRF do Core. O frontend pode ocultar ações sem permission, mas toda autorização continua sendo revalidada no backend.

O realtime usa os contratos atuais do Core:

- WebSocket: `/api/v1/realtime`;
- replay/sync: `/api/v1/realtime/events`.

Consulte `docs/STATUS.md`, `docs/SCOPE.md` e `docs/UX_REALTIME.md` antes de assumir uma funcionalidade como disponível.

## Finalização funcional M1

Contatos e criação manual interna publicados e homologados pelo usuário. [Relatório e evidências](docs/M1_CONTACTS_CONVERSATION_CREATION.md). Fonte de estado vigente: [aceite final](docs/M1_FINAL_ACCEPTANCE.md); encerramento administrativo Git pendente.
