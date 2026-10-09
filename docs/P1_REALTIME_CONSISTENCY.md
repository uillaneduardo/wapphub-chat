# P1 — Consistência e recuperação do realtime

> P1 publicado em 2026-10-08: Chat `6bbc1c474f6f5b8f321bd957f8e904bb9016147a`,
> imagem `wapphub-chat:p1-realtime-6bbc1c4`, healthy. HTTP/SPA/assets/hashes aprovados.
> Core/API/Worker permanecem P0 cbaf50c; MariaDB/Redis preservados.
> 129 testes anteriores reaproveitados, sem repetição. Homologação P1 manual pendente.
> [Registro da publicação](DEPLOY_P1_20261008.md). Demais aceites M1 permanecem.

## Registro anterior / procedimentos

## Estado e evidência

Correção local na branch `fix/m1-realtime-consistency`. Commit funcional final:
`cc61ef02b31e39a90a794f18eb3dd07fe14fc663`. Base `6cdec1660546bed99edbfef07fbd391c166dd0fb`, preservando o código
P0 publicado `d93efc576bd560fcbab0146343fb98bbbc1d0b69` e documentação do deploy.
Core permanece no código publicado `cbaf50c5eedd6731e1ca3a674c1d9b0b20005a7d`.
P0 homologado manualmente pelo usuário; nenhuma publicação P1 nesta execução.
M1 não formalmente encerrado; M2 não iniciado.

Evidências versionadas: [manifesto](evidence/P1_20261008/manifest.json),
[contraprova](evidence/P1_20261008/before.log),
[suíte](evidence/P1_20261008/tests.log),
[integração final](evidence/P1_20261008/integration-final.log),
[lint](evidence/P1_20261008/lint.log),
[typecheck](evidence/P1_20261008/typecheck.log),
[build](evidence/P1_20261008/build.log).

Commits funcionais locais: `dc70f6a` (confirmação/recuperação) e `cc61ef0`
(paginação concorrente e fila Demo). Documentação em commit separado, sem push/merge.

## Causa raiz e fluxo anterior

Core cria domínio, AuditEvent e RealtimeEvent na mesma transação e serializa
alocação por Organization. Redis publica somente wake-up. `gateway.pump` consulta
stream persistido, filtra pelo contexto/permissions/visibilidade atual e envia
IDs versionados + checkpoint após cada página de100 registros escaneados.
Checkpoint inclui eventos invisíveis; IDs BigInt são strings, com lacunas permitidas.
Não há retenção neste M1; reconnect usa o último cursor confirmado. Guarda de
sessão/contexto revoga socket; o contrato permite entrega repetida, não exactly-once.

Chat usava uma fila serial no RealtimeClient, mas `realtimeBus.emit` retornava void.
Listeners iniciavam REST com void, alguns capturavam erros sem recuperação.
Assim `await onEvent` aguardava somente o despacho, não a aplicação. Cursor por
Organization no localStorage podia avançar com REST pendente/falhado, ser partilhado
por contas/abas e sobreviver a closes sem guarda de geração. Inbox/Demo tinham
consultas com respostas tardias; histórico mesclava conteúdo previamente permitido
sem substituir o conjunto após mudança de visibilidade.

Dois testes criados ANTES da implementação falharam: confirmação durante REST
pendente e falha500 não propagada (a versão anterior também produziu rejeição
não tratada). Arquivo before.log registra a contraprova; esses mesmos testes passam.

## Decisão arquitetural

Estratégia híbrida mínima: consumidores assíncronos + fila serial de invalidações,
checkpoint conservador, replay e reconciliação REST de bootstrap/reconexão.
Sem cache central novo, dependência adicional ou alteração de servidor.

- Somente checkpoint após aplicação, isoladamente, não cobre troca de página,
  bootstrap concorrente ou mudança de autorização de eventos já filtrados.
- Fila durável/cache global com novo catálogo de consultas exigiria migração
  arquitetural desnecessária para o estado local atual. Pode ser estudada depois.
- ACK no servidor alteraria contrato/backend sem necessidade; o cursor de scan
  existente e REST autorizado já permitem recuperação.
- Polling frequente não atende a arquitetura e não foi introduzido.

## Novo fluxo e garantias

1. Receber e validar envelope versão1, tenant e decimal string.
2. Registrar frame na fila serial da geração atual de socket.
3. Deduplicar eventos confirmados/aplicados; evento futuro fora de ordem acima do
   cursor é uma invalidação, não snapshot de conteúdo. Nunca regredir cursor.
