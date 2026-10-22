# Proposta de modernização do compositor de mensagens — WappHub

**Data:** 2026-10-22  
**Estado:** PROPOSTA PARA REVISÃO — documentação apenas; nenhum código funcional ou deploy incluído.  
**Issue:** https://github.com/uillaneduardo/wapphub-chat/issues/33  
**Ambiente-alvo:** Ubuntu Server na VM Proxmox, Cloudflare Tunnel no host via localhost, Chat em `127.0.0.1:3001`, Core em `127.0.0.1:3000`.

## Contexto e diagnóstico reproduzível por inspeção

No `main` atual:

- `src/features/conversations/Conversations.tsx` mantém `draft` local e renderiza `<textarea>` com limite 8.000, `sendDraft/submitMessage`, envio otimista/idempotente por `clientMessageId`, MediaComposer, ComposerTools e SendPreference.
- `src/features/conversations/ComposerTools.tsx` renderiza botões de **Negrito, Itálico, Emojis e outros recursos indisponíveis** explicitamente desabilitados. São placeholders, não integração quebrada.
- `src/features/conversations/MediaComposer.tsx` permite anexos e voz, condicionado a `conversation.mediaEnabled`. Não duplicar recursos na nova toolbar.
- `src/hooks/useComposerShortcut.ts` guarda por usuário a preferência Enter para enviar ou Shift+Enter para enviar e protege IME/composição. Manter a semântica atual.
- `src/components/FormattedMessage.tsx` já interpreta a sintaxe textual do WhatsApp (asteriscos para negrito, sublinhados para itálico, tils para tachado e três crases para bloco monoespaçado); React escapa o texto. Não introduzir HTML não confiável no domínio/API.
- `src/styles/global.css` declara `.message-composer` horizontal e `.composer-footer`; as dimensões e o seletor de atalho podem competir por largura com a coluna de contexto, especialmente em telas estreitas.
- `src/features/conversations/MessageMedia.tsx` descarta `source` no unmount, revoga Blob URL e reexibe `Abrir mídia` depois de remount/troca/F5. É o comportamento atual de segurança, não perda comprovada do arquivo no Provider.
- `src/features/conversations/Conversations.tsx` reconcilia REST/realtime e pode limpar/projetar a lista no fluxo antigo. Não atribuir hard reload do documento ao frontend sem evidência no navegador.

### Entregas de estabilidade integradas à main em 22/10/2026 (homologação real pendente)

- Core PR #41: voz WebM/diagnóstico. https://github.com/uillaneduardo/wapphub-core/pull/41
- Core PR #42: consulta pontual de mensagens e escopo de leitura estável. https://github.com/uillaneduardo/wapphub-core/pull/42
- Chat PR #30: revalidação de sessão, histórico estável e realtime; integrada à main. https://github.com/uillaneduardo/wapphub-chat/pull/30
- Chat PR #31: voz e retry idempotente; integrada à main. https://github.com/uillaneduardo/wapphub-chat/pull/31
- Chat PR #32: autoload de mídias visíveis, cache por referência e lightbox; integrada à main. https://github.com/uillaneduardo/wapphub-chat/pull/32

As cinco PRs funcionais foram integradas preservando ancestry/ordem com merge commits: Core #41/#42 e Chat #30/#31/#32. A CI no GitHub passou; falta homologação prática no notebook e deploy no homelab. Não se deve confundir merge com publicação na VM.

## Resultado visual esperado

Um **compositor único e compacto**, no rodapé da coluna de mensagens (não sobreposto à área de contexto), com três áreas:

1. **Área de texto:** largura fluida, altura inicial de 1–2 linhas, cresce até limite visual (por exemplo 5–6 linhas) e depois rola internamente; placeholder `Escreva uma mensagem…`; foco e teclado previsíveis.
2. **Ferramentas à esquerda:** Negrito, Itálico, Tachado, Monoespaçado, Emojis, Anexar e Gravar voz. Ícones uniformes Lucide, `aria-label`, tooltip, estado ativo e divisores discretos; ocultar itens realmente proibidos, não deixar placeholders mortos.
3. **Envio à direita:** botão de enviar primário com ícone ou texto conforme espaço, estado carregando, explicação de resultado incerto, e preferência Enter/Shift+Enter em menu compacto acessível. Apresentar contador somente próximo ao limite de 8.000 caracteres.

