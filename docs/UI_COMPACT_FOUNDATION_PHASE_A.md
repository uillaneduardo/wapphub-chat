# Fase A — base de componentes compactos para o redesign do WappHub Chat

**Data:** 22/10/2026  
**Status:** IMPLEMENTADO NO CÓDIGO, HOMOLOGAÇÃO NO NAVEGADOR PENDENTE  
**Proposta:** [PR #39](https://github.com/uillaneduardo/wapphub-chat/pull/39) — `UX_COMPACT_SHADCN_REDESIGN_PROPOSAL_20261022.md`

## O que foi feito

A fase A é deliberadamente **aditiva e compatível** com o Chat em produção. Não redesenha navegação, inbox, compositor nem atualiza serviços. Baseou-se no vocabulário de composição do shadcn/ui: componentes pequenos, variantes, `data-slot` e tokens sem cores fixas por cliente.

Arquivos introduzidos:
- `src/components/ui/button.tsx`: botão nativo; variantes default/outline/ghost/destructive e dimensões compact/default/touch/icon; `type=button` seguro por padrão.
- `src/components/ui/input.tsx`, `textarea.tsx`, `separator.tsx`: atributos HTML preservados, densidade e semântica.
- `src/components/ui/avatar.tsx`: `Avatar`, `AvatarFallback`, `AvatarImage` e `ContactAvatar`. Usa iniciais sem necessidade de foto. `AvatarImage` está disponível somente para quando houver fonte **tenant-scoped e autorizada** aprovada pelo Core.
- `src/components/ui/tooltip.tsx`: tooltip de transição acessível a foco/hover, com associação `aria-describedby` ao botão real; o futuro tooltip oficial do shadcn/Radix será adotado após validação da infraestrutura.
- `src/styles/compact-ui.css`: escala de tamanho, foco visível, cores via `--accent`/tokens existentes e alvo de toque mobile. Carregada após `global.css` e isolada pelo prefixo `.ui-`, sem reset global.
- `src/components/ui/ui.test.tsx`: testes de atributos nativos, fallback, semântica e foco.

Integração piloto não disruptiva: `ContactAvatar` substitui apenas o `span` de iniciais nos itens da Inbox e no cabeçalho da conversa; preserva `contact-avatar` e `large` para regras legadas. **Nenhuma URL de foto real foi adicionada.**

## Estado shadcn/ui — distinção importante

**Esta fase ainda NÃO instala oficialmente shadcn/ui, Tailwind CSS, Radix, `class-variance-authority` ou o CLI.** Os componentes de UI acima são implementações próprias **compatíveis em vocabulário/estrutura com a migração futura**, não cópias ou alegações de componentes oficiais do shadcn. Isso é intencional: o Chat não possui Tailwind, o CSS global existente tem múltiplas sobreposições e a introdução de Preflight/lockfile poderia quebrar telas produtivas sem homologação visual.

A etapa técnica **A.2 (dependências oficiais)** instalará `tailwindcss`, `@tailwindcss/vite`, gerará `package-lock.json` com `npm install`, adicionará aliases TypeScript/Vite e `components.json`, e converterá componentes um a um usando a documentação atual do projeto [shadcn Vite](https://ui.shadcn.com/docs/installation/vite), **sem ativar reset global sem teste**. Preferir import isolado de `tailwindcss/theme` e `tailwindcss/utilities` até validar efeitos do Preflight. Com os primeiros componentes oficiais estáveis, remover substitutos sem duplicar internals.

O escopo de A.2 precisa de ambiente npm com acesso ao registro para gerar um lockfile verificável e CI `npm ci`; não inserir dependências novas no `package.json` sem atualizar o lockfile. **A fase A atual não altera dependências.**

## Validação obrigatória
- GitHub Actions: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build` antes de merge.
- Não executar Playwright, Chromium, Firefox nem bibliotecas gráficas no homelab.
- Validar manualmente no notebook: Inbox com filtro/rolagem, avatar/identidade, cabeçalho e conversa; navegabilidade 390px, 1366px, 1920px. Verificar que mídia, envio/retry/UNKNOWN, RBAC e realtime continuam funcionais.
- `docs/STATUS.md` só será atualizado após homologação humana.

## Política de deploy/rollback
Deploy **somente Chat** quando explicitamente autorizado. Antes de subir, registrar a tag existente, status da VM e o `compose.yml` modificado localmente. Construir imagem imutável a partir do SHA após merge em worktree separado e manter mapping `127.0.0.1:3001:3000` do homelab. Publicar `wapphub-chat` com `--no-deps --no-build --pull never`; não atualizar Core, Worker, DB, Redis nem provider por esta entrega. Rollback volta à imagem anterior do Chat com o mesmo Compose.

## Próximas etapas
1. **A.2:** dependências/geração oficial de componentes shadcn em branch isolada e lockfile verificável.
2. **B:** shell compacto, navegação mobile com três destinos e ocultação do rodapé ao abrir uma conversa, seguindo PR #39.
3. **C:** Inbox/layout de atendimento responsivo e detalhes em Sheet.
4. **D:** compositor em uma linha no mobile com ferramentas contextuais.

A separação permite rollback de cada estágio sem reescrever o Chat inteiro nem comprometer suas APIs.
