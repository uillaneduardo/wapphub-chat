# P1.2 — mídia visível e visualizador integrado (em revisão)

Dependências: PR30 realtime e PR31 gravação/retry. Sem publicação, browser gráfico
ou homologação visual; runtime ainda baaee36. Progresso canônico e diagnóstico
backend em wapphub-core/WHATSAPP_WEB_CONSOLIDATION_PROGRESS.md.

MessageMedia passa a observar visibilidade dentro do histórico (IntersectionObserver
com root real .message-history, rootMargin0). Um observador compartilhado por
histórico evita um observador por mensagem. Fora do viewport não há GET automático;
entrada carrega imagem ou prepara URL Core autenticada via Range0-0 para players.
Sem suporte ao observer, permanece ação manual acessível. Refresh completo
reconstrói fontes das mensagens autorizadas e visíveis pela API, sem bytes em storage.

Fila da conversa aceita uma transferência por vez (limite remoto atual do Provider) e reserva até32MiB de arquivos em voo,
considerando tamanho completo de áudio/vídeo mesmo para metadados. Autoload nativo
usa preload=metadata, muda para none após metadados, segura admissão até idle/suspend,
tem prazo30s e nunca autoplay. Reprodução solicitada pelo usuário usa streaming/Range
normal do browser e fica fora do orçamento de autoload. Verificação inicial Range
pode demandar cache/download do Provider no primeiro acesso; limites server-side e
RBAC existentes permanecem. Não prometer que preload metadata transfere exatamente
uma quantidade constante em todos os browsers; homologação deve inspecionar rede.

Downloads duplicados de mediaId compartilham Promise/URL. Até32MiB de Blob URLs
visíveis, referenciadas; nenhum cache ocioso/LRU ou bytes persistidos. Última referência
revoga URL. Saída do viewport cancela fonte que não está em reprodução/visualizador;
contexto/tenant/unmount cancela tudo. Erro exige Tentar novamente explícito. Downloads
solicitados pelo usuário compartilham concorrência/orçamento de rede, e têm Blob
transitório separado≤25MiB, revogado logo após gesto de salvar. Orçamento não mede
memória de imagens decodificadas/buffers internos dos players do browser.

Lightbox de imagem reutiliza Blob autorizado: overlay, fechar/Escape, zoom0,5–4x,
ajustar à tela e download. Vídeo reutiliza URL Core; inline sai durante o modal,
controls/use-credentials, sem autoplay; fechar remove src e interrompe reprodução.
Foco é contido, siblings inert, scroll de body temporariamente bloqueado e foco
retorna ao botão ou histórico. Layout responsivo/dvh, alvos44px e tokens existentes.
Download nativo é GET autenticado/Blob por gesto, evitando navegação do documento
quando browser ignora atributo download em URL cross-origin. Nenhuma nova aba para
ampliar, nenhum Provider directPath/segredo no frontend.

Fontes/players sobrevivem a eventos de status/revalidação com mesma identidade;
alteração real de autorização e tenant continua descartando o contexto. Rascunho,
scroll, conversa selecionada, painel e optimistic continuam sob a correção PR30.

Arquivos: MessageMedia.tsx/MediaLightbox.tsx/media.css, Conversations.tsx (pool scoped),
lib/mediaTransfers.ts/mediaVisibility.ts, styles/tokens.css e testes do pool/autoload.
Nenhum contrato REST/realtime/schema/dependência alterado. Média de requests para
duas representações simultâneas do mesmo mediaId:2→1 em teste; fonte nativa nunca
faz apiBlob automático. Limite padrão de concorrência1 (configuração2 também testada no pool) e byte budget/cancel/cleanup testados.

Validação inicial:372/372 em36 arquivos, lint/typecheck/build. Doze casos novos
cobrem root/visibilidade, remount/manual refresh, mesmo status sem substituir player,
limites/dedup/refs, late tenant, erro/retry, áudio/voz/vídeo sem autoplay, modal,
zoom/foco/teclado/download. CI e resultados após integrar revisão final PR30 constam
no progresso Core. JS535,59kB/gzip168,39kB; CSS52,25kB/gzip9,62kB. Comparar baseline
por artefato/CI, sem atribuir redução de CPU/rede produtiva antes de deploy. CPU:
um observer por root+fila e timers somente de metadados; bytes dependem da mídia e
visibilidade. Sem benchmark comercial ou browser gráfico.

Rollback: reverter esta PR Chat, preservando PR30/31; antiga ação Abrir mídia/nova
aba retorna. Pode voltar imagem media-p1-baaee362cc16 com regressões anteriores.
Sem SQL/filas/Vault/auth ou dados persistidos para restaurar.

Homologação no notebook após autorização: carregar conversa longa com DevTools
Network; mídias fora do viewport não são buscadas, scroll ativa no máximo um
preparo e interrompe os dispensados. Refresh manual reconstrói mídias visíveis;
áudio/vídeo só preparam metadados, controles/seek/velocidade e reprodução por gesto.
Ampliar imagem/vídeo sem outra aba, Escape/Tab/ShiftTab/foco/zoom/fit/download,
mobile. Testar erro/retry, scroll durante playback/modal, tenant/permissão alterados
com mídia em voo e status realtime/rascunho/painel preservados. Validar codecs e
comportamento de metadata/Range em browsers reais; jsdom não reproduz decodificação.

Revisão final alinha cold loads ao guard global de uma transferência remota do
Provider, evitando429MEDIA_BUSY gerado por duas mídias visíveis concorrentes.
Reprodução explícita libera admissão de metadados e seu timer, para não cancelar
um áudio/vídeo em reprodução por ter ultrapassado30s de download/buffering.
A revisão final PR30 foi incorporada antes da CI/suíte finais.
