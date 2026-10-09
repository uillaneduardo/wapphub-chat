# Escopo do WappHub Chat

## Objetivo de experiência

O Chat deve ter comportamento fluido próximo de um aplicativo nativo de mensagens, sem copiar identidade visual do WhatsApp.

Requisitos transversais:

- realtime-first;
- UI otimista;
- reconexão;
- replay de eventos perdidos;
- rotas reais;
- histórico incremental por cursor;
- interface neutra e personalizável por `accentColor`;
- isolamento completo ao trocar Organization.

Detalhes:

- `docs/UX_REALTIME.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/MEDIA_EXPERIENCE.md`

## Autoridade de domínio

O `wapphub-core` é a autoridade para:

- autenticação;
- Organization Context;
- Membership;
- permissions;
- isolamento multi-tenant;
- regras de Conversation/Message;
- assignment/transfer;
- auditoria;
- realtime.

O frontend não infere autorização por nome de perfil e não cria regra de domínio exclusiva.

Perfis padrão podem ser Owner, Supervisor e Atendente, mas capacidades efetivas são resolvidas por permissions da Membership.

## M1 — escopo atual do frontend

### Identidade/contexto

- login via sessão server-side do Core;
- seleção de Organization;
- alternância de Organization;
- invalidar cache e subscriptions tenant-scoped ao trocar contexto;
- operações mutáveis seguindo Origin/CSRF do Core.

Aceite comercial de convite e gestão completa de equipe não fazem parte desta etapa.

### Contatos

- listar;
- visualizar;
- criar/editar conforme contrato disponível;
- navegar para conversas relacionadas quando suportado.

### Conversas

- minhas;
- não atribuídas;
- todas conforme permission;
- arquivadas;
- abrir;
- arquivar;
- reabrir;
- atribuir manualmente;
- transferir;
- tags;
- notas internas;
- atualização incremental realtime.

### Mensagens

No M1 atual:

- texto;
- envio otimista;
- `clientMessageId`;
- retry idempotente;
- estados suportados pelo Core;
- histórico por cursor.
- conversas do canal DEMO aparecem na inbox comum; direção/autoria vem do Core.

### Demo Provider (homologação M1)

- Configurações → Provedores permite ao contexto com `providers.manage` ativar/desativar DEMO.
- A primeira ativação provisiona dois contatos e mensagens recebidas pelo Core.
- O simulador autenticado `/app/providers/demo/simulator` permite enviar como contato autorizado pela sessão; não é endpoint público/anônimo.
- META pode aparecer no catálogo apenas como “Em desenvolvimento”; configuração permanece indisponível.
- Esta capacidade não declara integração Meta, mídia ou entitlements implementados.

Imagem e áudio pertencem ao milestone de mídia e não devem ser implementados no M1.

### Transferência

- `FULL`: histórico autorizado completo;
- `LIMITED`: últimas N mensagens;
- `NONE`: novo atendente sem histórico anterior;
- nota opcional quando suportada.

O histórico persistido nunca é apagado ou copiado pelo frontend para implementar visibilidade.

### Atribuição

M1:
- manual.

Round-robin permanece para etapa posterior do MVP.

### Supervisão

Usuários com permissions apropriadas podem:

- ver todas as conversas da Organization;
- filtrar por responsável quando o contrato permitir;
- assumir/transferir;
- consultar o histórico administrativo permitido.

O frontend não usa nome de role como substituto de permission.

### Realtime

Contratos atuais do Core:

- WebSocket: `/api/v1/realtime`;
- replay/sync: `/api/v1/realtime/events`.

A UI deve usar WebSocket como mecanismo primário, reconectar automaticamente, deduplicar eventos e recuperar eventos perdidos sem polling frequente.

## Rotas reservadas

As rotas documentadas em `docs/ROUTES.md` permanecem estáveis.

Rotas de equipe, arquivos, configurações comerciais ou WhatsApp podem existir inicialmente como placeholders. Placeholder não significa funcionalidade implementada.

## Milestones posteriores

### M2 — SaaS/Entitlements

- Product/Plan/Feature;
- Subscription;
- assentos;
- entitlements;
- recursos comerciais relacionados.

### M3 — Meta/WhatsApp

- integração Meta por Organization;
- canais WhatsApp;
- webhook/provider;
- diagnóstico e capabilities.

### M4 — mídia

- imagem;
- áudio;
- gravação;
- player;
- galeria;
- object storage autorizado.

### Fechamento do MVP

- round-robin;
- refinamentos operacionais/comerciais;
- demais itens definidos no roadmap do Core.

## Interface

Direção:

- branco/cinza;
- texto escuro;
- uma cor de destaque por Organization;
- hierarquia visual discreta;
- tema claro inicialmente;
- design tokens preparados para evolução de tema.

## Android futuro

O app Android nativo é pós-MVP. O Chat Web não deve introduzir regras que impeçam o mesmo domínio/API de ser usado por ele.

## Fora do MVP

- vídeo;
- Status;
- chamadas;
- marketing;
- chatbot/IA;
- CRM amplo;
- automações avançadas;
- BI/SLA avançado;
- app Android nativo.

## Evolução M2.1

Equipe/permissões passa a ser funcional e protegida por permissions efetivas.
Navegação agora oculta recursos indisponíveis/grupos vazios pelo catálogo Core,
superando a exibição anterior de placeholders desabilitados.
Contrato, revalidação de sessão e limites: [M2_1_TEAM_PERMISSIONS.md](M2_1_TEAM_PERMISSIONS.md).
Homologação manual pelo usuário permanece pendente.
