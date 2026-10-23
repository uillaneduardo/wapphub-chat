# Ajuste visual pontual — botão de contato e seletor de canal

Data: 23/10/2026. Alteração restrita ao Chat (frontend) e ao design system. Base: F.2 (PR #53).

## Problemas evidenciados

Duas capturas fornecidas pelo usuário:

1. **Contatos > Detalhes**: a ação `Nova conversa interna` renderiza apenas um retângulo verde, com texto imperceptível.
2. **Conversas > Nova conversa**: o campo `Canal` apresenta um select nativo colado ao rótulo, sem alinhamento, espaçamento, altura e foco consistentes com os campos shadcn.

### Causa da ação sem contraste

O componente `Button asChild` usa o `Slot` Radix para renderizar um `<Link>` como raiz. A classe Tailwind `text-primary-foreground` é declarada dentro de uma camada CSS, mas `global.css` possui a regra **não-camada** `a { color: var(--accent) }`. Essa regra prevalece sobre o utilitário de cor de texto, fazendo o link ficar da mesma cor do fundo.

O ajuste é deliberadamente feito **na regra do design system**, não numa cor fixa no link individual, para evitar reaparição em outras ações `Button asChild`.

## Solução implementada

- `src/styles/shadcn.css`: regras não-camada para o estado padrão `data-variant="default"`, com fundo `var(--accent)` e texto `var(--accent-contrast)`; hover usa `var(--accent-hover)`. Variante outline/ghost/secondary/link/destructive também declara foreground semântico para não herdar indevidamente o verde de `a`. Funciona com o tema/contraste da organização.
- `src/components/ui/shadcn/native-select.tsx`: componente reutilizável com select HTML nativo, wrapper, ChevronDown Lucide, classes shadcn e densidade compacta. Continua acessível com teclado e leitor de tela; preserva `option disabled`, `value`, `onChange`, `id` e os bloqueios existentes.
- `NewConversation.tsx`: campo `Canal da conversa` com label vinculado ao input e select shadcn com as mesmas opções: Interno e canais habilitados. Canais não habilitados seguem visualmente identificados e `disabled`; não há mudança de `createExternalConversation`, `createConversation`, `recipientMode` nem `reconcile`.
- `src/styles/new-conversation-compact.css`: CSS isolado por `.new-conversation-compact` para altura, largura, alinhamento, ícone da seta, foco, agrupamento de campos, espaçamento da busca e responsividade. Campos desktop ~38px; mobile com controles de pelo menos 44px. A nova folha é carregada depois do CSS legado.
- Não instala dependências ou altera Core, Provider, banco, autenticação ou mídia.

## Testes e critérios de aceite

Gates: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`. O CI não comprova a renderização do CSS em navegador real.

- [ ] No detalhe do contato: texto **Nova conversa interna** visível, com contraste elevado no botão verde; hover, teclado e navegação mantidos. `conversations.create` e `conversations.read` continuam protegendo a ação.
- [ ] No formulário Nova conversa: rótulo aparece **acima** do select, espaçamento e borda iguais aos campos da plataforma; seta à direita, foco indicado e opção atual aparente.
- [ ] Alternar Interno → WhatsApp → Interno atualiza a descrição e mantém destinatário/ações corretos; a mudança **não envia mensagem** nem cria conversa automaticamente.
- [ ] Canal indisponível continua desabilitado; usuários sem criação de conversa não acessam as funções.
- [ ] Desktop 1366×768 e 1920×1080: campo alinhado, sem sobreposição; mobile 390×844 e 320×568: largura responsiva sem overflow horizontal e campo com alvo de toque >=44px.
- [ ] Conversas, mídias, Inbox, filtros e composer permanecem intactos.
- [ ] Confirmar que o Button verde possui texto visível também com personalização da cor da organização.

Testes automatizados: `native-select.test.tsx`, `channel-controls.test.tsx`, extensão de `NewConversation.test.tsx` e suites pré-existentes.

## Deploy / rollback

Após merge e CI, publicar **somente** serviço `wapphub-chat` com imagem versionada pelo SHA do merge via worktree separada, preservando tag anterior e Compose local. Sem reiniciar o Core, Worker, Provider ou banco. Não instalar browser gráfico no homelab. Homologação visual feita no notebook.

## Pendência fora de escopo

A issue de mídias/anexos [wapphub-chat#51](https://github.com/uillaneduardo/wapphub-chat/issues/51) permanece separada; não corrigir nesta revisão.
