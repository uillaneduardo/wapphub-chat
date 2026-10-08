# M1 — correção de rolagem e refinamento do compositor

> Atualização documental 2026-10-08: esta entrega foi publicada e o usuário
> confirmou funcionamento das melhorias visuais. Produção atual: Chat3e23452,
> Core72d05aa. Evidência manual não confirma cada viewport/touch/leitor de tela.
> Comandos e pendências de deploy descritos abaixo são históricos da entrega;
> estado corrente e bloqueadores globais M1 em M1_ARCHITECTURE_ACCEPTANCE_20261008.md.
> Nenhum browser/visual automatizado foi executado no Homelab nesta reconciliação.

Branch: `fix/m1-chat-scroll-composer`.
Commit de implementação: `1bdafae`.
Base publicada: `216c384bfd4ea10ef90ad8d26f322f3a6f93693b`, árvore inicialmente limpa.
Core permanece `72d05aa8c0a3c9f12a8c17abb25ad737b88c65af`.

## Causa e correção

O shell/main usavam `min-height: 100vh`, sem altura máxima/definida. O workspace
misturava `flex: 1` com altura calculada; seu grid tinha linha automática, com
mínimo intrínseco. O detalhe usava altura percentual numa cadeia cujo ancestral
podia crescer. Assim, o conteúdo podia aumentar a altura dos painéis e da página
em vez de ficar contido no histórico. O CSS continha ainda
declarações legadas sobrepostas de mínimos (590px, já sobrescritos em outras
regras; 320px no mobile) e cálculos de altura independentes. Foram
removidos esses mínimos/cálculos da área de conversas e estabelecida uma cadeia
com altura definida, track `minmax(0, 1fr)` e intermediários `min-height: 0`.

Somente a rota de conversas recebe shell limitado a `100dvh`, com fallback. O
main divide status realtime e workspace sem calcular altura das barras em JS.
Cabeçalho e compositor ficam visíveis; histórico usa `overflow-y: auto`, scroll
nativo e região focável. A coluna interna organiza as mensagens sem encolher
bolhas. Inbox/contexto têm scroll próprio. Não foi aplicado overflow hidden no
body/root; o clipping já existente do workspace permanece para suas bordas.

A flag anterior forçava final em todo `message.created` e envio otimista. Foi
substituída por `useMessageScroll`, com proximidade de 80px, âncora da mensagem
visível, indicador, retorno ao final e preservação durante prepend/update/resize.
Chaves estáveis por `clientMessageId` evitam saltos na reconciliação. Contexto
(conversa/Organization/usuário) remonta o detalhe, reiniciando estado. Refresh
antigo e eventos de outro tenant não alteram o histórico novo.

Os seis ícones agora são SVGs locais uniformes, sem dependências novas. Negrito,
itálico, anexar arquivo, imagem/vídeo, áudio e emojis continuam desabilitados;
nenhuma formatação, mídia ou vídeo foi implementado. API, payloads, RBAC e
restrições do Demo Provider permanecem. Textarea, envio, IME, limite de caracteres,
falhas, retry idempotente e proteção contra duplicação são preservados.

## Arquivos

- `src/components/AppShell.tsx` e `.test.tsx`: classe de shell limitada à rota de conversas.
- `src/styles/global.css`: cadeia de altura, scroll, indicador e barra de ícones.
- `src/features/conversations/Conversations.tsx`: integração e reset por contexto.
- `src/features/conversations/useMessageScroll.ts` e `.test.tsx`: política de rolagem.
- `src/features/conversations/ComposerTools.tsx`: ícones e controles indisponíveis.
- `src/features/conversations/ConversationView.test.tsx`: regressões/integração.
- `src/test/messageScrollGeometry.ts`: geometria explícita para jsdom.
- `docs/UX_REALTIME.md`, `docs/DESIGN_SYSTEM.md`, este relatório: documentação.

## Validação automatizada

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- `npm test -- --maxWorkers=2`: 64 testes em 14 arquivos aprovados.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.

Inclui abertura no final, proximidade, indicador/retorno, updates sem salto,
prepend (inclusive concorrente com mensagem nova), reconciliação otimista,
redimensionamento, reset de conversa/Organization, refresh atrasado e isolamento
de eventos. Controles/descrições, IME (inclusive keyCode 229), envio/duplicação,
retry/falhas e regressões existentes do Demo Provider também passam. Geometria
é modelada explicitamente em jsdom; esses testes não comprovam renderização CSS.
Nenhum teste mutável em produção ou navegador gráfico foi executado.

Limitações: homologação visual, touch real, teclado virtual e leitor de tela
pendentes. Em browsers sem ResizeObserver, o comportamento de resize deve ser
conferido manualmente; commits de mensagens e scroll continuam preservados.
O histórico mantém renderização DOM existente; não foi adicionada virtualização.

## Homologação manual após publicação autorizada

No notebook, acessar https://chat.wapphub.com.br/app/conversations e revisar
1920×1080, 1366×768, 1024×768, 768×1024 e 390×844. Nenhum teste visual deve ser
executado no servidor. Em cada resolução:

1. Abrir conversa DEMO longa: histórico deve terminar no final, com cabeçalho,
   texto e Enviar visíveis; aumentar mensagens não deve aumentar a página.
2. Receber mensagens estando no final/perto dele: acompanhar, sem duplicações.
3. Subir para mensagens antigas: novas recebidas e envio otimista preservam a
   mensagem em leitura; indicador anuncia novidades. “Ir para o final” retorna,
   limpa o indicador e deixa o histórico focado.
4. Carregar anteriores: mesma mensagem permanece na mesma posição; atualização
   de entrega/status não move a leitura nem incrementa o indicador.
5. Abrir/fechar detalhes, redimensionar textarea/janela: manter posição/final,
   scroll independente e compositor acessível. Conferir teclado virtual mobile,
   barras do navegador, mouse, touch e teclas PageUp/PageDown/Home/End na região.
6. Trocar conversa e Organization: limpar indicador, scroll e rascunho anterior.
   Conferir ausência de dados/respostas atrasadas do contexto anterior.
7. Nomes/e-mails longos: sem scroll horizontal do documento/painel. Conferir
   dropdown, foco, ícones, tooltips por hover/foco e quebra de linha da barra.
8. Seis ferramentas desabilitadas, sem ação/API. Texto: Enter, Shift+Enter, IME,
   limite de 8000 caracteres, pendente, falha e retry. Não testar falhas criando
   requisições mutáveis arbitrárias na produção; usar ambiente apropriado.

## Publicação futura

Nenhum deploy, push, merge, migration, alteração de Core/banco/infraestrutura ou
reinício de container foi realizado nesta revisão. Aguardar autorização explícita.
Após autorização, repetir verificações de commit/árvore, lint, typecheck, testes e
build; construir imagem versionada com `VITE_API_BASE_URL=https://api.wapphub.com.br`.
Preservar a imagem publicada `wapphub-chat:ui-polish-216c384` e atualizar somente
o serviço `wapphub-chat` com `--no-deps`, seguindo `docs/PRODUCTION_DEPLOY.md`.
Nenhuma migration é necessária. Não declarar homologação visual concluída antes
do retorno do usuário.
