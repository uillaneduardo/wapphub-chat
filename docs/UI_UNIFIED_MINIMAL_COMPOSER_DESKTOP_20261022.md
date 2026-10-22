# Refinamento D.1 — compositor web com a mesma experiência minimalista do mobile

Data: 22/10/2026. Escopo: **apresentação visual desktop**, sem mudança de contrato ou estado.

## Origem
O usuário aprovou a experiência do compositor na versão mobile e pediu a mesma simplificação na versão web. Este refinamento é um complemento da Fase D implementada no PR #43.

## Implementação
Alteração localizada em `src/features/conversations/composer.css`, sem novas dependências, APIs, modelos ou alterações JSX:
- Em **desktop >= 721px**, a linha principal fica com botão **+**, campo expansível, emoji e **enviar apenas com ícone** — o mesmo padrão mobile.
- A barra secundária (Anexar, Gravar voz, negrito, itálico, tachado, monoespaçado, prévia e preferências Enter/Shift+Enter) fica **fechada por padrão** e é revelada pelo botão +.
- O contêiner secundário permanece **montado**; recolher os botões não descarta MediaRecorder, arquivo ou estado da mídia.
- Durante gravação, o componente sinaliza estado ativo para manter os controles necessários acessíveis. Quando existe anexo, erro ou aviso de mídia, essa região continua visível acima da linha principal, mesmo com a barra de ferramentas recolhida.
- Na versão mobile <= 720px **nenhuma regra é modificada**; fica preservada a aparência aprovada pelo usuário.
- A versão intermediária 721–1439px também recebe a experiência de linha única; dimensões internas flexíveis e quebra de linha apenas no menu expandido.
- Os estilos seguem `--accent`, `--border`, `--surface` e os tokens da organização.

## Preservação funcional
- `sendDraft`, `submitMessage`, idempotência, estados `UNKNOWN`, teclado (Enter/Shift+Enter), IME, seleção/cursor e formatação WhatsApp não foram modificados.
- `MediaComposer` não foi reescrito. A [issue #46 do Core](https://github.com/uillaneduardo/wapphub-core/issues/46) continua aberta para investigação de áudio que aparece no Chat, mas não chega ao WhatsApp. Este PR não promete nem executa correção de mídia.
- Não alterar Provider, Core, Worker, redis, DB, mensagens ou sessão de WhatsApp.

## Validação e QA
CI obrigatório: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`. Testes existentes de expansão do botão +, estabilidade do `MediaComposer`, atalho, emoji, preview e proteção `UNKNOWN` continuam como gates.

Homologação visual manual no notebook:
1. Em 1920×1080, 1366×768 e 1024×768, confirmar que o compositor recolhido ocupa somente a linha principal (sem barra de ferramentas permanente).
2. Expandir/recolher com + e verificar anexar, gravação, formatação e preferência de envio; fechar não apaga o rascunho.
3. Em 390px, conferir que nada mudou na versão mobile aprovada.
4. Anexar uma imagem de teste e recolher as ferramentas: a prévia deve continuar visível e removível sem perder o anexo.
5. Não usar envio de voz real ao WhatsApp como critério de aceite visual até investigar a issue #46.
6. Não rodar navegador gráfico/Playwright no homelab.

## Deploy
Imagem nova **somente Chat** por SHA do commit de merge. Preservar imagem em execução e `compose.yml` customizado; construir em worktree separada, verificar mapeamento `127.0.0.1:3001:3000`, executar `docker compose config --quiet` e subir só `wapphub-chat` com `--no-deps --no-build --pull never`. Sem migrations. Rollback retorna à imagem anterior do Chat.