4. Barramento captura consumidores ativos do tenant. Cada consumidor aguarda seu
   bootstrap, solicita REST autorizado e devolve a Promise; nunca usa corpo do WS.
5. Atualização aceita no estado da projeção React é confirmação de aplicação;
   não se afirma sincronização com pintura do DOM. Todos os consumidores devem
   concluir, ou descartar por cancelamento/desmontagem com bootstrap obrigatório
   na próxima montagem. Não há cache visual durável fora dos componentes.
6. Só então registrar deduplicação do evento. Repetição parcial pode atualizar
   projeções que já tiveram sucesso, sempre por IDs e operações idempotentes.
7. Processar checkpoint depois dos eventos anteriores. No primeiro `hasMore=false`
   de cada conexão, também reconciliar todas as projeções ativas via REST antes de
   confirmar e exibir Conectado. Isso cobre eventos filtrados e ausência de listeners.
8. Persistir somente cursor confirmado, monotônico. Remover IDs deduplicados abaixo
   dele para limitar memória. `hasMore=true` continua paginação automática do Core.

O cursor agora fica em sessionStorage, chave v2 de User + Organization por aba;
cursor legado de recebimento em localStorage é ignorado. Não há sessão/token ou
conteúdo nesse storage. Cada aba precisa confirmar suas próprias projeções.
Mudar conta/contexto remonta Outlet, fecha a geração antiga e cancela listeners,
requests e timers. Logout inicia loading no guard ANTES de aguardar revogação REST,
sem substituir logout por navegação. REST401/close1008 descartam sessão local/CSRF.

Sem consumidores montados, não existe estado local retido a aplicar: checkpoint
pode confirmar. Ao abrir uma página, consultas REST novas obtêm estado atual.
Navegar/reabrir não depende de um listener visual anterior ter participado do replay.

## Recuperação, pressão e estado desatualizado

REST transiente/500/timeout rejeita o consumo: cursor não avança, socket fecha e
replay recomeça no checkpoint seguro. Sucessos de outras projeções não tornam uma
falha invisível. Barramento aguarda todos os resultados e não expõe erro/conteúdo
em logs. O estado Reconectando indica consistência pendente.

Cada trabalho de consumidor tem limite10s com AbortSignal e limpeza de timer.
GETs de bootstrap/consulta têm limite15s e cancelamento; comandos POST/PUT/DELETE
mantêm payloads e semântica de retry/idempotência. Respostas canceladas não aplicam
estado, mesmo quando mocks/servidor demoram a encerrar. 403/404 de conversa invalidam
acesso/cache, sem repetir pedidos de conteúdo proibido indefinidamente.

Backoff com jitter:500ms,1s,2s,4s,8s,16s,30s,30s (±20%). Depois de oito reconexões
sem sucesso/progresso, pausa com “Dados desatualizados — reconexão pausada” e botão
Tentar novamente; evento online também reinicia recuperação. Não há polling.
Progresso confirmado de páginas reseta falhas, permitindo replay grande. Abrir
socket sozinho não reseta tentativas nem indica dados sincronizados.

Fila de socket limitada a256 frames. Ao exceder, ignora novos frames, drena os já
aceitos e só então reconecta pelo checkpoint alcançado; replay recupera descartados.
Abortar imediatamente poderia impedir qualquer progresso ao migrar cursor legado
para0. Teste de400 eventos confirma progresso até200 antes da retomada. Banco/stream
permanecem fonte da verdade; nenhuma garantia de exactly-once ou entrega offline.

## Projeções, ordem e P0

Inbox continua incremental por GET Conversation, respeitando filtros e messages.read
na exibição da prévia. Não recarrega a lista a cada evento. Bootstrap/reconexão
refazem lista e tags; páginas anteriores da inbox podem ser recarregadas pelo cursor.
Bootstrap antigo não sobrescreve refresh mais recente; cada atualização/reconciliação
invalida a paginação pendente. Resposta de página antiga não recoloca prévia de
conversa removida por acesso revogado; geração/cancelamento também cobrem troca de filtro.

Histórico consulta páginas contíguas a partir do endpoint autorizado, conforme o
número de páginas carregadas; não reaproveita cursores como se fossem snapshots.
Mensagem duplicada é mesclada por id/clientMessageId. updatedAt mais novo preserva
estado contra resposta atrasada. Envios novos durante GET e otimistas são preservados
no refresh normal; REST não reexecuta efeitos de envio/recibo/notificação.

