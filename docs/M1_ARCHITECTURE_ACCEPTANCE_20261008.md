# Auditoria Chat M1 e reutilização — 2026-10-08

## Estado real

Produção confirmada em `3e234522673023a64f6bd7c827ca1adef35aaa0b`, imagem
`wapphub-chat:lucide-nav-3e23452`, com Core `72d05aa`. Usuário confirmou operação
Demo/envio/recebimento e últimas melhorias visuais. Lint/typecheck, **86 testes em
16 arquivos** e build reexecutados e aprovados em ambiente local/jsdom; sem browser.
HTTP de login/deep link/estáticos e SHA-256 do bundle publicado conferidos.

M1 **não formalmente encerrado**. Matriz ecossistema e contraprovas de autorização
Core estão em `wapphub-core/docs/M1_ARCHITECTURE_ACCEPTANCE_20261008.md`.
Roadmap permanece `wapphub-core/docs/MILESTONES.md`; M2 só foi planejado.
Inventário local/remoto/produção e PR #3: `GIT_PRODUCTION_INVENTORY_20261008.md`.

## Matriz frontend

| Responsabilidade | Classificação | Evidência e limite |
| --- | --- | --- |
| Autenticação/cookie/CSRF/logout | Implementado e validado | lib/session/api; SessionProvider, Guards, Sidebar; testes e operação informada |
| Seletor Organization | Implementado, mas sem evidência suficiente | OrganizationsPage/API; guard loading desmonta shell; teste detalhe troca org; falta fluxo integrado com duas orgs e fila antiga |
| Inbox e filtros/cursor | Implementado e validado | InboxList/conversationModel; tests filtros/update pontual; ressalva prévia Core |
| Histórico por cursor | Implementado e validado | Conversations/useMessageScroll; tests paginação/ancoragem; API respeita visibilidade no /messages |
| Compositor principal | Implementado e validado | texto8000, IME/Enter/ShiftEnter, lock, ferramentas desabilitadas, E5 manual |
| UI otimista/retry principal | Implementado e validado | clientMessageId estável/merge e ConversationView tests |
| Realtime integrado/aplicação/checkpoint | Parcial | transporte e fila implementados, contraprova de checkpoint antes de REST; não basta teste do cliente isolado |
| Atribuição/transferência | Parcial | controles/payloads/RBAC/UserSelect testados; Core preview não obedece NONE/messages.read |
| Tags e notas no contexto | Implementado e validado | aplicação/remoção/notas testadas; catálogo Tags em página própria é placeholder |
| Contacts CRUD / conversa manual | Parcial | Contact exibido em detalhe; /contacts placeholder, sem createConversation no cliente/Inbox |
| Demo Provider UI | Implementado e validado | Providers.test com enable/disabled/perms, send; manual envio/recebimento |
| Retry/histórico completo do simulador | Parcial | UUID novo em retry, somente última página50, sem otimista/ancoragem compartilhados |
| Navegação recolhível/Lucide/flyouts/logout | Implementado e validado | Sidebar/AppIcon/AppShell tests, 22px/traço2/44px, manual informado |
| Painel contexto redimensionável | Implementado e validado | useContextPanel/ContextSeparator; limites240–480, default300 e história preservada |
| Preferências locais por conta | Implementado e validado | useUiPreference/SendPreference; storage sem auth/content/tenant; testes conta/corrupção/sync |
| Responsividade | Implementado e validado | code/CSS/jsdom + homologação visual informada; não prova cada viewport/touch/AT |
| Catálogo de equipe, arquivos e settings comerciais | Fora do escopo funcional M1 ou placeholder | App.tsx/Pages.tsx; não declarar telas prontas; convites/Minha Conta M2, mídia M4 |

Os seis critérios globais M1 foram confrontados no Core: isolamento backend e
fallback de rota têm evidência; workflow completo, troca integrada de org,
coerência e reconnect precisam das correções/aceites descritos abaixo.

## Mapa de componentes, hooks e serviços compartilhados

| Camada | Compartilhado de fato | Principal | Simulador |
| --- | --- | --- | --- |
| Sessão/contexto | SessionProvider, Guards, API credentials/CSRF | Principal atendente | Sessão autentica ferramenta; contato é identidade externa derivada no Core |
| HTTP/types | apiRequest, chatApi, InternalTextMessage, Conversation | sendMessage/listMessages | sendDemoMessage/listDemoContacts + listMessages comum |
| Realtime | AppShell/RealtimeClient/realtimeBus; stream Message comum | listeners inbox/detalhe | listener message.created da conversa selecionada |
| Teclado/preferência | useComposerShortcut, SendPreference, useUiPreference | mesma regra Enter/ShiftEnter/IME | mesma regra, default e storage por User |
| Dados persistidos | Core Message/Conversation/ContactIdentity/Channel | INTERNAL/OUTBOUND, senderUserId | INBOUND, senderContactId; sem senderUserId do contato |
| Componente compositor | somente controle de preferência/hook | form em Conversations + ComposerTools | form próprio em Providers; sem barra de ferramentas |
| Envio/concorrência | ambos possuem locks síncronos, implementações separadas | pendingSends por key, composerBusy, mergeMessages/otimista/FAILED/retry | sendBusy, await POST + refresh, draft restaurado em erro |
| História/scroll | endpoint e CSS/tokens; sem componente de história único | useMessageScroll, páginas/cursors/indicador80px | última página50 invertida, sem hook de ancoragem/indicador |
| Render de mensagem | types, não componente | bolha/date/status/direction em Conversations | article from-contact/from-agent em Providers |
| Painel/atribuição | UserSelect compartilhado assignment/transfer | ConversationActions/useContextPanel | não usa essas operações/painel |

