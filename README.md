# WappHub Chat

Frontend operacional de atendimento do ecossistema WappHub.

## Responsabilidade

O WappHub Chat é a aplicação usada por Owner, Supervisor e Atendente para operar o atendimento da organização atual.

O Chat não administra catálogo comercial global, preços ou produtos da WappHub. Esses recursos pertencem ao `wapphub-platform`.

O WappHub Core é a autoridade de domínio, segurança, persistência, permissões, isolamento multi-tenant e realtime. O frontend não duplica essas regras.

## Estado atual

**Milestone ativo:** M1 — frontend operacional do chat interno.

O backend M1 já está implantado no WappHub Core e expõe, em `/api/v1`:

- sessão web por cookie revogável;
- Organization Context;
- permissions da Membership;
- Contacts;
- Conversations;
- mensagens internas de texto;
- `clientMessageId` e idempotência;
- Tags;
- Internal Notes;
- archive/unarchive;
- assignment manual;
- transferência `FULL`, `LIMITED` e `NONE`;
- supervisão;
- cursor pagination;
- WebSocket realtime;
- replay/sincronização por event stream.

API pública atual do Core:

`https://api.wapphub.com.br`

A fundação do frontend M1 já foi iniciada neste repositório; consulte `docs/STATUS.md` para o estado validado.

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


## Decisão arquitetural M2 — administração

A divisão aprovada é: **Chat** atende e administra cada Organization (equipe, integração Meta, uso, custos e assinatura); **Platform** é exclusivo para administração GLOBAL do SaaS; **Core** aplica autorização e regras do domínio. O frontend `wapphub-account` não será criado. Para fronteiras de segurança, usuários multi-Organization e planejamento, consultar [ADR-0001 — M2](docs/ADR-0001-M2-ADMIN-BOUNDARIES.md). Esta decisão é documental; não altera o M1 homologado.
