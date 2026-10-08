# Status do WappHub Chat

**Milestone ativo do ecossistema:** M1 — frontend (fundação em andamento).

## Fundação frontend

| Item | Estado |
|---|---:|
| React + TypeScript + Vite | ✅ criado e build validado |
| ESLint, typecheck e Vitest | ✅ configurados; verificações executadas |
| Design tokens e shell responsivo | ✅ base criada |
| BrowserRouter e rotas previstas | ✅ criadas; áreas de produto são placeholders |
| API client (cookies, CSRF e erros HTTP) | ✅ criado; integração com contrato Core pendente |
| Login/logout/sessão e guardas | 🟡 fluxo frontend conectado a endpoints candidatos; validar contrato |
| Contexto e seleção de Organization | 🟡 base criada; validar payload e endpoint com Core |
| WebSocket, backoff e checkpoint | ✅ cliente e testes unitários; validar protocolo com backend |
| UI funcional de conversas/mensagens | ⬜ pendente |

O cliente HTTP usa `VITE_API_BASE_URL` e os caminhos de autenticação estão centralizados em `src/lib/session.ts`. O endpoint `/openapi.json` da API informada não está publicado (resposta 404); portanto paths, formato do cookie CSRF e payloads ainda precisam ser conferidos com o contrato oficial antes de considerar a sessão integrada. O CSRF envia o cookie `csrf_token` no header `X-CSRF-Token`.

## Escopo ainda pendente

| Item | Estado |
|---|---:|
| Conversas, mensagens e atualização incremental na UI | ⬜ |
| Equipe/convites, contatos, tags/notas e configurações | ⬜ |
| Seleção/alternância organizacional validada ponta a ponta | ⬜ |
| Integração Meta, mídia e áudio | ⬜ fora desta fundação |
| Android nativo | ⛔ pós-MVP |

Os testes atuais cobrem API client, guarda de rota, carregamento de sessão e reconexão realtime. Eles não substituem validação de integração com o backend.
