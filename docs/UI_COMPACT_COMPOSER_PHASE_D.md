# Fase D — Compositor minimalista e responsivo

**Data:** 22/10/2026  
**Status:** implementado em PR; testes e homologação visual pendentes até confirmação.  
**Base:** Fases A–C (`wapphub-chat`); proposta compacta registrada anteriormente na revisão UX.

## Contexto
O usuário confirmou a **homologação 10/10 da Fase B**. A Fase C foi mergeada, porém o usuário informou que ainda **não havia aplicado as alterações visuais** no celular; assim, **não inferir homologação da Fase C nem da Fase D a partir das capturas anteriores**.

Em 22/10/2026 foi relatado que a gravação de voz aparece no Chat como `mensagem-de-voz.ogg`, mas não chega ao WhatsApp. O resultado aparece como `UNKNOWN`. A investigação permanece **aberta em [wapphub-core#46](https://github.com/uillaneduardo/wapphub-core/issues/46)**. Este PR **não** corrige áudio outbound e **não** altera transporte, integração, idempotência ou Provider.

## Implementação visual
- `MessageComposer.tsx`: área principal curta com campo expansível, emoji de acesso direto e enviar. No mobile, há um botão `+` para abrir/recolher ferramentas secundárias, mantendo-as montadas. As opções Enter/Shift+Enter saem da tela principal e passam a um menu leve aberto sob demanda. O preview de formatação continua opcional.
- `ComposerTools.tsx`: variante com formatação (negrito, itálico, tachado, monoespaçado) sem duplicar o emoji principal. Seus handlers usam a seleção/cursor nativos do textarea, sem novos payloads.
- `MediaComposer.tsx`: a mesma implementação de anexar, gravar, parar, descartar e pré-visualizar. Nova prop opcional apenas para sinalizar gravação ativa ao container visual, mantendo ferramentas acessíveis enquanto o microfone está gravando. **Componente não é desmontado** ao fechar o menu.
- `composer.css`: estilos exclusivamente em `.composer-minimal` para preservar telas administrativas e simulação. Em telas acima de 720px, o rodapé secundário permanece visível em uma linha compacta; até 720px, botões de formatação/anexo/voz e preferências ficam recolhidos sob `+`, enquanto o conteúdo de anexo, avisos de gravação e erros permanecem visíveis. Áreas de toque acessíveis sem acrescentar linhas fixas ao compositor.
- Preferência de envio existente não migra e não é redefinida; não há mudanças nas funções de `sendDraft` / `submitMessage` / `onTextKeyDown` de `Conversations.tsx`.

## Critérios funcionais de aceite
1. Campo normal no mobile ocupa **uma linha horizontal** (+, textarea, emoji, enviar) e pode expandir até 132px conforme texto.
2. Ferramentas se abrem com +; nenhuma perda de texto, anexo ou MediaRecorder ao recolher. Durante gravação, ferramentas de concluir ficam acessíveis; após gravação, preview do áudio continua disponível mesmo com ferramentas recolhidas.
3. Emoji continua com busca e seleção no cursor; botões B/I/strike/code geram marcadores WhatsApp já suportados; Ctrl/Cmd+B/I e IME continuam funcionando.
4. `Enviar mensagem` continua a mesma ação do form (submit explícito). Enter/Shift+Enter usam o handler existente, selecionável em `Preferências de envio`.
5. Preferências e emoji não enviam mensagens ao abrir/fechar. Preferências fecham com Escape e devolvem foco. Preview mantém renderização sanitizada.
6. Falhas/estado `UNKNOWN` não resultam em reenvio automático. O bug de voz externo continua rastreado em #46.
7. Sem APIs, migrations, autenticação/tenant, Cloudflare, alterações em Core, Provider ou banco.

## Validação automatizada
- `npm ci`, lint, typecheck, testes de integração e unitários e build via CI.
- Novos testes em `MessageComposer.test.tsx`: toolbar compacta e montagem estável do MediaComposer, seleção de envio no menu com Escape/foco, único gatilho de emoji e ausência de envio não intencional.
- `ConversationView.test.tsx`: mantém teste da preferência de envio e demais cenários de mídia/voz, retry e UNKNOWN.

## Homologação manual no notebook depois de deploy do Chat
- **320×568 e 390×844:** campo +, emoji e enviar sem rolagem horizontal; ferramentas aparecem quando requisitadas, não há uma terceira linha vazia; teclado virtual não tapa o campo.
- **768×1024, 1024×768, 1366×768, 1920×1080:** barra de ferramentas compacta, campo com altura proporcional e botão enviar alinhado; nenhuma sobreposição de painel lateral.
- Selecionar parte de mensagem, formatar/desformatar, testar emoji com o cursor no meio, prévia e atalho Shift+Enter/Enter, inclusive entrada IME.
- Testar upload de **imagem** e anexo com falha controlada; anexos devem permanecer após falha e não ser perdidos ao recolher toolbar. Revisar gravação com microfone apenas em uso autorizado; **não usar áudio recebido no WhatsApp como critério de aceite da Fase D**, pois #46 é pendência independente.
- Verificar que a mídia continua disponível para reprodução e o histórico não é desmontado ao abrir menus.
- Não rodar browser gráfico nem Playwright no homelab. Homologação visual é manual no notebook.

## Publicação e rollback
Apenas Chat, depois do CI e merge: preservar versão da imagem atual; build imutável pelo SHA numa worktree separada sem sobrescrever `compose.yml` local; validar `CHAT_IMAGE_TAG` e subir somente `wapphub-chat`, sem dependências/rebuild. Não realizar migrations nem criar comandos reais de envio.
