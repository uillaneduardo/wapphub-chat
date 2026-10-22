# Incidente: erro `Illegal invocation` ao abrir o WappHub Chat (22/10/2026)

## Sintoma

Ao carregar `/app/conversations/:id?scope=all` no Chrome, o operador encontra a tela padrão do React Router:

- `Unexpected Application Error!`
- `TypeError: Illegal invocation`
- Stack trace inicia dentro do bundle minificado durante `RealtimeClient.connect()`.

Isso bloqueia a montagem da aplicação. A captura fornecida mostra o bundle `index-B6Gvq9Ul.js`, mas não foi possível obter esse artefato do ambiente implantado para resolver offsets/minificação; a análise se baseia na pilha visível e no código-fonte.

## Causa compatível com o código

Em `src/lib/realtime.ts`, as funções DOM nativas `setTimeout` e `clearTimeout` eram atribuídas diretamente aos campos `this.setTimer` e `this.clearTimer`. A execução posterior via método da instância (por exemplo, durante o watchdog de `connect()`) pode fazer o navegador avaliar o receiver como `RealtimeClient`, e não `Window`, resultando em `Illegal invocation`.

O watchdog é acionado imediatamente após a criação do WebSocket, coerente com a falha no efeito React de `AppShell`. Essa falha não depende da presença de mensagens de mídia e o código já existia antes do refinamento visual de mídia.

## Correção

- As funções nativas de temporização agora usam `globalThis.setTimeout.bind(globalThis)` e `globalThis.clearTimeout.bind(globalThis)`.
- As implementações injetadas por `RealtimeOptions` para testes continuam preservadas.
- Novo teste em `realtime.test.ts` simula um timer estrito que lança `Illegal invocation` se o receiver não for o global e exercita conexão, retry e fechamento.

## Escopo e implantação

Alteração restrita a `src/lib/realtime.ts` e teste de regressão. Não modifica endpoints, autorização, mídia, Core, provider, fluxo de mensagens nem mecanismo de reconexão. A validação automatizada do PR usa ESLint, typecheck, Vitest e build. Após o merge, uma nova imagem do frontend **ainda precisa ser construída e implantada no homelab** por procedimento autorizado.

## Homologação manual

No notebook, após deploy controlado:

1. Abrir a conversa via URL direta e recarregar a página.
2. Confirmar que a Inbox monta normalmente e que o WebSocket entra no estado conectado.
3. Navegar entre conversas e diferentes filtros, sem página de erro.
4. Conferir mensagens com texto e mídia; validar reconexão após perda temporária de rede.
5. Se persistir `Illegal invocation`, capturar Console com source maps da nova imagem; não presumir que o stack do bundle anterior corresponde ao novo deploy.

Não executar navegador gráfico ou Playwright no homelab, conforme `AGENTS.md`. A homologação visual e runtime real permanecem pendentes após o merge.
