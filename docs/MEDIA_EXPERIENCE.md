# Experiência e Arquitetura de Mídia

## Status

Este documento descreve a experiência planejada para o milestone de mídia do WappHub Chat.

**Não faz parte do frontend M1 atual.**

O M1 opera somente mensagens internas de texto. Imagem, áudio, gravação, player e galeria devem ser implementados apenas quando o Core fornecer os contratos de mídia correspondentes.

## Escopo planejado

Tipos operacionais previstos:

- IMAGE;
- AUDIO.

Vídeo fica fora do MVP inicial.

## Princípio

Mídia é parte central da conversa, não um anexo desconectado.

Cada Media deve permanecer relacionada a:

- Organization;
- Conversation;
- Message;
- remetente;
- metadata de tipo/tamanho.

## Storage

O Chat não conhece MinIO/S3/R2 diretamente como regra de domínio.

O Core fornece autorização/metadata e abstração de object storage.

Quando possível:

- upload/download direto autorizado ao storage;
- API não carrega arquivos grandes inteiros na memória.

## Segurança

URL de mídia precisa respeitar autorização tenant-scoped.

Nunca confiar em URL pública permanente da Meta como armazenamento da aplicação.

## Imagem

Experiência planejada:

- preview;
- envio otimista;
- visualização ampliada/lightbox;
- download autorizado;
- contexto/remetente/data;
- ir para mensagem.

## Áudio

Experiência planejada:

- gravação interna;
- preview;
- duração;
- player próprio;
- envio assíncrono;
- retry.

O navegador poderá usar recursos apropriados como MediaRecorder quando o milestone for implementado.

Pipeline pode normalizar codec/container quando necessário antes do provider.

## Galeria da conversa

O painel de detalhes poderá oferecer conteúdo multimídia da conversa.

Escopo planejado:

- imagens;
- áudios;
- vínculo preservado com a mensagem de origem.

O gerenciador global de arquivos poderá oferecer filtros adicionais sem perder vínculo com a conversa.

## Regra para o M1

Não criar mocks de upload, contratos fictícios de mídia ou integração direta com storage durante o M1 apenas para antecipar esta documentação.
