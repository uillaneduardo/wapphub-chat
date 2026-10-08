# Experiência de Chat e Realtime

## Objetivo

A experiência deve se aproximar da fluidez esperada de um aplicativo nativo de mensagens.

O produto não pretende copiar visualmente o WhatsApp, mas deve oferecer interação familiar e responsiva.

## Escopo M1 atual

O M1 frontend opera sobre o backend M1 já disponível no Core.

A correção local P1 usa confirmação assíncrona das projeções REST, checkpoint
conservador isolado por User/Organization/aba, retry limitado e reconciliação após
replay. Ver [P1_REALTIME_CONSISTENCY.md](P1_REALTIME_CONSISTENCY.md) para garantias,
limites, testes e publicação pendente. P0 foi homologado; P1 não foi publicado.

Nesta etapa:

- mensagens operacionais são de texto;
- WebSocket é o mecanismo primário de atualização;
- envio é otimista;
- histórico usa cursor pagination;
- reconnect usa replay/event stream;
- assignment e transfer usam os contratos reais do Core.

Imagem, áudio e gravação pertencem ao milestone de mídia e estão documentados separadamente.

## Desktop

Layout base:

- coluna de conversas;
- área central da conversa;
- painel de detalhes/contexto.

Em telas menores, as áreas podem virar navegação em sequência.

## Inbox

Filtros M1:

- Minhas;
- Não atribuídas;
- Todas conforme permission;
- Arquivadas;
- Tag quando suportado pelo endpoint.

A lista deve atualizar incrementalmente por realtime.

Não recarregar a inbox inteira a cada mensagem.

## Histórico

- cursor pagination;
- carregar mensagens anteriores progressivamente;
- preservar posição do scroll;
- suportar atualização incremental;
- preparar componentes para virtualização em históricos grandes.

## Composer M1

- texto;
- envio otimista;
- `clientMessageId` gerado pelo cliente;
- reconciliação com o `messageId` retornado pelo Core;
- retry reutilizando o mesmo `clientMessageId` quando apropriado.

A UI não deve criar duplicação em retry.

## Status de mensagem

Mostrar o estado suportado pelo Core de maneira discreta, por exemplo:

- enviando/local;
- enviado;
- entregue;
- lido;
- falhou.

A interface não deve travar aguardando confirmação remota.

## Realtime

Contratos atuais:

- WebSocket: `/api/v1/realtime`;
- event replay/sync: `/api/v1/realtime/events`.

Comportamento esperado:

- autenticar usando a sessão web existente;
- conectar somente com Organization Context válido;
- reconectar automaticamente com backoff;
- manter checkpoint/last event conforme contrato;
- recuperar eventos perdidos;
- deduplicar eventos;
- atualizar apenas recursos afetados;
- não usar polling frequente como estratégia principal.

Mensagens de contato Demo e respostas do atendente usam os mesmos eventos
`message.created`/`conversation.updated`; o simulador atualiza apenas a conversa
selecionada por realtime. Histórico, autores e texto são consultados na API
autorizada, nunca no envelope de eventos.

## Segurança do realtime

O upgrade WebSocket respeita o Origin autorizado e a sessão do Core.

O frontend não:

- cria JWT paralelo;
- informa `organizationId` arbitrário como autorização;
- mantém subscriptions de Organization anterior;
- trata evento de outro tenant como válido.

## Troca de Organization

Fluxo obrigatório:

1. bloquear temporariamente ações mutáveis;
2. solicitar a troca de contexto ao Core;
3. encerrar/descartar escopos realtime anteriores;
4. invalidar cache tenant-scoped;
5. estabelecer realtime no novo contexto;
6. carregar bootstrap/inbox do novo tenant;
7. liberar interação.

Nunca manter visualmente dados da Organization anterior.

## Transferência

A UI deve representar as três políticas do Core:

- `FULL`;
- `LIMITED`;
- `NONE`.

A visibilidade é determinada pelo Core. O frontend não apaga nem copia histórico para simular a política.

## Mídia — etapa posterior

Quando o milestone de mídia for iniciado, o composer será expandido para imagem e áudio, incluindo preview, gravação, player e retry.

