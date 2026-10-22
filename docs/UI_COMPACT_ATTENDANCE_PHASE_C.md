# Fase C — Inbox e conversa compactas, detalhes sob demanda

**Data:** 22/10/2026  
**Situação:** implementado em PR, sujeito aos gates de CI e à homologação visual no notebook após deploy.  
**Referência:** redesign PR #39; fundação PR #40; shell PR #41.

## Entrada de homologação
O usuário confirmou **10/10 verificações de Fase B** no homelab em 22/10/2026, incluindo navegação 60px, barra mobile com três itens, ocultação na conversa, menu Mais, disponibilidade do compositor, envio/recebimento e reprodução de mídias. Isto é evidência de homologação informada pelo usuário, não verificação por acesso ao servidor. A Fase C parte dessa versão sem alterar ações do Core/Provider.

## Alterações concretas
1. **Inbox** — título e ações em uma faixa compacta, botão Nova conversa preservado apenas quando autorizado, busca local nos itens **carregados** (nome, id do contato e preview somente se houver `messages.read`), abas horizontais e linhas mais densas (67px desktop / 70px mobile). A busca não executa requisições nem presume resultados de outras páginas; Carregar mais mantém o cursor/API existentes.
2. **Cabeçalho** — avatar de iniciais/fallback já introduzido na Fase A, agora visível também no mobile; nome/identificador truncados corretamente, ícones Lucide de voltar e detalhes, botão de detalhes permanente com `aria-expanded` e `aria-controls`. Voltar conserva `scope` na URL sem alterar RBAC.
3. **Painel de contexto** — 1440px ou mais: mantém divisor redimensionável e persistência de largura já existentes, com ação para recolher/exibir o painel. Abaixo de 1440px: painel vira **drawer lateral sobreposto**, em vez de ocupar até 40% da altura ou comprimir a coluna central. Backdrop e fechar via botão/Escape, foco inicial no botão de fechar e retorno ao acionador. Tab/Shift+Tab permanecem nos controles do drawer enquanto aberto. Ao fechar, elementos são inertes; nenhuma funcionalidade interna é reimplementada.
4. **CSS** — `src/styles/conversation-compact.css` importado após `shell-compact.css`, sem alterar globalmente regras de outras rotas. Tokens existentes (inclusive cor por organização) e mobile safe area continuam vigentes.

## Contratos preservados
- Os filtros da Inbox continuam consultando escopo de conversa/atribuição do Core; AGENT não ganha acesso a não atribuídas. Busca no frontend não consulta mensagens sem `messages.read`.
- Não há alteração em hooks de mensagem, scroll, reconnect, envio e retries idempotentes, voz/vídeo/imagem, media transfers, Composer, autorização, websocket, Core, Worker, DB ou Provider.
- Contexto mantém ações reais existentes de atribuir, tags, arquivar e notas, controladas por permissões. Fechar/abrir drawer **não desmonta** o histórico de mensagens nem o Composer, preservando posição, rascunhos e mídia.
- **Foto de perfil externa:** não adicionada. Usamos avatar com fallback até existir API/fonte de foto tenant-scoped aprovada pelo Core.

## Gates automatizados
`npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`.
Novos testes cobrem busca na lista carregada e proteção do preview, Escape/retorno de foco/backdrop e manutenção do histórico/compositor. Toda a suíte anterior continua obrigatória.

## Homologação manual em notebook (após deploy explicitamente autorizado)
- **390px, 320px:** Inbox compacta e pesquisável; abrir conversa conserva o scope; avatar aparece no header; detalhes abrem lateralmente, fechar via botão, Escape e toque fora; histórico/compositor continuam acessíveis.
- **768px, 1024px, 1366×768:** Inbox permanece na esquerda; detalhes em drawer sobreposto não comprimem a conversa; teste com janela mais estreita e zoom 125%.
- **1920×1080:** detalhes mostram painel redimensionável; recolher/exibir e restaurar largura; navegação compacta permanece estável.
- Buscar por nome com acento/sem alteração do endpoint. Testar mensagem sem permissão `messages.read` não aparecendo nem na busca.
- Validar atribuição Owner/Supervisor, Agent sem histórico alheio, notas/tags, mídia/reprodução e estado UNKNOWN.
- Não instalar/nem executar Chromium, Playwright ou browser no homelab; esta revisão ainda não comprova fidelidade visual.

## Deploy/rollback somente Chat
Construir imagem de Chat pelo **SHA de merge** numa worktree separada; manter Compose local inalterado, gravar imagem anterior e validar `CHAT_IMAGE_TAG` com `docker compose config --quiet`. Atualizar só serviço `wapphub-chat`, sem dependências/rebuild de Core. Confirmar `127.0.0.1:3001:3000` conforme configuração local antes de subir. Rollback troca somente a tag do Chat para a anterior.

## Etapa seguinte
Fase D: compositor minimalista e adaptativo, com ações secundárias por menu no mobile; manter payload WhatsApp, formatação, emoji, voz e idempotência.