Transferência/assignment e resync limpam histórico/notas, cancelam paginação pendente
e reconsultam conjunto autorizado. FULL/LIMITED/NONE vêm exclusivamente do Core;
NONE admite mensagens futuras permitidas. 403/404 removem conversa inacessível.
Sem messages.read não há GET messages nem render de corpo. Resync restaura primeira
página do histórico por segurança; páginas antigas/posição podem exigir navegação
novamente após queda/transferência. Refresh normal mantém scroll/indicador existentes.

Demo usa o mesmo barramento/checkpoint/REST, com filtro de tenant/conversa e guarda
de seleção. Bootstrap, atualização pós-envio e realtime compartilham fila serial
de leituras, impedindo que uma resposta pós-envio antiga sobrescreva evento novo. INBOUND continua Contact; OUTBOUND continua User conforme persistência.
UI Demo não autentica contato externo. Payload de envio, locks e atalhos permanecem.
Limitações anteriores de retry incerto Demo, histórico50 e rótulo de autor não foram
ampliadas para outro escopo. Não houve nova notificação/contador comercial.

## Matriz de testes

| Cenário | Evidência |
| --- | --- |
| Recebimento + REST aplicado antes do cursor | realtimeBus, realtime e integração Inbox com Promise controlada |
| REST500/timeout | erro propagado; cursor conservado; timeout real do barramento e fetch abortado |
| Falha inicial seguida de sucesso | replay/client e Inbox real recuperam estado sem refresh manual |
| Disconnect durante consulta/reconnect pendente | sinal abortado, frame antigo ignorado, replay do cursor seguro |
| Duplicados | dedup transporte; integração histórica sem mensagem duplicada |
| Fora de ordem/rajadas | fila serial; cursor monotônico; REST antigo não regride mensagem;400 eventos |
| Troca de conversa | request antigo abortado; componente novo não recebe resposta atrasada |
| Troca de Organization | SessionProvider + Guards + AppShell com REST pendente e duas orgs sintéticas |
| Logout | cancela no início; logout REST continua; nenhum cursor escrito depois |
| Desmontagem e navegação sem inbox | cancela consumidor; nenhum cache durável; bootstrap posterior atual |
| Sessão expirada | REST401/close1008 encerram geração/contexto local |
| Ausência de leitura/tenant estrangeiro | nenhum GET corpo; prévia P0 permanece ocultada; filtros bus/client |
| FULL/LIMITED/NONE e acesso perdido | integração usa somente respostas autorizadas e remove cache anterior |
| Demo e regressões UI | mesmo ACK, fila pós-envio + realtime, autoria INBOUND, atalhos/IME/duplicação/scroll existentes verdes |
| Paginação inbox + revogação | resposta atrasada não ressuscita prévia removida |

Suíte completa:129 testes em19 arquivos, incluindo38 novos testes sobre os91 P0.
Lint sem erros/avisos, typecheck e build aprovados. A revisão final acrescentou
invalidação de paginação concorrente e fila de leituras Demo, com duas contraprovas
adicionais; a suíte completa foi executada novamente por esses ajustes funcionais.
Depois houve somente ajuste de indentação antes do commit/build final. Manifesto
identifica fontes do commit funcional; não houve alteração funcional posterior.
Ambiente local/jsdom/mocks/sintético, sem banco de produção, browser ou screenshot.

## Compatibilidade e desempenho

Core sem alterações (incluindo Prisma, migrations, OpenAPI e WS): diff contra
cbaf50c vazio em código/schema/dependências/contrato. Hashes em manifest.json.
Não há migration, novas APIs, permissions, payloads, auditoria de servidor ou seeds.
Testes backend P0 anteriores não foram reexecutados: backend não mudou; validação
Chat mantém a defesa P0 e aplica respostas autorizadas. Não simular backend de cliente
como prova adicional de autorização server-side.

Sem bibliotecas novas ou mudança de lock/Dockerfile/Compose. GETs por evento seguem
recursos afetados; uma reconciliação extra por conexão é intencional. Grandes replays
podem gerar mais consultas/auditoria existente; fila/backoff limitam concorrência.
Sem benchmark de carga/SLA. Bundle local:338,05kB JS/105,62kB gzip; CSS33,04kB/6,50gzip.
Memória de dedup é podada por cursor e buffer de frames limitado. Uma falha de
projeção segura conservadoramente o checkpoint de todo o contexto.

