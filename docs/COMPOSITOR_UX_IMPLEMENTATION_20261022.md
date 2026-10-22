# Implementação — compositor de mensagens (22/10/2026)

Referência funcional: [COMPOSITOR_UX_PROPOSAL_20261022.md](COMPOSITOR_UX_PROPOSAL_20261022.md), issue #33.

## Implementado no Chat

- **Editor compacto:** textarea controlado com crescimento progressivo (44–144 px), rolagem depois do limite, contador de caracteres a partir de 7.600/8.000, área de texto e toolbar responsivas.
- **Formatação WhatsApp:** negrito (`*texto*`), itálico (`_texto_`), tachado (`~texto~`) e monoespaçado (três crases). Toolbar funcional e Ctrl/Cmd+B/I com IME protegido. Edita o texto/seleção/caret e permite desfazer a marcação quando delimitada; não utiliza HTML ou `contenteditable`.
- **Prévia:** renderização somente com `FormattedMessage`, sem modificar o payload e sem inserir HTML.
- **Emojis:** catálogo pequeno (local e estático) carregado via `React.lazy` somente ao abrir; categorias, busca em português, recentes apenas em memória, Escape e operação via teclado. Não há CDN, dependência nova ou rede.
- **Rascunhos:** ficam na memória por `userId + organizationId + conversationId` (máximo 30), sobrevivem à troca de conversa na SPA e são apagados ao logout, troca de usuário/organização ou retirada da permissão de envio; **não** persistem ao F5/reiniciar o navegador. Não salvam anexos/binários.
- **Mídia:** conserva anexo/gravação e seus estados; prévia do arquivo aparece antes da barra de ações. Sem mudar upload/autorizações.
- **Envio:** mantém `sendDraft`, `submitMessage`, `clientMessageId`, reconciliação, retry e tratamento UNKNOWN do Core. Verificação UNKNOWN acontece antes de limpar o rascunho. Preferência Enter/Shift+Enter e bloqueio IME mantidos.

## Escopo e limitações

Nenhuma migração, endpoint ou alteração no Core, Provider, WebSocket, backend ou túnel. Catálogo de emojis deliberadamente limitado; expandir futuramente mediante avaliação de tamanho e acessibilidade. A formatação e a prévia usam texto/Unicode padrão. A seleção nativa da textarea é mantida; validações de comprimento contam unidades UTF-16, como o `maxLength` atual.

## Testes automatizados e gates

- `npm run lint`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- Testes de formatação/marcadores e limite 8.000, inserção de emoji, seletor lazy, IME, rascunhos e isolamento, além de toda a suíte de mensagens, media e realtime.

## Homologação visual manual (notebook)

Sem Chromium/Playwright no homelab, conforme `AGENTS.md`.

1. Na conversa com espaço amplo/reduzido, conferir altura automática do campo, quebra dos ícones e botão Enviar.
2. Selecionar texto, clicar em Negrito/Itálico/Tachado/Monoespaçado, repetir ação para remover delimitadores; testar Ctrl/Cmd+B/I, quebra de linha, Unicode e IME.
3. Abrir Emojis, pesquisar, navegar com teclado, escolher um e verificar que a posição do cursor e o texto existente são preservados; Escape retorna foco ao botão.
4. Enviar texto e anexo/voz somente por gesto explícito, alternar conversas, testar recuperação de rascunho por organização, falha de upload/retry e estado UNKNOWN.
5. Conferir tela com 1920x1080, 1366x768 e ~390px; expandir painel de contexto; verificar inexistência de sobreposição sobre mensagens/painel.
6. Confirmar no ambiente real que não existe envio duplicado ou mudança no payload.

## Publicação segura

Após merge, build de imagem com tag do SHA final do Chat; não executar migrations ou rebuild de Core/Provider. Antes de atualizar, registrar a imagem/tag em execução e preservar `compose.yml` modificado localmente no homelab. Manter `127.0.0.1:3001:3000` no serviço Chat conforme configuração local e validar `docker compose config`. Subir somente `wapphub-chat` com `--no-deps --no-build --pull never`. Smoke local `http://127.0.0.1:3001/login` e navegador em `https://chat.wapphub.com.br/login`. Rollback: tag anterior do Chat com a mesma configuração de Compose; sem tocar banco, provider ou sessões.

**Estado:** funcionalidade incorporada ao código nesta entrega, mas homologação visual/produção dependem de confirmação humana. Não marcar `docs/STATUS.md` como homologado sem evidência.
