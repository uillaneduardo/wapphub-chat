# Validação da UI operacional M1

Validado localmente em 2026-10-08 na branch `feat/m1-chat-ui`.

## Escopo exercitado

- Caixa: escopos Minhas, Não atribuídas e Todas (condicionada a `conversations.supervise`), arquivadas, filtro por tag e paginação via `cursor`.
- Conversa: resumo e contato, responsável, tags, histórico paginado por `before`, notas internas paginadas e envio de texto.
- Envio: mensagem otimista, estado de erro e retry com o mesmo `clientMessageId` para preservar idempotência no Core.
- Ações: arquivar/reabrir, atribuição manual, transferência `FULL`/`LIMITED`/`NONE`, adicionar/remover tags e criar notas.
- Realtime: eventos de conversa, mensagem, nota e tags atualizam dados pontuais; eventos de mensagem/notas atualizam a conversa aberta sem recarregar toda a caixa.
- Autorização: controles são derivados de `chatPermissions` retornadas pelo Core, sem inferência pelo nome da role.
- Layout: painel de caixa e conversa com contexto em desktop; navegação lista → conversa e retorno em mobile.

## Verificações executadas

```text
npm run lint       passou
npm run typecheck  passou
npm test           passou — 10 arquivos, 29 testes
npm run build      passou
```

## Limites e pendências validados

- Falta smoke autenticado no ambiente com sessão e organização reais, incluindo envio e replay WebSocket.
- O contrato Core consultado não oferece endpoint de roster de usuários/equipe. A UI de atribuição/transferência aceita o UUID de destino informado pelo operador.
- O resumo da caixa não inclui dados do contato; o nome e telefone são carregados no detalhe somente com `contacts.read`.
- Não foram testadas credenciais de produção nem efetuadas alterações de produção.
