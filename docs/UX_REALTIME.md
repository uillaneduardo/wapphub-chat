# Experiência de Chat e Realtime

## Objetivo

A experiência deve se aproximar da fluidez esperada de um aplicativo nativo de mensagens.

O produto não pretende copiar visualmente o WhatsApp, mas deve oferecer interação familiar e responsiva.

## Desktop

Layout base:
- coluna de conversas;
- área central da conversa;
- painel de detalhes/contexto.

Em telas menores, as áreas podem virar navegação em sequência.

## Inbox

Filtros MVP:
- Minhas;
- Não atribuídas;
- Todas conforme permission;
- Arquivadas.

Lista deve atualizar incrementalmente por realtime.

Não recarregar a inbox inteira para cada mensagem.

## Histórico

- cursor pagination;
- carregar mensagens anteriores ao subir;
- preservar posição do scroll;
- suportar atualização incremental;
- preparar componentes para virtualização em históricos grandes.

## Composer

MVP:
- texto;
- imagem;
- áudio.

Experiência desejada:
- envio otimista;
- colar imagem do clipboard;
- drag & drop quando disponível;
- preview antes do envio;
- gravação de áudio no próprio app;
- cancelar gravação;
- ouvir antes de enviar;
- retry de falha.

## Áudio

Web deve usar recursos do navegador apropriados, como MediaRecorder quando suportado.

UI própria:
- duração;
- play/pause;
- progresso;
- estado de envio;
- retry.

Não depender de input de arquivo como experiência principal de gravação.

## Status de mensagem

Mostrar estado local/remoto de maneira discreta:
- enviando;
- enviado;
- entregue;
- lido;
- falhou.

A interface não deve travar esperando confirmação externa.

## Realtime

WebSocket é o mecanismo primário para mudanças operacionais.

Ao desconectar:
- informar estado de reconexão sem bloquear leitura local;
- reconectar automaticamente;
- executar sincronização de eventos perdidos.

## Troca de Organization

Fluxo obrigatório:
1. bloquear temporariamente ações mutáveis;
2. trocar contexto no Core;
3. sair dos escopos realtime anteriores;
4. invalidar cache tenant-scoped;
5. conectar realtime do novo contexto;
6. carregar bootstrap/inbox;
7. liberar interação.

Nunca manter visualmente dados do tenant anterior.

## Multimídia na conversa

Detalhes da conversa devem permitir acessar mídia vinculada.

MVP:
- imagens;
- áudios.

A mídia deve preservar contexto e permitir "ir para mensagem" quando aplicável.

## Android futuro

A UX web serve de referência funcional, mas componentes web não devem limitar o contrato da API.

O futuro Android nativo deve poder reproduzir:
- realtime;
- envio otimista;
- gravação de áudio;
- mídia;
- status;
- alternância de organização;
- cache/offline controlado.
