# Status do WappHub Chat

> Atualização de produção — 2026-10-08, 15:00 Recife: P0 publicado em Core/API/Worker
> `cbaf50c5eedd6731e1ca3a674c1d9b0b20005a7d` (`wapphub-core:p0-preview-cbaf50c`)
> e Chat `d93efc576bd560fcbab0146343fb98bbbc1d0b69` (`wapphub-chat:p0-preview-d93efc5`).
> Todos os cinco serviços healthy; HTTP, assets e integridade aprovados.
> Validação funcional isolada anterior reaproveitada: 58 Core + 91 Chat; não reexecutada.
> Homologação visual desta publicação pendente. A2 e demais aceites M1 permanecem;
> M1 não formalmente encerrado. M2/P1 não iniciados.
> [Registro de publicação e contingência](DEPLOY_P0_20261008.md).

## Registro histórico anterior à publicação P0

## Estado verificado — 2026-10-08

M1 operacional, homologações informadas de Demo/texto e melhorias visuais; **sem
encerramento formal**. Produção 3e234522673023a64f6bd7c827ca1adef35aaa0b,
imagem wapphub-chat:lucide-nav-3e23452; Core 72d05aa / wapphub-core:demo-72d05aa.
Container Chat healthy, login/SPA/estáticos HTTP200 e hashes iguais à imagem.
API/Worker/MariaDB/Redis healthy. main local/remota 9072267 contém versão anterior;
dez commits posteriores publicados permanecem locais. PR #3 documental continua
draft; conteúdo remoto preservado e confrontado com documentação local mais recente.

| Item atual | Estado e evidência |
| --- | --- |
| Sessão/Organization/REST/CSRF/rotas | Implementado; sessão/testes e operação informada; troca multi-org integrada requer aceite específico |
| Inbox/histórico/compositor/otimista/retry | Implementado e validado na cobertura de 86 testes; texto/IME/duplicação preservados |
| Atribuição/transferência/roster | UI testada; roster publicado; preview Core ignora visibilidade/permission (A1) |
| Tags/notas/archive no contexto | Implementados e testados; catálogo Tags separado é placeholder |
| Demo/Providers/simulador | Publicados e homologados para texto; retry UI incerto não preserva key (A3) |
| Scroll/compositor/toolbar desabilitada | Testados e homologação visual informada |
| Sidebar/AppIcon/Lucide/flyout/logout | lucide-react1.53.0,22px,traço2,44px; testes/manual informados |
| Contexto redimensionável/preferências conta | Testados e homologação informada; hooks/controles compartilhados |
| Realtime integrado | Parcial: transporte funciona, checkpoint não aguarda leitura REST (A2) |
| Contacts/criação manual de conversa | Parcial/pendente; placeholders e comandos ausentes no cliente |
| Viewports/touch/leitor de tela completos | Sem evidência específica de cobertura integral, não inferir do relato geral |
| Entitlements/seats/Admin/Minha Conta/Meta/mídia | Não implementados; M2/M3/M4 preservados |

Lint/typecheck, **86 testes em 16 arquivos** e build reexecutados em jsdom/local;
Core isolado revalidado com 56 testes e OpenAPI. Suites verdes não cobrem as
contraprovas A1/A2. Browser gráfico/Playwright/screenshots automatizados não
executados no Homelab. Homologação manual das melhorias foi confirmada pelo usuário;
roteiro final de multi-org/permissão/transfer/reconnect ainda precisa evidência.

Detalhes: [inventário](GIT_PRODUCTION_INVENTORY_20261008.md),
[matriz e reutilização](M1_ARCHITECTURE_ACCEPTANCE_20261008.md),
[nota remota preservada](M1_PRODUCTION_RECONCILIATION_20261008.md),
[integração](GIT_INTEGRATION_STRATEGY_20261008.md).
Não houve mudança funcional, deploy, merge ou push nesta reconciliação.

## Histórico anterior preservado

Abaixo, snapshots das entregas originais (31/36 testes e imagens antigas).
Afirmações de “não publicado”, smoke pendente ou roster apenas em branch são do
momento original, superadas pela seção atual e matriz. A publicação e homologação
posteriores não apagam essas evidências nem comprovam critérios não testados.


**Milestone ativo do ecossistema:** M1 — frontend operacional do chat interno.

O backend M1 do `wapphub-core` está implantado. A fundação frontend foi criada nesta branch; as telas de produto e a validação autenticada ponta a ponta continuam pendentes.

API pública atual do Core: `https://api.wapphub.com.br`.
Contrato consultado em 2026-10-08: `https://api.wapphub.com.br/api/v1/openapi.json`.
Contrato realtime consultado: `wapphub-core/docs/REALTIME_CONTRACT.md` (versão 1).

## M1 — estado do frontend

