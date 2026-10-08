# Status do WappHub Chat

**Milestone ativo do ecossistema:** M1 — frontend operacional do chat interno.

O backend M1 do `wapphub-core` está implantado e validado em produção. O frontend é a parte pendente para concluir o milestone global M1.

API pública atual do Core:

`https://api.wapphub.com.br`

## M1 — estado do frontend

| Item | Estado |
|---|---:|
| Definição de escopo | ✅ |
| Definição de rotas | ✅ |
| UX realtime/native-like | ✅ documentação |
| Design system neutro/accentColor | ✅ documentação |
| Contratos Core M1 identificados | ✅ |
| Estrutura frontend | ⬜ |
| Router/URLs reais | ⬜ |
| Login/sessão | ⬜ |
| Seleção de Organization | ⬜ |
| Alternância de Organization | ⬜ |
| API client/CSRF | ⬜ |
| WebSocket/reconexão/replay | ⬜ |
| UI otimista/clientMessageId | ⬜ |
| Conversas internas | ⬜ |
| Mensagens internas de texto | ⬜ |
| Contatos | ⬜ |
| Tags/notas | ⬜ |
| Archive/unarchive | ⬜ |
| Assignment manual | ⬜ |
| Transfer FULL/LIMITED/NONE | ⬜ |
| Supervisão | ⬜ |
| Cursor pagination | ⬜ |

## Contratos disponíveis no Core M1

O frontend pode consumir, sem duplicar regra de domínio:

- autenticação/sessão server-side;
- Organization Context e Membership;
- permissions;
- Contacts;
- Conversations;
- Messages internas;
- `clientMessageId`/idempotência;
- Tags;
- Internal Notes;
- assignment;
- transfer `FULL`/`LIMITED`/`NONE`;
- cursor pagination;
- `/api/v1/realtime`;
- `/api/v1/realtime/events`.

## Fora do M1 frontend atual

| Domínio | Estado |
|---|---:|
| Equipe/convites comerciais completos | ⬜ milestone posterior |
| Entitlements/planos/assentos | ⬜ M2 |
| Meta/WhatsApp | ⬜ M3 |
| Imagem/áudio/gravação/galeria | ⬜ M4 |
| Round-robin | ⬜ milestone posterior |
| Android nativo | ⛔ Pós-MVP |

Rotas já reservadas para funcionalidades posteriores podem existir como placeholders, mas não devem simular contratos ainda inexistentes.

Legenda: ✅ validado/documentado · 🟡 em andamento · ⬜ planejado · ⛔ fora do milestone atual.
