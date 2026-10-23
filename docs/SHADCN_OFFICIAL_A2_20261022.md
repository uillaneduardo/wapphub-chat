# WappHub Chat — Fase A.2: integração oficial de infraestrutura shadcn/ui e Tailwind CSS v4

**Data:** 22/10/2026  
**Estado:** alterações implementadas em branch e PR, CI e homologação humana seguem como gates até merge/publicação.  
**Referência:** Fase A (PR #40), E.1 (PR #47), projeto visual PR #39 (draft).

## Por que existe
O projeto React 19 + Vite 7 + TypeScript usava componentes locais de apresentação em `src/components/ui`, mas ainda não possuía o sistema Tailwind, aliases, lockfile atualizado ou `components.json` necessários à adoção genuína dos componentes shadcn. A Fase A.2 constrói essa infraestrutura **sem refatorar de uma vez** o CSS legado e os fluxos de atendimento.

## Entrega
- `package.json` + `package-lock.json`: dependências reais `tailwindcss`, `@tailwindcss/vite`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`. O lock foi gerado e verificado com `npm install --package-lock-only` + `npm ci` em runner Linux Node 22 no GitHub Actions, não escrito manualmente.
- `vite.config.ts`: plugin de compilação Tailwind Vite e alias `@/ -> src/` para imports de componentes.
- `tsconfig.app.json` e `tsconfig.json`: mesmo alias para IDE e TypeScript.
- `components.json`: configuração oficial do CLI, tema neutro, icones Lucide e destino **`@/components/ui/shadcn`** para evitar sobrescrever Button/Input locais ainda em uso.
- `src/styles/shadcn.css`: apenas imports `tailwindcss/theme.css` e `tailwindcss/utilities.css`, com CSS variables apontando para os tokens já existentes da Organization (accent dinâmico). **Não há import do Preflight global**, para não zerar entradas/menus/mídias já homologados.
- `src/lib/utils.ts`: `cn()` com clsx e tailwind-merge.
- `src/components/ui/shadcn/button.tsx`: primeira implementação seguindo a composição oficial shadcn (CVA + Radix Slot + Tailwind), mantida separada do Button legado.
- **Piloto real**: ação "Novo contato" usa o Button shadcn, preservando a condição `contacts.write`, o mesmo handler e o texto do botão.
- Testes: semântica e variantes do Button, navegação `asChild`, clique, disabled, CSS sem Preflight e suíte de contatos anterior.

**Importante:** o código do Button é integrado pelo padrão documentado do shadcn (componente local com variantes e Slot). Ele não é uma evidência de que o CLI executou `shadcn add button`, mas o projeto está configurado para instalar futuras peças com `npx shadcn@latest add ...` em `src/components/ui/shadcn`. A infraestrutura e suas dependências são reais.

## Como adicionar futuros componentes
Em ambiente de desenvolvimento com acesso ao registro npm e num branch separado:

```bash
npm ci
npx shadcn@latest add dialog dropdown-menu sheet avatar tabs badge
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

Revisar todo diff gerado pelo CLI; **não permitir substituição automática de componentes legados** fora de um PR planejado. Ajustar import de estilos e dependências de cada componente. Evitar `npx shadcn init` sobre a aplicação porque já há `components.json` e tokens estabelecidos.

## Invariantes
1. Nenhuma API, banco, Provider, Core, mídia ou política RBAC foi alterada. O Core continua autoridade.
2. CSS legado `global.css`, `compact-ui.css`, `shell-compact.css`, `conversation-compact.css`, `admin-compact.css` continua intacto e com precedência fora dos novos componentes.
3. `src/styles/shadcn.css` não declara `@import "tailwindcss"` nem `preflight.css`.
4. O botão Novo contato mantém `contacts.write`, abertura de formulário e estados existentes; restrições de escrita continuam no Core.
5. O `components.json` usa um diretório de instalação separado; migração é progressiva.
6. Não fazer edição de dependências sem atualizar lockfile nem alterar o `compose.yml` do homelab.
7. Lint, typecheck, toda a suíte de testes e build de produção devem passar no GitHub Actions antes do merge.
8. Validar manualmente no notebook a navegação e botão Novo contato, além das telas do Chat em 390, 1366 e 1920px. Testar foco/contraste com accent por Organization e zoom de 125%. Não instalar browser gráfico no homelab.

## Deploy isolado
Publicar **somente** imagem do wapphub-chat a partir do SHA final da main, mantendo `compose.yml` local (inclusive network Cloudflare ingress), estado do Core e Provider. Preservar tag da imagem anterior para rollback. Merge não equivale a deploy nem homologação visual.

## Próxima etapa
E.2: Configurações, Provedores e perfis com componentes shadcn oficiais gradualmente (Sheet/Dialog/Tabs/Badge conforme necessidade), seguindo tokens de organização e as restrições de permissões. F: remoção controlada de CSS duplicado após QA visual.
