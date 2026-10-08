# Status do WappHub Chat

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
| Smoke autenticado com Core | ⬜ pendente; requer credencial de teste autorizada e navegador headless com bibliotecas gráficas disponíveis |

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

Lint, typecheck, 31 testes e build passaram após a integração do seletor de equipe. O Core M1 foi integrado e implantado sem migrations; health/readiness públicos retornam 200. CORS autoriza somente `https://chat.wapphub.com.br`: preflight permitido retornou 204, POST de origem inválida foi rejeitado com 403 e POST permitido chegou à validação de payload. O WebSocket de realtime rejeitou Origin inválida (403) e exigiu sessão para Origin autorizada (401). O app legado foi removido da rede pública; seu banco e volume foram preservados em rede privada. O smoke autenticado de login, conversas, mensagens, replay e ações operacionais ainda depende de credencial de teste e browser funcional no host.

## Branch de revisão `feat/m1-demo-provider-ui`

Adiciona a tela Provedores, estado DEMO/META (Meta apenas em desenvolvimento), ativação por permission, link para o simulador autenticado e interface responsiva de conversa externa simulada. Conversas do canal exibem contato, canal e prévia da última mensagem; histórico distingue recebidas e enviadas. O simulador usa as mensagens comuns, atualiza por WebSocket e não envia identidade de remetente.

Validação local: **36 testes**, lint, typecheck e build passaram. O branch depende do Core `feat/m1-demo-provider`; não foi publicado nem testado contra produção. Inspeção visual em browser real nos viewports 1920×1080, 1366×768, 1024×768, 768×1024 e 390×844 continua pendente; regras responsivas e estados foram verificadas por código/build/Testing Library. Não houve deploy.