Essas capacidades não pertencem ao frontend M1 atual. Consulte `docs/MEDIA_EXPERIENCE.md`.

## Android futuro

A UX web serve de referência funcional, mas componentes web não devem limitar o contrato da API.

O futuro Android nativo deve poder reproduzir:

- realtime;
- envio otimista;
- alternância de organização;
- cache/offline controlado;
- mídia quando o respectivo milestone existir.

## Revisão de rolagem do atendimento M1

A rota de conversas usa um shell com altura de `100dvh` (fallback `100vh`).
O conteúdo principal é grid: status realtime em linha automática, workspace em
`minmax(0, 1fr)`. Padding e navegação mobile existente são descontados pelo box
model, sem subtrair alturas arbitrárias do histórico. Workspace tem uma linha
`minmax(0, 1fr)`; painel da conversa, detalhe, corpo e coluna de mensagens
permitem encolher com `min-height: 0`. Cabeçalho e compositor não encolhem.
Inbox, histórico e contexto mantêm scroll próprios. O shell das outras rotas
continua com rolagem de documento. Não se oculta overflow no body/root.

O histórico recebe foco (`region`, `tabIndex=0`) e usa scroll nativo para mouse,
touch e teclado. As mensagens ficam em uma coluna interna, sem encolher suas
bolhas. A ancoragem automática do navegador é desabilitada somente no histórico
para não disputar com a preservação explícita da mensagem em leitura.

Após o carregamento inicial, o histórico vai ao final. Novas mensagens acompanham
quando o usuário está a até 80px do final; longe dele, a mensagem visível e seu
deslocamento relativo são preservados. Um indicador discreto anuncia novas mensagens
abaixo e oferece “Ir para o final”, que limpa o indicador e devolve foco ao
histórico. Atualizações de status não levam alguém próximo do final até o rodapé;
quem já está no final continua nele quando a altura muda. Paginação mantém a
mensagem em leitura mesmo que o controle de carregar anteriores desapareça.
Reconciliação otimista usa `clientMessageId` como identidade estável de rolagem,
sem contar o mesmo envio novamente. `ResizeObserver` mantém a posição ao mudar
a altura disponível, inclusive ao abrir detalhes ou redimensionar o textarea.
Sem `ResizeObserver`, a preservação continua nos commits de mensagens e no scroll.

A troca de conversa, Organization ou usuário remonta o detalhe com uma chave de
contexto, limpando scroll, indicador e rascunhos. Uma resposta antiga de refresh
não altera o histórico do novo contexto; eventos de outra Organization são
ignorados. Não há polling nem consulta adicional para controlar rolagem.

Compositor mantém texto simples, 8000 caracteres, Enter para enviar,
Shift+Enter para nova linha, IME, estado pendente, erro e retry idempotente.
As seis ferramentas permanecem desabilitadas. Ícones SVG locais de negrito,
itálico, anexo, imagem/vídeo, microfone e emoji substituem caracteres dependentes
de fonte; não adicionam suporte a mídia/vídeo. Tooltips explicam a indisponibilidade
por hover/foco, com descrição acessível. Botão Enviar mantém o payload vigente.

## Preferências locais do atendimento (UI Polish 3)

Recolher/expandir navegação não muda rota nem subscriptions. Preferências cosméticas
são isoladas por User no localStorage, sem sessão/token/textos. Largura do contexto
usa limites dinâmicos para preservar o histórico. Nenhuma transição de largura
foi adicionada; a política de ancoragem/ResizeObserver já existente mantém a leitura.

Compositores principal e Demo usam o mesmo hook para Enter/Shift+Enter. Padrão:
Enter envia, Shift+Enter é newline nativo. Modo alternativo: Shift+Enter envia,
Enter é newline nativo. IME e Ctrl/Alt/Meta não são capturados. Botão, limite,
permissions, payload e retry principal permanecem; Demo tem lock síncrono para
bloquear duplicação pelo novo atalho. Não há consulta de API para preferências.

Ver `M1_UI_POLISH_3.md` para navegação, splitter, armazenamento e critérios de
homologação. Não instalar/executar navegador gráfico ou screenshot no Homelab;
validar visualmente no notebook após deploy explicitamente autorizado.
