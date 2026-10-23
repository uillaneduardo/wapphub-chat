# Fase F.1 — Consolidação shadcn/ui de Contatos e Equipe

**Data:** 23/10/2026  
**Status:** em PR; CI e homologação visual no notebook são gates distintos.

## Escopo

Esta etapa continua a modernização do WappHub após:
- Navegação/Inbox/compositor compactos (Fases B–D);
- Contatos/Equipe básicos (E.1);
- Tailwind v4, CSS sem Preflight e estrutura `src/components/ui/shadcn` (A.2);
- Meu perfil e Provedores (E.2).

### Alterações implementadas
1. **Contatos:** migração incremental dos campos de cadastro/edição e pesquisa para `Input` shadcn; botões de ação, pesquisa, paginação e cancelamento para `Button` shadcn; ação de conversa em `Button asChild`, preservando o link React Router.
2. **Equipe:** substituição de `StatusPill` no diretório por `Badge` shadcn para função/estado; link de Gerenciar permissões como `Button asChild`, preservando `team.permissions.manage`. Paginação usa Button shadcn.
3. **Editor de permissões:** cabeçalho compacto reutilizável, busca com Input shadcn, botões de barra e de salvar/descartar/restaurar com Button shadcn. **Comboboxes, grupos, controles de teclado, confirmação, versionamento, proteção contra saída e chamadas ao Core ficam intactos.**
4. **Unificação de CSS administrativo:** `src/styles/admin-shadcn.css` consolida tamanho, foco, variante positiva, responsividade e regiões de formulário. Foram removidas regras de foco duplicadas de `admin-compact.css` e `settings-compact.css`. Regras globais de mídia/chat não são tocadas.
5. `Badge` expõe `data-variant` para distinguir estados visualmente sem inferir permissões. O rótulo do status continua derivado do Core.

## Critérios de segurança e compatibilidade
- Não alterar endpoints, Provider, Core, autenticação, RBAC, eventos realtime, idempotência, uploads ou banco.
- Não importar Tailwind Preflight global; base clara/cinza, Lucide, cor `--accent` por organização; manter preferência visual já definida.
- Inputs continuam com `id`, label nativo, `required`, `maxLength`, `readOnly` e estados `disabled`.
- Botões funcionais possuem `type` explícito; `asChild` continua como link navegável; nenhum link é criado para usuários sem permissão.
- Permissões do Agent continuam definidas pelo Core. Este PR não transforma UI em autorização.
- Issue de mídia [wapphub-chat#51](https://github.com/uillaneduardo/wapphub-chat/issues/51) e falha de envio de voz [wapphub-core#46](https://github.com/uillaneduardo/wapphub-core/issues/46) permanecem **fora de escopo**.

## Gates automatizados
`npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`.
Novos testes: formulários de contato, controles shadcn da busca, papéis/status da Equipe, restrição de acesso às permissões e editor sem submissão involuntária. Suítes existentes de chat, áudio, OAuth/Provider, sessão e permissões continuam mandatórias.

## Homologação visual no notebook depois de deploy
- 390×844 e 320×568: Contatos e Equipe sem overflow; ações com pelo menos 44px; busca e confirmação no editor responsivos.
- 768×1024, 1366×768 e 1920×1080: densidade equilibrada, cabeçalhos pequenos, avatares e badges legíveis, barra de ferramentas sem sobreposição.
- Em Contatos, criar/editar, cancelar, buscas e paginação. Em Equipe, Owner gerencia permissões, Agent não acessa ações não permitidas; testes de alterações pendentes e confirmação.
- Meu perfil/Provedores devem continuar iguais à E.2; inbox, compositor, players de áudio, imagens e vídeos sem alterações.
- Validar foco via teclado e contraste da cor de organização; o CI não homologa fidelidade visual.
- Não usar Playwright/Chromium ou bibliotecas gráficas no homelab.

## Deploy
Construir somente a imagem do `wapphub-chat` a partir do SHA final do merge em worktree, preservando o `compose.yml` local e a imagem anterior. Validar `CHAT_IMAGE_TAG` antes do `docker compose up -d --no-deps --no-build --pull never`. Não publicar Core, Worker, DB ou Provider.

## Próxima entrega sugerida (F.2)
Inspecionar visualmente telas administrativas restantes, racionalizar CSS legado por arquivo e componente com screenshots reais, reduzindo a cascata sem provocar alterações amplas na Inbox e em mídia. Depois, encerrar o PR #39 de planejamento quando o roteiro for consolidado no Design System e homologado.
