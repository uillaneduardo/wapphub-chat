# Instruções para agentes e Codex — WappHub Chat

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
