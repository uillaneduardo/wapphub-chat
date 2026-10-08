# Validação da UI operacional M1

Validado localmente em 2026-10-08 na branch `feat/m1-chat-ui`.

## Escopo exercitado

- Caixa: escopos Minhas, Não atribuídas e Todas (condicionada a `conversations.supervise`), arquivadas, filtro por tag e paginação via `cursor`.
- Conversa: resumo e contato, responsável, tags, histórico paginado por `before`, notas internas paginadas e envio de texto.
- Envio: mensagem otimista, estado de erro e retry com o mesmo `clientMessageId` para preservar idempotência no Core.
- Ações: arquivar/reabrir, atribuição manual, transferência `FULL`/`LIMITED`/`NONE`, adicionar/remover tags e criar notas.
- Equipe: assignment e transferência usam seletor de pessoas com nome e email; opções sem `conversations.read` e `messages.read` ficam desabilitadas. Estados de carregamento, erro/retry e roster vazio foram testados.
- Realtime: eventos de conversa, mensagem, nota e tags atualizam dados pontuais; eventos de mensagem/notas atualizam a conversa aberta sem recarregar toda a caixa.
- Autorização: controles são derivados de `chatPermissions` retornadas pelo Core, sem inferência pelo nome da role.
- Layout: painel de caixa e conversa com contexto em desktop; navegação lista → conversa e retorno em mobile.

## Verificações executadas

```text
npm run lint       passou
npm run typecheck  passou
npm test           passou — 10 arquivos, 31 testes
npm run build      passou
```

## Limites e pendências validados

- Falta smoke autenticado no navegador contra a versão correta do frontend e Core.
- A API pública ainda não oferece roster. O novo `GET /api/v1/team/members` está validado na branch Core `feat/m1-team-roster`, mas ainda não foi integrado nem implantado.
- O hostname `chat.wapphub.com.br` responde 200, porém o serviço apontado pelo homelab é o app legado de `~/homelab/apps/chat`, não este repositório `wapphub-chat`.
- O resumo da caixa não inclui dados do contato; o nome e telefone são carregados no detalhe somente com `contacts.read`.
- Não foram testadas credenciais de produção nem efetuadas alterações de produção.
- `WEB_ORIGINS` não foi alterado.
