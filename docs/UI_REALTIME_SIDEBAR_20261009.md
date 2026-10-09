# Indicador realtime na sidebar — 2026-10-09

Ajuste exclusivo do frontend: AppShell passa estado/retry à Sidebar e main contém apenas Outlet. Grid do atendimento tem uma linha minmax(0,1fr), sem linha/gap reservados à faixa. Colunas, histórico e compositor não mudam.

Rodapé: usuário/Organization, indicador e logout. open = Tempo real ativo (success), connecting = Conectando… e reconnecting = Reconectando… (warning), closed = Tempo real indisponível (danger). stale permanece indisponível (danger) com explicação de pausa e tentativa manual, preservando recuperação P1. role=status, aria-live=polite e aria-atomic anunciam mudanças sem toast/alert. Title explica conexão com servidor WappHub, não WhatsApp; dot decorativo, label preservado para leitores de tela mesmo no menu recolhido/mobile. Foco permite consultar title. Mobile mantém barra62px; recuperação pausada reserva espaço para botão44px sem alterar colunas.

Branch fix/ui-realtime-sidebar, baseada em integration/m1-accepted-20261008 (abb8a5a), que preserva a produção homologada6b04e65. Main antiga não foi usada como base nem mesclada; publicação da branch inclui ancestrais M1 locais, sem force push. Consolidação administrativa ainda exige revisão própria.

Validação: npm ci, lint, typecheck, 167 testes em21 arquivos (7 novos: posição, quatro estados+stale, recuperação recolhida), build e diff check aprovados. Sem alteração de dependências/lock/realtime.ts, Core, contratos, sessão/RBAC ou mensagens. Suites P0/P1 e contatos incluídas. Sem browser/screenshot no Homelab. O layout e fluxos autenticados de produção aguardam verificação manual no notebook após deploy; smokes HTTP não provam renderização/envio.

Deploy somente Chat via compose.yml existente e CHAT_IMAGE_TAG, imagem versionada por SHA, no-deps/no-build/pull never. Preservar wapphub-chat:m1-contacts-6b04e65; em regressão grave, retorno exclusivo Chat à tag anterior e nova verificação healthy/HTTP. Não reiniciar backend/persistência ou executar migrations.
