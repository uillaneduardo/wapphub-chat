# Instruções para agentes — WappHub Chat

Leia antes de alterar código:
- README.md
- docs/SCOPE.md
- docs/ROUTES.md
- docs/UX_REALTIME.md
- docs/DESIGN_SYSTEM.md
- docs/MEDIA_EXPERIENCE.md
- docs/STATUS.md

## Regras

- Não duplicar regras do wapphub-core.
- Usar URLs reais e visíveis.
- Rotas profundas sobrevivem a refresh.
- Troca de Organization invalida cache e subscriptions realtime tenant-scoped.
- Não inferir permissões por nome de perfil.
- Não inferir features por plano.
- Ocultar botão não substitui autorização backend.
- Chat é realtime-first; não implementar polling frequente como mecanismo principal.
- Mensagem enviada aparece otimisticamente e reconcilia status.
- Não recarregar listas inteiras a cada evento.
- Histórico usa paginação por cursor.
- Não manter dados do tenant anterior após troca de Organization.
- Áudio deve ter experiência de gravação/player própria no web quando o milestone chegar.
- Mídia preserva vínculo com Conversation/Message.
- Usar design tokens; não hardcode de cor por cliente.
- Interface base branca/cinza; accentColor é personalização controlada.
- Não implementar vídeo, Status, chamadas, marketing ou IA no MVP.
- Não colocar regra exclusiva no frontend que o futuro Android também precise.
- Atualizar STATUS somente quando funcionalidade estiver validada.

## Política permanente de homologação visual no Homelab

- Não instalar nem executar Chromium, Firefox ou bibliotecas gráficas no Homelab.
- Não executar Playwright Browser, screenshots automatizados ou testes visuais de navegador no servidor.
- Executar somente lint, typecheck, build e testes unitários/integração seguros sem navegador gráfico.
- A homologação visual é manual pelo usuário no notebook, após deploy explicitamente autorizado.
- Ausência de teste visual no servidor é validação manual pendente, não falha de implementação.

## Fluxo ChatGPT/GitHub ou Codex — WappHub integrado (revisado 2026-10-23)

**Coordenador/fonte canônica do trabalho:** `wapphub-core/docs/WHATSAPP_WEB_CONSOLIDATION_EXECUTION.md` e `wapphub-core/docs/WHATSAPP_WEB_CONSOLIDATION_PROGRESS.md`. Ler ambos **antes de alterar** Chat/Provider. Não criar plano ou arquivo de progresso concorrente; atualizar o progresso do Core ao iniciar/concluir cada fase, com evidências, commits e riscos.

**Executores:** ChatGPT via GitHub ou Codex no homelab (opcional). ChatGPT pode avaliar, planejar, implementar, escrever testes e abrir PRs; CI verifica os checks disponíveis. Sem acesso ao runtime, ChatGPT fornece comandos de deploy e não afirma teste local. **Decisões:** pedido explícito de implementação autoriza o escopo sem reconfirmação; o usuário homologa UI no notebook após publicação. Etapas B1–B5 seguem integradas e testadas, sem pedir microaprovações. Não simular homologação de navegador no servidor.

**Requisito operacional:** Chat deve permitir responder e **iniciar nova conversa usando contato existente ou número não cadastrado**. A entrada de número inclui DDI, normalização e mensagens de erro; Core valida Membership, permissão, canal, destinatário e idempotência antes de enviar. Nova conversa não é criada na mera digitação. Recebimento/envio de texto, imagem, áudio e vídeo devem refletir **capabilities efetivas**; status/autoria são do Core, não inferidos do frontend. Demo permanece utilizável.

**Sincronização:** inbox realtime-first, históricos/contatos/conversas paginados, mensagens novas sem refresh e sem controles que falsamente desliguem a sincronização obrigatória. Arquivamento remoto (quando conhecido) não é o arquivamento interno do atendimento; tags/atribuições são do WappHub. Diagnósticos técnicos não se tornam notificações humanas repetitivas.


## Entrega sem Codex

Branch por alteração, PR com CI, lint/typecheck/testes/build, revisão dos contratos reais e nenhuma capability de mídia inventada. Core modificado exige planejamento e validação conjunta de API/Worker/Provider; mudança apenas no Chat publica apenas Chat. Entregar comandos de sincronização, build, health/logs e rollback do Compose efetivo. Preservar QR, volumes, DB e flags. Status CI_VERDE, PUBLICADO e HOMOLOGADO são distintos.
