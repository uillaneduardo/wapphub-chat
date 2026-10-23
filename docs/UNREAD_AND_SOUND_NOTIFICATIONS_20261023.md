# WappHub — Não lidas e som de novas mensagens (23/10/2026)

## Objetivo e escopo
- Indicador discreto na lista de conversas para **mensagens recebidas de clientes ou colegas ainda não lidas pelo usuário atual**.
- Marcar a conversa como lida **somente** quando o atendente abriu a conversa, está com o navegador visível/em foco e está no fim do histórico.
- Opção explícita de ativar/desativar um som curto quando uma nova mensagem chega. Navegador pode bloquear áudio sem interação anterior; o botão é a ativação.
- Tenant, usuário e leitura independentes entre aparelhos por **checkpoint no Core**. O som é preferência local do navegador, identificada por usuário+organização.
- As mensagens já existentes na primeira instalação sem checkpoint podem aparecer como não lidas até serem vistas; não alterar históricos para simular leitura.

## Contrato e ordem de implantação

**Dependência obrigatória:** [wapphub-core PR #48](https://github.com/uillaneduardo/wapphub-core/pull/48) deve estar mesclado, com migração Prisma executada e Core API saudável, **antes do deploy deste Chat**.

- `GET /conversations` / `GET /conversations/:id`: `hasUnread: boolean` persistente, autoritativo do Core. O Chat não calcula a partir de datas nem do status READ do WhatsApp.
- `POST /conversations/:id/read`: `{messageId: UUID}`, avanço monotônico até mensagem realmente carregada e permitida. Envia no máximo uma chamada por última mensagem de entrada visível; falhas não limpam o indicador localmente.
- `conversation.read.updated`: evento WebSocket somente para a conta dona do checkpoint; a Inbox atualiza a linha consultando REST. Outros usuários mantêm seus próprios indicadores.
- Core não modifica status de entrega/recibos da Meta, nem faz envio para o Provider.

## Visual e som
- Inbox: fundo leve, nome um pouco mais forte e bolinha de 8px na cor `--accent`, com `aria-label` de não lidas. Sem mensagens.read não exibir dados nem marcadores.
- Botão discreto Bell/BellOff ao lado da contagem. `aria-pressed`, `aria-label`, tamanho adaptado a toque.
- Sons gerados via Web Audio (dois tons leves), sem arquivo externo e sem autoplay no bootstrap. Preferência desativada por padrão, salvo escolha local anterior.
- O **listener de som pertence a AppShell**, e continua ativo quando o usuário navega em Contatos, Perfil, Configurações e demais rotas autenticadas. A Inbox apenas oferece o botão Bell/BellOff; não monta segundo listener sonoro.
- Apenas eventos realtime `message.created` **recentes após montagem da página**, confirmados com `getMessage`, provenientes do contato ou usuário diferente. Ignora históricos importados, eco de próprio envio, mensagens optimistic, eventos de reconexão antigos, conversas abertas em foco e repetidos.
- A indisponibilidade do Web Audio não interrompe chat/realtime. Falhas de leitura não ativam falsa confirmação visual.

## Limitações conhecidas e evolução
- Um som só funciona após gesto autorizado pelo navegador; dispositivos podem bloquear/restringir em segundo plano.
- A preferência de som **não sincroniza entre dispositivos** (o estado de leitura, sim).
- Badge é **binário** (não lida/lida), não contagem por mensagem, para evitar números imprecisos em importações ou mudanças de atribuição.
- Uma conversa só é marcada como lida se estiver no fim da lista e com foco; mensagens mais antigas fora do viewport não são tratadas como lidas individualmente.
- Multiplas abas podem tocar som simultâneo dependendo das políticas do navegador; uma deduplicação cruzada por Web Locks/BroadcastChannel pode ser considerada em evolução.
- Não há push móvel, service worker ou permissão Notification do SO nesta etapa.

## Testes e homologação
- Core: isolamento entre organizações, OWNER/AGENT, sem visibilidade proibida, marcadores monotônicos e idempotentes, exclui histórico importado, só evento direcionado ao próprio usuário.
- Chat: mostra badge por `hasUnread`, limpa depois de evento+GET, persistência da opção, filtro de sons e eventos históricos, teclado/acessibilidade.
- Desktop 1366px/Full HD e mobile 390px: conferir chegada em conversa fechada, som ativado, chat aberto/focado sem som, troca de conversa, aba oculta, permissão Agent, reconexão, troca de organização, sem repetição após refresh.
- Sem alterações em anexos/media/transporte; pendência de mídia [#51](https://github.com/uillaneduardo/wapphub-chat/issues/51) continua isolada.

## Rollback
A migração cria tabela nova e não altera conteúdo existente. Para rollback, retornar a imagem anterior do Chat e Core se necessário; **não reverter a migration no banco de produção** sem planejamento. No deploy, atualizar somente serviços Core e Chat nesta ordem (não Provider, não Worker). Backup de banco recomendado antes da migration e deploy de produção.
