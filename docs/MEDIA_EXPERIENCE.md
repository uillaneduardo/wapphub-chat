# Experiência e Arquitetura de Mídia

## MVP

Tipos operacionais:
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

Core fornece autorização/metadata e abstração de object storage.

Quando possível:
- upload/download direto autorizado ao storage;
- API não carrega arquivos grandes inteiros na memória.

## Segurança

URL de mídia precisa respeitar autorização tenant-scoped.

Nunca confiar em URL pública permanente da Meta como armazenamento da aplicação.

## Imagem

Experiência:
- preview;
- envio otimista;
- visualização ampliada/lightbox;
- download autorizado;
- contexto/remetente/data;
- ir para mensagem.

## Áudio

Experiência:
- gravação interna;
- preview;
- duração;
- player próprio;
- envio assíncrono;
- retry.

Pipeline pode normalizar codec/container quando necessário antes do provider.

## Galeria da conversa

Painel de detalhes oferece conteúdo multimídia da conversa.

MVP:
- imagens;
- áudios.

O gerenciador global de arquivos pode oferecer filtros adicionais sem perder vínculo com a conversa.