Não há refatoração arquitetural nesta entrega. Proposta futura separada: extrair
policies mínimas de envio/reconciliação/identidade estável se o uso exigir; nunca
unificar identidade de atendente e contato nem colocar provider-specific rules
no hook de teclado. Port provider e ingestão comum estão no Core.

## Identidade e autorização

Browser de atendimento envia body/clientMessageId, não senderUserId/tenant.
Simulador envia contactId/externalMessageId/body; Core valida contactId pelo
ContactIdentity da Organization/Channel da sessão. INBOUND não usa Owner como
remetente; OUTBOUND é User interno. O simulador não autentica um contato externo
independente e não é login público. Backend exige providers.simulate e contexto;
UI/histórico também messages.read. Contacts comuns são dados tenant-scoped.

Persistência separa as duas identidades corretamente. A apresentação de OUTBOUND
no Chat, porém, usa session.user.name para todas as mensagens externas enviadas;
uma mensagem de outro atendente pode ter rótulo incorreto. Isso não muda autor
persistido; precisa revisão/teste multi-atendente em entrega própria.

## Achados e contraprovas

1. **P0 — Core prévia**: conversationDTO devolve lastMessagePreview selecionado
   sem messages.read/visibleFromMessage, embora /messages negue ou filtre.
   Harness sintético e REST real no banco isolado confirmaram histórico vazio
   após transferência NONE, com corpo antigo ainda no detalhe/inbox; sem
   messages.read, histórico403 e detalhe200 com corpo. Fixtures sintéticas removidas.
   Não basta ocultar texto no frontend. Bloqueador de encerramento M1.
2. **P1 — checkpoint/fila**: realtimeBus.emit retorna void, listeners fazem void
   de requests REST. RealtimeClient pode confirmar checkpoint antes de aplicar
   conteúdo; erros são capturados sem resync obrigatório. FakeSocket/Promise
   controlada retornou `{"checkpoint":"1","downstreamApplied":false}`.
   Evento enfileirado antes de close ainda foi emitido depois do close:
   `{"eventsDispatchedAfterClose":1}`. Inbox/Demo não filtram novamente org no
   listener; Guards desmontam a UI, mas cancelamento de todos os requests/fila
   não é demonstrado. Não afirmar vazamento real cross-tenant; tratar risco e
   corrigir geração/cancelamento e aplicação/resync com testes antes de fechar.
3. **P2 — Demo retry**: após erro de resposta incerta, send restaura texto e nova
   tentativa usa novo externalMessageId. Core é idempotente para key igual, mas
   essa UI pode duplicar. Somente50 mensagens e sem paginação do simulador.
4. **P2 — escopo/telas/evidências**: Contacts e criação manual de conversa
   permanecem incompletos; transferência/reconnect/org precisam roteiro integrado.
   Homologação das melhorias não equivale a aprovação automática dessas propriedades.
5. **Risco operacional**: código produção ainda só em branches locais; imagens,
   compose tags e plano de recuperação precisam ser preservados na integração.

Contraprovas executadas sem browser/dados de produção: realtime em memória e
preview também no REST do banco isolado wapphub_m1_test. A suíte existente
passou; achados são propriedades adicionais não cobertas, não falhas inventadas
em testes existentes. Correções funcionais não autorizadas neste pedido documental.

## Evidência manual e roteiro restante

Homologação informada: Demo texto bidirecional, UI Polish, scroll/compositor,
UI Polish3 e Lucide. Aceita-se como evidência operacional do usuário. Não houve
screenshots/browser no Homelab. Não há registro confirmando separadamente os
cinco viewports, touch/leitor de tela, FULL/LIMITED/NONE ou multi-Organization.

Após correções e autorização de publicação, no notebook: conta com duas orgs,
duas sessões/atendentes e dados sintéticos permitidos; trocar contexto com requests
atrasados; transferir NONE e conferir que nenhuma prévia antiga aparece; negar
messages.read; simular queda de socket/falha REST; reconectar e conferir inbox/
histórico sem refresh manual; testar teclas/IME/retry/indicação; resolver Contacts/
criação conforme escopo. Usar ambiente de homologação para cenários mutáveis,
sem alterar conversas reais por smoke automatizado. Visual em 1920×1080,
1366×768,1024×768,768×1024,390×844; teclado/flyout/tooltips/logout/contexto.

## Preparação frontend M2

Plano canônico: `wapphub-core/docs/M2_TECHNICAL_PLAN.md`. Chat consome apenas
entitlements/configurações aditivos do Core para UX; backend revalida. Não testar
nome de plano, não persistir autorização em preferências. WappHub Admin/Minha
Conta pertencem a wapphub-platform, não criar essas telas no Chat por conveniência.
Priorizar regressões de sessão/org, contratos/bootstrap, quota/permission versus
capability e preservação de mensagem/scroll. Nenhuma implementação M2 iniciada.
