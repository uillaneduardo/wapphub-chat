# Escopo do WappHub Chat

## Objetivo de experiência

O Chat deve ter comportamento fluido próximo de um aplicativo nativo de mensagens, sem copiar identidade visual do WhatsApp.

Requisitos transversais:
- realtime;
- UI otimista;
- reconexão;
- rotas reais;
- histórico incremental;
- mídia integrada à conversa;
- interface neutra e personalizável por accentColor.

Detalhes:
- `docs/UX_REALTIME.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/MEDIA_EXPERIENCE.md`

## Perfis

- Owner
- Supervisor
- Atendente

Capacidades são resolvidas por permissions da Membership.

## MVP

### Identidade/contexto
- login;
- aceite de convite;
- seleção de organização;
- alternância de organização;
- troca completa do contexto de cache/realtime.

### Equipe
- listar membros;
- convidar por e-mail;
- escolher perfil;
- reenviar/cancelar convite;
- alterar perfil;
- suspender/reativar vínculo conforme assentos.

### Contatos
- listar;
- visualizar;
- nome/número;
- histórico de conversas;
- observação básica.

### Conversas
- minhas;
- não atribuídas;
- todas conforme permissão;
- arquivadas;
- abrir;
- arquivar;
- reabrir;
- atribuir;
- transferir;
- tags;
- notas internas;
- atualização realtime.

### Mensagens
- texto;
- imagem;
- áudio;
- envio otimista;
- estados de envio/entrega/leitura/falha;
- retry;
- clientMessageId.

### Transferência
- histórico completo;
- últimas X mensagens;
- sem histórico;
- nota interna opcional.

Histórico real não é apagado.

### Atribuição
- manual;
- automática round-robin no MVP final.

### Mídia
- imagens;
- áudios;
- conteúdo multimídia por conversa;
- filtros básicos;
- download autorizado;
- imagem ampliada;
- ir para mensagem;
- gravação/player de áudio.

### Supervisão
Owner/Supervisor autorizados podem:
- ver todas as conversas;
- filtrar por atendente;
- assumir/transferir;
- consultar histórico completo.

### Configuração
- empresa;
- aparência básica/accentColor;
- conversas;
- atribuição;
- canal WhatsApp;
- diagnóstico.

## Interface

Direção:
- branco/cinza;
- texto escuro;
- uma cor de destaque por Organization;
- hierarquia visual discreta;
- tema claro no MVP.

## Android futuro

O app Android nativo é pós-MVP, mas o Chat Web não deve introduzir regras que impeçam o mesmo domínio/API de ser usado por ele.

## Fora do MVP

- vídeo;
- Status;
- chamadas;
- marketing;
- chatbot/IA;
- CRM;
- automações avançadas;
- BI/SLA avançado;
- app Android nativo.