Anexo ou voz em preparação mostra uma faixa de prévia entre texto e ferramentas; mensagens falhadas apresentam ação contextual sem reenvio automático após resultado UNKNOWN. O layout respeita a paleta branca/cinza/verde já definida nos tokens, modo Full HD e larguras menores de conversas/contexto.

### Formatação de texto

Manter `textarea` com seleção/caret nativos: o editor é de **texto WhatsApp com controles**, não WYSIWYG HTML.

- Clique em Negrito/Itálico/Tachado/Monoespaçado insere os marcadores WhatsApp ao redor de `selectionStart..selectionEnd`. Com seleção vazia, cria os delimitadores e posiciona o caret dentro.
- Incluir atalhos Ctrl/Cmd+B e Ctrl/Cmd+I quando o campo tem foco, preservando IME, undo/redo e `selectionDirection`; limites de tamanho incluem marcadores.
- Refazer operação inversa apenas quando a seleção já estiver delimitada validamente; não alterar conteúdo de outras mensagens.
- Opcional `Prévia` pequena e segura, renderizada com `FormattedMessage` a partir do mesmo rascunho, sem alterar a string enviada. Sem ``contenteditable``, HTML bruto ou novo formato na API.
- Quebras de linha, Unicode, emoji, combinação de caracteres e texto já formatado devem permanecer sem perda.

### Emojis

- Emoji picker embutido, sob demanda, lazy-loaded, sem CDN nem requisições externas.
- Categorias, busca por nome em português quando disponível, recentes em memória, atalhos de teclado, Escape e retorno de foco.
- Inserção no caret atual sem perder seleção; contador deve considerar a mesma regra do backend; sem duplicar envio por Enter enquanto picker está aberto.
- Dados de emoji e dependência escolhida após revisão de tamanho, manutenção e acessibilidade; evitar dependência pesada no bundle inicial.

### Rascunhos e confiabilidade

- Preservar o rascunho por `organizationId:userId:conversationId` ao trocar entre conversas na mesma instância da aplicação, com armazenamento apenas em memória, limitado e limpo ao logout/mudança de organização/permissão. Não guardar conteúdo, anexos, mediaKey ou Blob em localStorage/IndexedDB por padrão.
- Não apagar rascunho prematuramente ao enviar: na falha pré-intenção, permitir restauração; após pedido enviado e resultado incerto, manter o clientMessageId/status em vez de repetir o envio automaticamente.
- Adotar a fila e correções dos PRs #30/#31/#32 antes de refatorar a renderização; evitar disparar requests adicionais a cada digitação/resize.

## Arquivos sugeridos (Chat)

- `src/features/conversations/MessageComposer.tsx` **novo**: interface de propriedades `draft/onDraftChange`, `send`, `disabled`, `sending`, `attachment/onAttachmentChange`, `mediaEnabled`, `shortcut` e callback. Responsabilidade exclusiva da UI.
- `src/features/conversations/ComposerTools.tsx`: substituir placeholders por toolbar acionável, com capacidade de ferramenta e controle de foco; sem duplicar anexos/voz.
- `src/features/conversations/EmojiPicker.tsx` **novo**: popover acessível e dados carregados somente quando aberto.
- `src/features/conversations/useComposerFormatting.ts` **novo**: manipulação segura da seleção com marcadores.
- `src/features/conversations/Conversations.tsx`: extrair JSX do form, manter orquestração `submitMessage` e RBAC, simplificar estado; garantir desmontagem apenas quando escopo realmente mudou.
- `src/components/FormattedMessage.tsx`: reutilizar no preview, sem expandir para HTML.
- `src/features/conversations/MediaComposer.tsx`: preservar fluxo atual/anexos/gravação, adaptar toolbar/preview.
- `src/styles/global.css` ou CSS de componente novo: grid responsivo com `min-width: 0`, restrições de altura, popover não cortado, testes a 1366x768, 1920x1080 e 390px.
- Testes próximos aos componentes: formatação, emoji, acessibilidade, rascunho, shortcut/IME, status de envio e regressões de mídia/realtime.

