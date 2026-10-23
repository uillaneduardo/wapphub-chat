# WappHub Chat — Fase F.3: UX compacta, notificações e feedback

Data: 23/10/2026. PR exclusivo do frontend, sobre F.2 e PR #55 não lidas/som.

## Objetivo

Concluir o refinamento incremental do design shadcn/ui nas rotas de atendimento e perfil, sem afetar contratos nem transporte de mensagens. O Core mantém a verdade de `hasUnread`, permissões, atribuições e estado da leitura; o frontend exibe os eventos sem reimplementar regras de acesso.

## Implementação

### Preferência de notificação compartilhada

- Reaproveita `notificationSound.ts` e `localStorage` já introduzidos pelo PR #55; **não migra nem renomeia a chave** `wapphub:message-sound:v1:<user>:<organization>`.
- Novo `useNotificationSound`: `useSyncExternalStore` integra o estado reativo da Inbox com a seção *Meu perfil → Notificações*. Propaga mudanças via evento no mesmo documento e `storage` entre abas; mantém separação por usuário e organização.
- Meu perfil: cartão compacto com descrição, badge de estado, botão liga/desliga e **Testar som**. `unlockNotificationAudio` utiliza gesto explícito; falhas recebem mensagem acessível sem quebrar o chat.
- A preferência é **local ao navegador**, não sincroniza em nuvem; o estado de leitura continua sincronizado no Core. Não cria permissão do sistema, push, nova API nem armazenamento de mídia.

### Estados consistentes na Inbox

- Skeleton shadcn reutilizável: quatro linhas representativas com nomes/avatares/preview em carregamento, `role=status` e texto sr-only. Animação desativada em `prefers-reduced-motion`.
- Erro de carregamento inicial: ícone, descrição e botão shadcn para tentar novamente. Tabs e busca permanecem disponíveis.
- Vazio e sem resultado: ícones Lucide discretos, texto útil e opção **Limpar busca** quando aplicável. Busca permanece **restrita às conversas autorizadas já carregadas**.
- Erro na paginação: mantém os itens existentes e o cursor da próxima página, exibe feedback discreto e oferece tentar carregar mais; não substitui toda a Inbox por erro.
- Botões são `Button` shadcn em densidade compacta, com `focus-visible` por cor da organização e área de toque **44px no mobile**.
- CSS novo `src/styles/f3-feedback.css` é escopado por `.chat-app-shell` e `.admin-compact-page.profile-page`, carregado depois dos ajustes anteriores. Não toca em mídia, QR, composer, Player nem no Provider.

## Segurança e compatibilidade

- Sem mudanças em endpoints, Core, Provider, migração, Worker, WebSocket, eventos ou permissões.
- Sem alteração nos filtros por escopo do AGENT, no status real de leitura nem em som para mensagens próprias/históricas. O listener global continua em `AppShell`; não adiciona outro listener de notificação.
- `storage` para preferências cosméticas não armazena tokens, mensagens, contatos nem qualquer informação da organização além do ID que já compõe a chave.
- Não marcar uma conversa como lida somente por tocar som, abrir perfil ou carregar a Inbox.
- Issue [Chat #51](https://github.com/uillaneduardo/wapphub-chat/issues/51) de anexos e captura da câmera permanece separada.

## Testes

Gates CI: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`.

Cobertura nova: (1) sincronização de preferências entre rotas/abas/orgs; (2) seção de notificações em Perfil sem chamadas de salvamento ao Core; (3) aviso para browser com áudio bloqueado; (4) skeletons não interativos; (5) erro de lista recuperável; (6) falha de paginação que preserva dados e cursor. Suítes de permissões, realtime, mídia, perfis, provider e autores permanecem obrigatórias.

Homologação visual **manual no notebook** após deploy: 320×568, 390×844, 768×1024, 1366×768, 1920×1080; skeleton sem salto de colunas, nomes/labels sem overflow, Inbox com scroll somente vertical, botões com foco visível; verificar Bell na Inbox e Meu perfil sincronizados; áudio permitido e bloqueado; agentes não recebem novas permissões. CI de jsdom não comprova CSS renderizado.

## Deploy

Publicar somente `wapphub-chat` com imagem por SHA e Compose local existente. Não mexer em Core/Worker/Provider/banco/Cloudflare Tunnel nem executar browser gráfico no homelab. Identificar revisão anterior por tag antes de publicar. Homologação final cabe ao usuário.

## Resultado esperado

Experiência consistente e passível de ação no fluxo de atendimento, com preferências de som centralizadas. Depois desta fase, priorizar implementação da issue #51 de anexos, vídeos, arquivos e câmera mobile em PR(s) separados, apenas com diagnóstico de integração Core/Provider quando necessário.
