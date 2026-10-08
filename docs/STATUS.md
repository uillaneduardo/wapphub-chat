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
| BrowserRouter e rotas previstas | ✅ criados; áreas de produto usam placeholders |
| Design tokens e shell responsivo | ✅ criados |
| API client, credentials e CSRF | ✅ alinhados ao contrato do Core |
| Erros HTTP | ✅ interpreta `{ error: { code, requestId } }` |
| Login, logout e sessão | ✅ paths/métodos/payloads alinhados; smoke autenticado pendente |
| Seleção de Organization | ✅ path, payload e resposta alinhados; smoke autenticado pendente |
| Tipos Contacts/Conversations/Messages/Tags/Notes | ✅ alinhados aos schemas consultados |
| Cursor pagination | ✅ tipos refletem `nextCursor`; mensagens usam `before` |
| WebSocket, replay e checkpoint | ✅ protocolo alinhado; teste unitário, integração live pendente |
| UI de conversas e mensagens | ⬜ não iniciada |

## Contratos REST conferidos

- Sessão: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/me`, `GET /api/v1/me/organizations`, `POST /api/v1/session/organization`, `GET /api/v1/app/bootstrap`.
- Dados M1: `contacts`, `conversations`, mensagens em `/conversations/{id}/messages`, `tags`, notas em `/conversations/{id}/notes`, assignment em `/conversations/{id}/assign` e transfer em `/conversations/{id}/transfer`.
- Listas usam `limit` e `cursor` com resposta `{ items, nextCursor }`, exceto mensagens, que recebem `before` e também retornam `nextCursor`.
- Erros de API usam `{ error: { code, requestId } }`.

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

Lint, typecheck, testes e build foram executados após o alinhamento do contrato. Os testes não substituem o smoke autenticado contra Core; nenhum fluxo de UI de conversations/messages foi iniciado.