## Limitações e homologação

Retenção/compactação futura do stream requer resync explícito no Core; não assumir
que o cursor antigo sempre existirá fora do contrato M1 atual. Depois de falhas
persistentes, recuperação requer retry/online: indisponibilidade não tem limite
prometido. Reconnect pode resetar páginas antigas/scroll para limpar permissões.
Estado de sessão de outra aba revogado é invalidado pela guarda do Core. Sem offline
persistido, exatamente uma vez ou benchmark comercial. M1 ainda tem demais aceites
identificados na auditoria; correção local não substitui deploy e homologação.

Após autorização/publicação, notebook com contas e dados sintéticos permitidos:

1. Duas sessões, enviar/receber texto e Demo; conferir atualização/contagem sem duplicação.
2. DevTools bloquear uma leitura REST: indicador de recuperação, restabelecer e
   conferir atualização/replay sem reload; falha persistente deve mostrar retry.
3. Derrubar WS/reconectar enquanto chegam mensagens; restaurar rede e conferir dados.
4. Trocar conversa/org/logout com request atrasado: nenhum dado antigo reaparece.
5. Transferir FULL/LIMITED/NONE e negar messages.read; conferir prévias, histórico
   autorizado, mensagens futuras, acesso perdido e notas.
6. Reabrir inbox após navegar em outra página e confirmar bootstrap atual.
7. Revisar histórico/atalhos/IME/otimista/retry e status/retry em390×844 e notebook.

Homologação P1 manual pendente, sem navegador/screenshot no Homelab.

## Publicação futura rápida (não executada)

Publicação somente Chat após autorização explícita, Core/API/Worker mantidos no P0.
Confirmar SHA final aprovado, Git limpo, manifesto/fontes e lock/Dockerfile iguais.
Reaproveitar evidências se equivalentes; build Docker do artefato obrigatório com
VITE_API_BASE_URL=https://api.wapphub.com.br e tag fixa p1-realtime-<sha-aprovado>.
Não repetir suítes completas automaticamente em deploy equivalente.

Preservar wapphub-chat:p0-preview-d93efc5 e configuração atual. Usar compose.yml
existente, CHAT_IMAGE_TAG=<tag-construida>, up somente wapphub-chat com
--no-deps --no-build --pull never --wait --wait-timeout60. Sem Core restart/migration.
Verificar healthy/login/SPA/assets/hashes/API readiness/logs e homologar no notebook.
Registro de deploy com versões/IDs; nunca fazer push/merge/publicação implícitos.

Rollback Chat para P0 pode reintroduzir P1; manter Core P0 corrigido e avaliar risco
operacional. Nunca voltar Core para demo-72d05aa vulnerável. Não restaurar banco.

## Arquivos dos commits funcionais

- `src/components/AppShell.realtime.test.tsx`
- `src/components/AppShell.test.tsx`
- `src/components/AppShell.tsx`
- `src/features/conversations/ConversationView.test.tsx`
- `src/features/conversations/Conversations.tsx`
- `src/features/conversations/InboxList.test.tsx`
- `src/features/conversations/InboxList.tsx`
- `src/features/conversations/conversationModel.test.ts`
- `src/features/conversations/conversationModel.ts`
- `src/features/providers/Providers.tsx`
- `src/features/session/SessionContext.tsx`
- `src/lib/api.test.ts`
- `src/lib/api.ts`
- `src/lib/chatApi.ts`
- `src/lib/realtime.integration.test.tsx`
- `src/lib/realtime.test.ts`
- `src/lib/realtime.ts`
- `src/lib/realtimeBus.test.ts`
- `src/lib/realtimeBus.ts`
- `src/styles/global.css`

## Produção preservada (inspeção somente de leitura)

Ao fim da execução, API/Worker permanecem wapphub-core:p0-preview-cbaf50c,
Chat wapphub-chat:p0-preview-d93efc5, MariaDB mariadb:11.4 e Redis redis:7.4-alpine,
todos healthy. StartedAt de API/Worker:2026-10-08T17:57:53Z; Chat:17:59:09Z;
MariaDB/Redis:2026-10-07T23:52:48Z, correspondentes ao registro anterior.
Nenhum container reiniciado, build Docker/deploy, SQL/migration/seed, mudança de
Cloudflare/infraestrutura, push ou merge nesta correção local.
