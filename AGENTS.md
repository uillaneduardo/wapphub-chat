# Instruções para agentes e Codex — WappHub Chat

Leia README.md, docs/SCOPE.md, docs/ROUTES.md e docs/STATUS.md antes de alterar código.

## Regras

- Não duplicar regras de negócio que pertencem ao wapphub-core.
- Usar URLs reais e visíveis na barra de endereço.
- Rotas profundas devem sobreviver a refresh.
- Troca de Organization deve invalidar todo cache tenant-scoped.
- Não inferir permissões por nome de perfil quando permissions estiverem disponíveis.
- Não inferir features pelo nome do plano.
- Ocultar botão não substitui autorização no backend.
- Não implementar vídeo, Status, chamadas, marketing ou IA no MVP atual.
- Atualizar docs/STATUS.md quando uma funcionalidade for realmente entregue.
