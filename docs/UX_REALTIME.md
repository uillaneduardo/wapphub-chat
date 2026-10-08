# Experiência de Chat e Realtime

## Objetivo

A experiência deve se aproximar da fluidez esperada de um aplicativo nativo de mensagens.

O produto não pretende copiar visualmente o WhatsApp, mas deve oferecer interação familiar e responsiva.

## Escopo M1 atual

O M1 frontend opera sobre o backend M1 já disponível no Core.

Nesta etapa:

- mensagens operacionais são de texto;
- WebSocket é o mecanismo primário de atualização;
- envio é otimista;
- histórico usa cursor pagination;
- reconnect usa replay/event stream;
- assignment e transfer usam os contratos reais do Core.

Imagem, áudio e gravação pertencem ao milestone de mídia e estão documentados separadamente.

## Desktop

Layout base:

- coluna de conversas;
- área central da conversa;
- painel de detalhes/contexto.

Em telas menores, as áreas podem virar navegação em sequência.

## Inbox

Filtros M1:

- Minhas;
- Não atribuídas;
- Todas conforme permission;
- Arquivadas;
- Tag quando suportado pelo endpoint.

A lista deve atualizar incrementalmente por realtime.

Não recarregar a inbox inteira a cada mensagem.

## Histórico

- cursor pagination;
- carregar mensagens anteriores progressivamente;
- preservar posição do scroll;
- suportar atualização incremental;
- preparar componentes para virtualização em históricos grandes.

## Composer M1

- texto;
- envio otimista;
- `clientMessageId` gerado pelo cliente;
- reconciliação com o `messageId` retornado pelo Core;
- retry reutilizando o mesmo `clientMessageId` quando apropriado.

A UI não deve criar duplicação em retry.

## Status de mensagem

Mostrar o estado suportado pelo Core de maneira discreta, por exemplo:

- enviando/local;
- enviado;
- entregue;
- lido;
- falhou.

A interface não deve travar aguardando confirmação remota.

## Realtime

Contratos atuais:

- WebSocket: `/api/v1/realtime`;
- event replay/sync: `/api/v1/realtime/events`.

Comportamento esperado:

- autenticar usando a sessão web existente;
- conectar somente com Organization Context válido;
- reconectar automaticamente com backoff;
- manter checkpoint/last event conforme contrato;
- recuperar eventos perdidos;
- deduplicar eventos;
- atualizar apenas recursos afetados;
- não usar polling frequente como estratégia principal.

## Segurança do realtime

O upgrade WebSocket respeita o Origin autorizado e a sessão do Core.

O frontend não:

- cria JWT paralelo;
- informa `organizationId` arbitrário como autorização;
- mantém subscriptions de Organization anterior;
- trata evento de outro tenant como válido.

## Troca de Organization

Fluxo obrigatório:

1. bloquear temporariamente ações mutáveis;
2. solicitar a troca de contexto ao Core;
3. encerrar/descartar escopos realtime anteriores;
4. invalidar cache tenant-scoped;
5. estabelecer realtime no novo contexto;
6. carregar bootstrap/inbox do novo tenant;
7. liberar interação.

Nunca manter visualmente dados da Organization anterior.

## Transferência

A UI deve representar as três políticas do Core:

- `FULL`;
- `LIMITED`;
- `NONE`.

A visibilidade é determinada pelo Core. O frontend não apaga nem copia histórico para simular a política.

## Mídia — etapa posterior

Quando o milestone de mídia for iniciado, o composer será expandido para imagem e áudio, incluindo preview, gravação, player e retry.

Essas capacidades não pertencem ao frontend M1 atual. Consulte `docs/MEDIA_EXPERIENCE.md`.

## Android futuro

A UX web serve de referência funcional, mas componentes web não devem limitar o contrato da API.

O futuro Android nativo deve poder reproduzir:

- realtime;
- envio otimista;
- alternância de organização;
- cache/offline controlado;
- mídia quando o respectivo milestone existir.
