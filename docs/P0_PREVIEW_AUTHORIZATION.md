# P0 — Defesa adicional de prévias no Chat

> Atualização de produção — 2026-10-08, 15:00 Recife: P0 publicado em Core/API/Worker
> `cbaf50c5eedd6731e1ca3a674c1d9b0b20005a7d` (`wapphub-core:p0-preview-cbaf50c`)
> e Chat `d93efc576bd560fcbab0146343fb98bbbc1d0b69` (`wapphub-chat:p0-preview-d93efc5`).
> Todos os cinco serviços healthy; HTTP, assets e integridade aprovados.
> Validação funcional isolada anterior reaproveitada: 58 Core + 91 Chat; não reexecutada.
> Homologação visual desta publicação pendente. A2 e demais aceites M1 permanecem;
> M1 não formalmente encerrado. M2/P1 não iniciados.
> [Registro de publicação e contingência](DEPLOY_P0_20261008.md).

## Registro histórico anterior à publicação P0

Branch fix/m1-message-preview-authorization, base documental6b30266/código3e23452.
Core aplica autorização de conteúdo antes de responder list/detail; relatório
canônico: wapphub-core/docs/P0_PREVIEW_AUTHORIZATION.md. Sem essa correção backend,
esconder texto no Chat não resolve vazamento para outros consumidores.

InboxList renderiza lastMessagePreview apenas com messages.read. null fica vazio,
sem fallback para mensagens antigas. Não bloquear preview por visibility=NONE:
novas mensagens permitidas após transferência continuam válidas. Realtime usa
GET Conversation autorizado do Core, mantendo DTO string|null, eventos versão1
com IDs e os payloads atuais. Detalhe/histórico já usam messages.read e API própria;
nenhuma alteração do compositor, scroll, otimista, retry, Demo ou painel.

Cinco cenários adicionados em InboxList.test.tsx: preview autorizado FULL/LIMITED/
NONE, ausência de messages.read com supervisão e atualização realtime, null
mantido vazio. Suíte **91 testes/16 arquivos**, lint/typecheck/build aprovados.
Core: **58 testes** e lint/typecheck/build/OpenAPI, smoke isolado HTTP/WebSocket.
Sem browsers, testes visuais ou screenshots no Homelab. Código/doc local; nenhum
deploy/push/merge. Produção ainda é3e23452/Core72d05aa, com P0 pendente de publicação.

Arquivos funcionais: InboxList.tsx e InboxList.test.tsx. Tipos, contratos, API
client e persistência não mudaram; nenhuma migration. Regressões de autoria,
retry incerto Demo e checkpoint/fila A2 permanecem para entregas separadas.
M1 não formalmente encerrado e M2 não iniciado.

Publicação futura: Core corrigido primeiro, depois Chat como defesa adicional,
com autorização própria, imagens versionadas e configuration/rollback registrados.
Core corrigido aceita Chat anterior. Voltar só Chat é possível mantendo backend
corrigido; voltar ao Core72d05aa reintroduz o vazamento e não é recuperação segura.
Não voltar a Core pré-Demo nem restaurar banco/migrations para esse problema.
Homologar manualmente no notebook após deploy autorizado: previews/null,
transferências, mensagens futuras, permissões, Demo, scroll/compositor e duas orgs.
