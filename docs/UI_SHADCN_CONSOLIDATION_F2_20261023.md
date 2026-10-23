# WappHub Chat — Fase F.2: consolidação visual controlada de CSS

**Data:** 23/10/2026  
**Escopo:** apresentação administrativa, CSS e testes; não há endpoints, migrations, provider nem mudança no fluxo das conversas.

## Entrada
F.1 [PR #52](https://github.com/uillaneduardo/wapphub-chat/pull/52) foi integrada à main com validação automatizada. O usuário solicitou a próxima fase; **a publicação/homologação visual em produção da F.1 ainda não foi confirmada** neste diálogo, portanto não afirmar que o homelab usa aquela revisão.

## Problemas encontrados
1. `global.css` ainda continha o bloco histórico completo de Team/Permissions, embora só estas rotas o utilizem. O CSS administrativo posterior reescrevia geometria e foco, criando dependência de ordem difícil de manter.
2. `admin-compact.css` repetia altura/padding de inputs da busca/cadastro e botões da equipe já substituídos por shadcn em F.1.
3. `settings-compact.css`, `profile.css` e `permissions.css` tinham regras duplicadas de foco e atributos de shadcn. A cascata ainda funcionava, mas a edição futura exigia ajustar várias folhas simultaneamente.
4. Controles longos, identificadores e indicadores poderiam causar estouro horizontal em viewport pequena.

## Alterações
- `src/styles/admin-base.css`: **transfere** 14 linhas compactadas das regras históricas Team/Permissions retiradas de `global.css` para arquivo próprio, com seletor `:where(.admin-compact-page)` de especificidade zero (sem elevar prioridade e sem atingir chat/media). A importação ocorre após `global.css` e antes dos adaptadores compactos. Sem novas dependências.
- `admin-compact.css`: remove apenas declarações substituídas por shadcn para campo de busca, cadastro, paginação e link de membro; mantém layout da lista, avatar, row, grid e estado selecionado.
- `admin-shadcn.css`: centraliza altura dos controles via tokens **36px no desktop / 44px touch**; mantém foco visível e estilos por organização, previne overflow de cards/identificadores e permite rótulos responsivos. Continua restrito a `.admin-compact-page`.
- `settings-compact.css`: preserva o que é particular de Meu perfil (38px, padding e margin) e remove duplicações de estilos de Button/Input e disabled que os primitivos shadcn já aplicam.
- `profile.css`, `permissions.css`, `admin-base.css`: removem blocos redundantes de foco, cobertos por `admin-shadcn.css`.
- Não alterou componentes JSX, handlers, API, RBAC, navegação, sessão, mídia, envio, MediaRecorder nem Provider.

## Invariantes
- O shell compactado B, Inbox C, compositor D/D.1 e áudio UX continuam visual e funcionalmente fora deste PR.
- Não importar Tailwind Preflight; tokens CSS da organização são fonte de cor/acento, e padrões shadcn são aplicados progressivamente.
- Não remover `global.css`: é baseline dos fluxos legados ainda utilizados (incluindo Nova conversa e simulador).
- Seleção de conversa, lista de contatos dentro de Nova conversa, restrições de Agent, guardas de OWNER/SUPERVISOR e confirmação de permissões mantêm comportamento.
- Issue de mídia [Chat #51](https://github.com/uillaneduardo/wapphub-chat/issues/51) e problema de envio de voz [Core #46](https://github.com/uillaneduardo/wapphub-core/issues/46) **permanecem abertos e fora de escopo**.

## Aceite e validação
**CI GitHub Actions:** `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run` e `npm run build`.

- Teste de CSS `src/styles/admin-consolidation.test.ts`: garante importação na ordem correta, sem seletores globais Team/Permissions, tokens de altura, foco e ausência de Preflight.
- Suítes existentes de Contatos, Equipe/Permissões, Perfil, Provedores/WhatsApp Web, Inbox, composer e MediaTransfers devem permanecer verdes.
- **Homologação manual no notebook:** 320×568, 390×844, 768×1024, 1366×768 e 1920×1080: Contatos, Equipe/Permissões, Perfil e Provedores sem rolagem horizontal não intencional; contraste/foco com accent da organização; links e botões responsivos. Conferir chat e mídias por amostragem para provar isolamento.
- CI/jsdom valida estrutura e lógica; **não comprova ausência de sobreposições CSS reais no navegador**. Não rodar Playwright/Chromium no homelab.

## Deploy
Publicar somente `wapphub-chat` após merge, com imagem versionada por SHA e build separado em worktree, preservando a configuração local de Compose e a tag da imagem anterior para rollback. Testar serviço/health pelo Docker Compose. Sem reconstruir Core, Provider, DB, Worker nem reiniciar o Cloudflare Tunnel.

## Próximo passo
Acompanhar checklist de homologação e, após evidência visual, avaliar F.3 somente nas telas com problemas observáveis; evitar apagar em massa o legado de mídia/navegação que continua intencionalmente em produção.
