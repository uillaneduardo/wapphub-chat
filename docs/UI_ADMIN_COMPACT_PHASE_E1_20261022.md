# WappHub Chat — Fase E.1: padronização compacta de Contatos e Equipe

Data: 22/10/2026. **Status:** implementação visual em PR; homologação manual pendente.

## Ponto de partida
Fases A (fundação local), B (navegação, homologada pelo usuário em 10/10 critérios), C (Inbox, detalhes), D/D.1 (compositor compacto mobile/desktop) e UX de áudio estão integradas à main. PR #45 também introduziu Meu perfil. A proposta geral de redesign está no [PR #39](https://github.com/uillaneduardo/wapphub-chat/pull/39), ainda em draft.

## Direção de design
- Fundo branco/cinza, poucos contornos, accent dinâmico por Organization, Lucide como biblioteca única de ícones.
- Textos operacionais de 12–14px, títulos 17–19px, linha de lista densa (60–70px); alvos touch com pelo menos 44px em mobile.
- Componentes reutilizáveis em `src/components/ui`: `PageHeader` e `StatusPill`, baseados nos tokens do repositório e convenções de composição `data-slot`.
- Nenhuma nova navegação, permissão, endpoint, forma de envio, modelo ou carga de dados.

## Entrega E.1
- **Contatos:** cabeçalho compacto reutilizável, ação Novo contato no mesmo plano, busca e lista mais densas, avatar por iniciais com fallback local e chevron de navegação. Formulários/edição mantêm a mesma validação e chamadas ao Core.
- **Equipe:** cabeçalho compactado, linha de pessoa com avatar/nome/e-mail, badges discretos de função e estado e link de Gerenciar permissões exclusivamente quando o permission set atual permitir.
- **Permissões:** mesma UI e semântica de busca, colapsáveis e confirmação, com apenas ajustes de densidade no CSS sob namespace admin.
- CSS novo `src/styles/admin-compact.css` importado depois das fases anteriores, isolado por `.admin-compact-page` para não afetar conversa, mídia, login ou composição.

## Shadcn oficial — pendência preservada (A.2)
**Os componentes acima ainda são internos, não os componentes oficiais shadcn/ui.** O Chat atual não possui `tailwindcss`, `@tailwindcss/vite`, configuração de `components.json` ou dependências oficiais. A etapa A.2 permanece obrigatória para adotar o projeto shadcn. Ela só deve ocorrer em ambiente que permita instalar dependências e atualizar o `package-lock.json` verificável com `npm install`/`npm ci`.

O risco de importar `@import "tailwindcss"` integralmente é o Preflight global reinicializar estilos e controles já homologados. Seguir a documentação oficial [Tailwind desabilitar Preflight](https://tailwindcss.com/docs/preflight#disabling-preflight), configurar alias e converter componentes gradualmente, sem substituir as regras globais num único PR.

## Critérios de aceite
- Renderizar 320/390px, 768px, 1024/1366px e 1920px; sem scroll horizontal de página ou sobreposição.
- Contatos: buscar por nome/identificador, paginação, abrir detalhe, criar/editar, campo readOnly vinculado, erros de API, escopo tenant e isolamento de consultas realtime.
- Equipe: lista, função/status, paginação, links de permissão disponíveis apenas para usuários autorizados; restrições Agent, versão e bloqueio de mudanças não são alterados.
- Permissões: busca, expandir/recolher grupos, conceder/revogar, salvar/resetar, confirmações e bloqueio de navegação com mudanças pendentes continuam funcionando.
- Compatibilidade de áudio/mensagens/realtime intacta; não resolver issue de envio de voz do Core neste PR.
- `npm ci`, ESLint, TypeScript, Vitest e build aprovados em CI. Não instalar browser gráfico no homelab.
- Homologação visual real feita manualmente no notebook; CI não valida aparência com screenshot.

## Próximas fases
1. **A.2 (shadcn oficial isolado):** Tailwind v4 sem Preflight global, `components.json`, aliases, dependências e lockfile íntegros; converter primitivos aos poucos.
2. **E.2:** Configurações/Provedores e demais rotas administrativas com os mesmos tokens e componentes.
3. **F:** reduzir CSS redundante e homologar visualmente os fluxos do Chat, Desktop 1366px/Full HD, Mobile, zoom 125–200%.
4. Não presumir deploy da E.1 até o usuário publicar a imagem do Chat e homologar.
