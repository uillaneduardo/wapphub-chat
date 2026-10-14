# P1.2 — consistência realtime e estabilidade (em revisão)

Runtime auditado: Core/API/Worker/Provider `763981a`, Chat `baaee36`, labels OCI,
IDs/StartedAt/restarts conferidos. Nenhum merge/deploy ou browser gráfico.
Fonte de progresso e cadeia backend: Core `WHATSAPP_WEB_CONSOLIDATION_PROGRESS.md`.

Reproduções antes da correção: cinco regressões em testes sintéticos. Uma sessão
revalidada com permissões idênticas mas novo array alterava `can`, executando a
limpeza/bootstrap de `ConversationViewContent`. Reconciliação na conexão apagava
mensagens, cursores e players antes do REST. Nenhum `location.reload`, service
worker ou mecanismo de atualização automática de assets encontrado; esses dois
caminhos produzem atualização React, sem nova navegação do documento. A navegação
real do incidente humano ainda precisa de evidência do navegador.

`mergeMessages` só comparava timestamps: igualdade permitia regressão, relógio do
cliente podia bloquear confirmação, alias otimista podia substituir persistida.
Agora evidência SENT/DELIVERED/READ do Core prevalece monotonicamente, identificação
por clientMessageId/conversa/autor conserva registro persistido. Nenhum status é
fabricado. Falha tardia de POST não rebaixa uma confirmação recebida via realtime.
Índice de aliases substitui busca quadrática. Retry autorizado FAILED/NOT_SENT
continua possível; comprovado em teste anterior.

Permissões ordenadas formam dependência estável; revalidação passiva não limpa a
conversa. Guardas continuam suspendendo imediatamente contexto sob 4003 e mudança
real de autoridade continua invalidando componentes. Reconciliação normal atualiza
projeções autorizadas sem reset. Transferência/atribuição continuam limpando dados
que podem perder autorização. Paginação preserva cursor anexado durante REST.

Fila de frames e realtimeBus continuam seriais e checkpoint só avança após REST e
reconciliação bem-sucedidos. Eventos aplicados mas não confirmados pelo checkpoint
são reaplicados na nova conexão. Watchdog de 20 s usa checkpoints existentes do
Core (cada 5 s), sem heartbeat/contrato novo. Backoff máximo de oito tentativas;
foco/online permitem recuperação. Foco reconcilia em fila, coalescido por 10 s,
sem polling frequente ou reload.

Diagnóstico temporário opt-in: em DevTools, `sessionStorage.setItem('wapphub-chat:diagnostics','1')`
e atualizar manualmente uma vez. Console com preservação de logs registra
instanceId de documento, navigationType, mount/unmount do shell, reason,
eventId/checkpoint e status antes/depois. Buffer em memória limitado a 200;
nenhum corpo, URL, mídia, usuário/tenant ou segredo. Mesmo instanceId sem
`document.start` é React/revalidação; nova instância/document.start com tipo reload
é navegação de documento. Desabilitar removendo essa chave. Não instalado em produção.

Validação: 355/355 em 34 arquivos, mais dois casos de POST tardio (resolvido e
rejeitado), 24/24 da ConversationView; lint/typecheck/build aprovados. CPU/rede
produtivos não medem código novo porque não há deploy. Custo adicional: watchdog
único por socket e uma reconciliação por retorno de foco (limitada); mesmo modelo
REST/replay. Build: JS525,25 kB/gzip165,17 kB, CSS50,54 kB/gzip9,34 kB; aviso Vite
preexistente de chunk >500 kB, sem falha. Sem benchmark de carga comercial.

Rollback: reverter imagem Chat para `wapphub-chat:media-p1-baaee362cc16`, mantendo
Core/Provider, banco, histórico, sessões e filas. Reintroduz as corridas corrigidas.
Sem schema, dependências ou dados persistidos novos. Contrato aditivo Core: GET de mensagem por ID e readScope de Conversation.

Homologação no notebook após publicação autorizada: observar progressão real dos
status, comparar REST/DOM e logs; atrasar POST/GET e derrubar WS; retornar de foco;
verificar rascunho, conversa, scroll, players e painel lateral; repetir alteração
real de permissões, troca de tenant e expiração. Reload manual deve reconstruir
estado autorizado pela API. Mídia automática/lightbox em PR seguinte.

Revisão final: reconciliação invalida respostas de paginação iniciadas antes dela,
sem abortar uploads/envios ou apagar a vista. REST401 no retorno de foco expira
sessão imediatamente. Watchdog não interrompe trabalho aceito de replay em voo;
REST continua limitado pelo realtimeBus/cliente API. Três regressões adicionais
passam nos focados; CI do novo head repete a suíte completa.

Revisão do contexto lateral: páginas de notas já carregadas são reconsultadas e
mescladas com o mesmo limite/epoch do histórico, em vez de perder as páginas mais
antigas a cada reconexão. Registros fora da autorização atual são removidos.
Diagnóstico de reconnect inclui reason/code técnicos; reason bruto do socket
nunca é registrado. Regressões adicionais de notas e privacidade passaram.

Revisão da janela REST: comprovado em teste que avançar a página retirava um
registro antigo ainda carregado (e seu player). Core adiciona GET
`/conversations/:id/messages/:messageId`, com o mesmo RBAC, tenancy, piso de
visibilidade e fronteira histórica da listagem. Eventos de mensagem consultam
apenas esse ID; erros transitórios impedem confirmação do checkpoint. Um Core
anterior (404 NOT_FOUND de rota) mantém a reconciliação conservadora anterior.

`Conversation.readScope` é um hash opaco do escopo efetivo de leitura. Não é
credencial e não autoriza requisições. Quando permanece igual, páginas REST
podem avançar sem apagar registros já autorizados; quando muda, conteúdo é
invalidado e reconstruído. Transferências/atribuições continuam invalidando
imediatamente. Foco/reconnect verificam até oito PENDING persistidos visíveis
por ID, sem timer de polling. Paginação preserva corridas e permite percorrer
fronteiras deslocadas sem duplicar linhas. Notas seguem a mesma invalidação.
Três testes adicionais comprovam consulta pontual, estabilidade do elemento,
retenção de página antiga e remoção após mudança real de escopo.

Validação final: 365/365 em34arquivos, lint/typecheck/build aprovados;
29/29 ConversationView repetidos após limpeza de mocks. JS527,19kB/gzip165,75kB,
CSS50,54kB/gzip9,34kB; aviso preexistente >500kB. Core PR42 fornece o contrato
aditivo (156/156 + checks), empilhado sobre Core PR41. Chat PR30 permanece draft.