| Item | Estado |
|---|---:|
| Definição de escopo, rotas e UX | ✅ documentadas |
| Contratos REST do Core M1 | ✅ conferidos no OpenAPI público |
| Estrutura React/TypeScript/Vite | ✅ criada |
| BrowserRouter e rotas previstas | ✅ criados; conversas implementadas |
| Design tokens e shell responsivo | ✅ criados |
| API client, credentials e CSRF | ✅ alinhados ao contrato do Core |
| Erros HTTP | ✅ interpreta `{ error: { code, requestId } }` |
| Login, logout e sessão | ✅ paths/métodos/payloads alinhados; smoke autenticado pendente |
| Seleção de Organization | ✅ path, payload e resposta alinhados; smoke autenticado pendente |
| Tipos Contacts/Conversations/Messages/Tags/Notes | ✅ alinhados aos schemas consultados |
| Cursor pagination | ✅ tipos refletem `nextCursor`; mensagens usam `before` |
| WebSocket, replay e checkpoint | ✅ protocolo alinhado; conexão ligada à UI, integração live pendente |
| Caixa de conversas | ✅ Minhas, Não atribuídas, Todas (com `conversations.supervise`), Arquivadas, filtro de tags e paginação |
| Conversa e mensagens | ✅ histórico com cursor, carregamento anterior, envio otimista e retry idempotente |
| Ações operacionais | ✅ arquivar/reabrir, atribuir, transferir, tags e notas internas, conforme permissões |
| Seletor de equipe para assignment/transfer | ✅ frontend integrado; `GET /api/v1/team/members` publicado no Core e presente no OpenAPI de produção |
| Realtime na UI | ✅ atualização pontual da conversa/mensagens/notas e eventos de tags; sem recarga total da lista |
| Responsividade | ✅ lista/conversa em navegação mobile e lista, conversa e painel contextual em desktop |
| Container de produção | ✅ imagem `wapphub-chat:1e18744`, Nginx estático na porta 3000, fallback SPA, somente `cloudflare_ingress`, sem porta publicada |
| Hostname público | ✅ `https://chat.wapphub.com.br` serve o bundle da imagem `wapphub-chat:1e18744`; `/login` e rota profunda respondem 200 |
| Smoke autenticado com Core | ⬜ pendente; manual pelo usuário no notebook; navegador gráfico proibido no Homelab |

## Contratos REST conferidos

- Sessão: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/me`, `GET /api/v1/me/organizations`, `POST /api/v1/session/organization`, `GET /api/v1/app/bootstrap`.
- Dados M1: `contacts`, `conversations`, mensagens em `/conversations/{id}/messages`, `tags`, notas em `/conversations/{id}/notes`, assignment em `/conversations/{id}/assign` e transfer em `/conversations/{id}/transfer`.
- Listas usam `limit` e `cursor` com resposta `{ items, nextCursor }`, exceto mensagens, que recebem `before` e também retornam `nextCursor`.
- Erros de API usam `{ error: { code, requestId } }`.
- `GET /api/v1/team/members` está implementado e validado somente na branch Core `feat/m1-team-roster`; requer `conversations.assign` ou `conversations.transfer` e ainda não integra o OpenAPI público de produção.

## Sessão e segurança conferidas

- Sessão server-side pelo cookie `__Host-wapphub_session` em produção; o navegador envia com `credentials: include` e o frontend não mantém JWT.
- CSRF: cookie legível `wapphub_csrf`, token retornado em login/`/me` e header `x-csrf-token` em operações mutáveis.
- Os contratos de login, logout e seleção de organização estão centralizados em `src/lib/session.ts`.

## Realtime conferido

- WebSocket read-only: `GET /api/v1/realtime?lastEventId=0`, autenticado pelo cookie e validado por Origin; contexto Organization vem da sessão, sem `organizationId` na URL.
- Frames de domínio usam `version`, `eventId` decimal string, `organizationId`, `type`, `entityId`, `occurredAt` e `payload` com IDs. Tipos aceitos estão restritos aos eventos listados no contrato do Core.
- `sync.checkpoint` confirma `lastEventId` e `hasMore`; reconnect retoma do último checkpoint confirmado. A alternativa REST é `GET /api/v1/realtime/events?lastEventId=...&limit=...`.
- O cliente rejeita eventos de outra organização, deduplica por `eventId` e persiste checkpoint por Organization; só confirma checkpoint após aplicar os eventos anteriores.

## Fora do escopo frontend M1 atual

| Domínio | Estado |
|---|---:|
| Entitlements/planos/assentos | ⬜ M2 |
| Meta/WhatsApp | ⬜ M3 |
| Imagem/áudio/gravação/galeria | ⬜ M4 |
| Round-robin | ⬜ milestone posterior |
| Android nativo | ⛔ pós-MVP |

Lint, typecheck, 31 testes e build passaram após a integração do seletor de equipe. O Core M1 foi integrado e implantado sem migrations; health/readiness públicos retornam 200. CORS autoriza somente `https://chat.wapphub.com.br`: preflight permitido retornou 204, POST de origem inválida foi rejeitado com 403 e POST permitido chegou à validação de payload. O WebSocket de realtime rejeitou Origin inválida (403) e exigiu sessão para Origin autorizada (401). O app legado foi removido da rede pública; seu banco e volume foram preservados em rede privada. O smoke autenticado de login, conversas, mensagens, replay e ações operacionais deve ser realizado manualmente pelo usuário no notebook, conforme política permanente de homologação; não executar browser no Homelab.

## Branch de revisão `feat/m1-demo-provider-ui`

Adiciona a tela Provedores, estado DEMO/META (Meta apenas em desenvolvimento), ativação por permission, link para o simulador autenticado e interface responsiva de conversa externa simulada. Conversas do canal exibem contato, canal e prévia da última mensagem; histórico distingue recebidas e enviadas. O simulador usa as mensagens comuns, atualiza por WebSocket e não envia identidade de remetente.

Validação local: **36 testes**, lint, typecheck e build passaram. O branch depende do Core `feat/m1-demo-provider`; não foi publicado nem testado contra produção. Inspeção visual em browser real nos viewports 1920×1080, 1366×768, 1024×768, 768×1024 e 390×844 continua pendente; regras responsivas e estados foram verificadas por código/build/Testing Library. Não houve deploy.