Nenhuma alteração de backend, migration, protocolo do provider ou Cloudflare é necessária para habilitar formatação textual/emojis. Validação deve comprovar que o Core preserva a string exatamente como fornecida.

## Estratégia de implementação e gates

**G0 — Baseline da VM:** verificar `git status`, SHAs main/local, imagem em execução, Chat/Core/Provider healthy, media e realtime, porta 3001, volume e secrets. Capturar diagnóstico sem conteúdo privado. Não presumir runtime = GitHub.

**G1 — Dependências de estabilidade (merge concluído, deploy pendente):** Core #41 → #42 e Chat #30 → #31 → #32 estão na main. Validar branches atuais, smoke isolado e deploy reversível apenas com aprovação; homologar no notebook navegar, atualizar status e abrir mídias. Se persistir recarga física, instrumentar `document.start`/`navigationType` do #30 e comparar com React remount; não esconder bug com cache persistente.

**G2 — Compositor:** branch a partir da main já atualizada; toolbar, formatação, emojis, layout, rascunhos, testes e docs. PR separado. Não misturar grupos/histórico/novos endpoints.

**G3 — Regressão e aceite:** testes Unit/RTL, typecheck, lint, build e CI; testes negativos RBAC, IME/PT-BR, Enter/Shift+Enter, caractere 8000, texto multlinha, emoji/caret, mídia/cancel/retry/UNKNOWN, troca de organização, responsividade, scroll/ResizeObserver, sem scroll-jumps.

**G4 — Deploy controlado na VM Proxmox (somente com aprovação):**
1. Backup verificável de checkout, configuração local de portas, commit e tag/imagem Chat anterior; conferir que `compose.yml` está **modificado localmente** para `127.0.0.1:3001:3000` e preservar esse patch/override antes de atualizar o Git. Não sobrescrever a modificação do homelab durante `git pull`.
2. Garantir branch final aprovada e testes. Build apenas do Chat na imagem/tag imutável baseada no SHA (Compose atual `image: wapphub-chat:${CHAT_IMAGE_TAG:-899c5db}`); conferir `VITE_API_BASE_URL=https://api.wapphub.com.br` e `docker compose config` após aplicar mapeamento local.
3. Subir **apenas** `wapphub-chat` com `docker compose up -d --no-deps --no-build --wait wapphub-chat` na mesma configuração de Compose usada no build. Preservar a porta host 3001 e o tunnel instalado no Ubuntu. Não reiniciar Worker, Core, MariaDB, Redis nem Baileys por mudança puramente frontend.
4. Smoke local `curl -I http://127.0.0.1:3001/login` e público `https://chat.wapphub.com.br/login`; validar login, enviar teste manual autorizado, textarea/emoji/anexo, mídia após alternar conversas, monitorar memória/network e evento de reconciliação.
5. **Rollback:** voltar à tag/imagem anterior do Chat com os mesmos arquivos Compose e porta, sem mexer em DB/Vault/sessões; reconstruir Chat na revisão antiga apenas se imagem anterior não existir. Deixar registrado SHAs, evidências e motivo.

## Critérios de não regressão

- Core só envia mensagem mediante gesto de operador; a UI nunca envia texto/áudio/mídia automaticamente.
- Eventos realtime válidos atualizam mensagens sem tirar foco do editor, perder rascunho, trocar scroll indevidamente ou remontar players.
- Mídia acessível e visível não volta a botão manual por reconciliação React; PR #32 reconstrói fontes visíveis após refresh sem manter bytes privados em storage persistente. Não afirmar que F5 preserva os bytes.
- Source/URL de mídia e conteúdo de mensagem não entram em logs diagnósticos. Ao trocar organização/retirar permissão, revogar acessos e dados efêmeros.
- Menu de emoji e toolbar acessíveis com teclado/tela sensível, sem trap permanente de foco.
- Não alterar política de grupos nem disparar recuperação de histórico sob demanda; prioridades futuras registradas em Core issues #43 e #44.

## Homologação e estado

**COMPOSITOR NÃO IMPLEMENTADO / DEPLOY NÃO REALIZADO.** Somente as correções dependentes foram integradas à main. Este documento guia Codex no homelab e um futuro PR funcional separado. Critério HOMOLOGADO depende de confirmação visual do usuário no notebook.