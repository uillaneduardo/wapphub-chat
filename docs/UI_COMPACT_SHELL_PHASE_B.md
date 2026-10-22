# Fase B — Shell compacto e navegação mobile (22/10/2026)

**Estado:** implementação em branch/PR; homologação visual e publicação no homelab pendentes.  
**Fundação anterior:** PR #40.  
**Direção de UX:** PR #39 (proposta).

## Escopo da Fase B
Este PR introduz uma navegação global mais compacta sem alterar o modelo de atendimento:
- Novas contas iniciam com a **barra lateral de 60px recolhida** no desktop, com possibilidade de expandi-la (220px). As preferências salvas por conta continuam sendo respeitadas; quem escolheu barra expandida não tem sua escolha sobrescrita.
- Em resoluções intermediárias (721–1439px), a área principal usa padding menor e a Inbox emprega coluna mais contida, sem alterar limites operacionais de contexto.
- No mobile (até 720px), somente **Conversas**, **Contatos** e **Mais** ficam na navegação inferior; altura visual de 56px, com respeito a `safe-area-inset-bottom`.
- O rodapé de logout/realtime deixa de disputar espaço na barra inferior. O menu **Mais** oferece itens do catálogo original, organização, identidade, estado realtime, reconexão quando aplicável e logout, com validação por permissions/resources do Core.
- Ao abrir `/app/conversations/:conversationId`, a barra global some no mobile e o Chat ocupa a altura dinâmica disponível. Na Inbox (`/app/conversations`) a barra permanece. O retorno à lista continua pelo botão existente no header da conversa.
- O portal de Mais mantém Escape, devolução de foco, encerramento por clique externo e rolagem própria. Mecanismos de autorização, criação de conversas, estados de mensagem e armazenamento não mudam.
- Os estilos ficam em `src/styles/shell-compact.css` carregado após o legado. Nada de substituir o CSS global de uma vez.

## Limites
- **Não** migra oficialmente para shadcn/ui/Tailwind nesta fase; a Fase A criou primitivos compatíveis sem a instalação de dependências. A.2 deve ser feita separadamente com lockfile íntegro e validação de Preflight.
- Compositor e barra de ações continuam visualmente como estão; redesign é a Fase D.
- Foto do contato, novos filtros e painel de contexto em Sheet são Fase C ou contratos futuros, não incluídos aqui.
- Os breakpoints são intencionais para evitar squeeze em 1366×768. Medidas definitivas dependem da inspeção visual real; não se pode afirmar responsividade homologada por testes de DOM.

## Segurança e comportamento preservados
- O catálogo `visibleNavigation` continua fonte para visibilidade/indisponibilidade, inclusive categorias futuras desabilitadas.
- Menu Mais não altera permissões, não habilita ações desabilitadas nem revela dados de outras organizações.
- Logout usa o mesmo `logout()` do SessionContext; sem duplicar requisições por clique repetido.
- Realtime continua sendo criado somente pelo `AppShell`, com estado e recovery existentes.
- `useUiPreference` continua por conta; `sidebarCollapsed` ausente assume `true`, valor explicitamente salvo como false continua expandido.
- No mobile, logout/organização/status acessíveis em Mais mesmo que o footer desktop não seja renderizado. Na conversa, o usuário retorna pela seta existente no cabeçalho para alcançar a navegação principal.
- A classe de layout é derivada da rota, não de condições do Provider ou permissões; não desmonta a Inbox ou mensagens em mudanças de realtime.

## Gates
`npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`.

Teste de regressão cobre:
1. As rotas Inbox e conversa recebem classes corretas.
2. O menu mobile abre conta, troca de organização, realtime/reconexão e logout.
3. Preferências colapsadas persistidas; novos usuários iniciam em modo compacto.
4. Rotas e permissions do catálogo, links inativos, navegação por teclado/escape.
5. Suite preexistente de conversas, mídia, envio, retry, websocket e autorização.

## Homologação manual — notebook, após deploy autorizado
- **320×568 e 390×844:** Inbox mostra só três destinos sem arrastar horizontalmente; quando uma conversa abre, a barra desaparece e o compositor fica acessível; voltar à Inbox restaura a barra.
- **Mobile com teclado aberto e safe-area:** histórico ainda rola; nenhum botão ou última mensagem fica sob o teclado/barra; menu Mais cabe no viewport e rola quando necessário.
- **768×1024, 1024×768, 1366×768 e 1920×1080:** sidebar compacta de 60px, opção expandir/recolher, histórico/inbox sem scroll horizontal da página, panel de contexto e seletor preservados.
- **Conta:** em Mais, trocar organização e sair continuam funcionais; status realtime e retry aparecem com comportamento correto.
- **Regressões:** reprodução de imagem, áudio, vídeo e voz; envio, emoji, formatação, rascunhos, atribuição Agent e indicadores de status.
- Usar notebook para homologar. **Não** executar Playwright ou navegador gráfico no homelab.

## Publicação
Apenas Chat; documentar imagem anterior. Build com SHA final do merge em worktree isolado e nova tag. Respeitar o `compose.yml` local e `127.0.0.1:3001:3000`; subir `wapphub-chat` com `--no-deps --no-build --pull never` depois de confirmar `docker compose config --quiet`. Não mexer em Core, Worker, Redis, MariaDB, Provider ou sessão WhatsApp.
Rollback: restaurar a imagem anterior do Chat sem migrações.

**Evidência de publicação real:** ainda não existe nesta entrega; merge não significa deploy.
