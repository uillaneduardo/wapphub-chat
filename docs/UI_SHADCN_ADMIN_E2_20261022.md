# Fase E.2 — Perfil, Configurações e Provedores (shadcn incremental)

Data: 22/10/2026
Estado: PR de implementação, homologação visual pendente após publicação do Chat.

## Verificação de entrada A.2
- Confirmado no GitHub: PR #48 mergeado à main (SHA `a7191e7d19e30cf976e48c1d3593f8f5dd79594e`), GitHub Actions completo com npm ci, lint, typecheck, testes e build concluído com sucesso.
- Usuário informou que atualizou o homelab. **Não foi possível verificar diretamente o container remoto ou as páginas autenticadas**, porque não temos acesso à VM/sessão autenticada pelo GitHub. A página pública não ficou acessível pela ferramenta de consulta nesta execução. Portanto, **não declarar homologação real A.2 em produção sem evidência do navegador/host**.
- Não instalar nem executar navegador gráfico no homelab.

## Mudanças E.2
1. Componentes shadcn em `src/components/ui/shadcn/input.tsx` e `badge.tsx` usando classes Tailwind v4, `cn()` e os tokens CSS da Organization. O Badge é apresentação, **nunca** autoriza ação.
2. **Meu perfil:** `PageHeader` compartilhado, Input shadcn para nome/e-mail/apelido e Button shadcn para salvar. Mantém campos com mesmos ids, autocomplete, readonly, required, maxlength, estado ocupado, mensagens de erro/status e as chamadas `profileApi.updateAccount/updateOrganization` existentes.
3. **Provedores:** PageHeader compartilhado, Button shadcn para toggle Demo, estado Meta desabilitado e Badge para estados simples. Nenhum status fictício.
4. **WhatsApp Web:** Badge shadcn recebe **exatamente** a apresentação de estado retornada por `connectionPresentation`; conserva `role=status`, o ícone e a classe `provider-state`. Ações de conectar, verificar, parar, recuperar, desvincular, QR, histórico e diagnósticos não foram reimplementadas.
5. `src/styles/settings-compact.css` isola ajustes de densidade/responsividade em `.admin-compact-page.profile-page` e `.admin-compact-page.settings-compact-page`; estilos de chat, Inbox, MediaRecorder, áudio e autenticação não são alterados. Sem Preflight global.

## Aceite
CI: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`; testar regressões totais de Profile, Providers, WebProvider, HistoryControls e ProviderDiagnostics.

Homologação visual no notebook:
- 390px, 768px, 1024px, 1366×768 e 1920×1080. Sem overflow horizontal nem cabeçalho esmagado.
- Meu perfil: nome cadastrado, e-mail somente leitura, apelido independente por organização, opção de herdar nome, preview e mensagens de retorno funcionam.
- Provedores: status real atual, QR sob clique explícito, menu Outros provedores, Demo toggle conforme `providers.manage`, Meta desabilitada; sem operações reais nesta checagem de apresentação.
- Apenas OWNER/SUPERVISOR com permissões efetivas acessam opções; AGENT sem `providers.manage` segue bloqueado.
- Estados de erro/realtime/versão/UNKNOWN continuam os mesmos. Sem refazer pareamento ou reconexão só por teste visual.
- Conferir no navegador se botão em shadcn apresenta hover/foco legível nas cores reais da organização.

## Limites
- Sem novos endpoints, migrations, permissões, funcionalidades, configuração do Core, Worker, Provider ou DB.
- Esta fase **não** corrige áudio outbound (Core issue #46) e **não** alterou o player.
- Outros módulos de Configurações podem ser abordados na revisão F, após identificar suas rotas concretas e consolidar o CSS legado sem regressão.

## Deploy
Após gates e merge, construir imagem imutável do `wapphub-chat` com SHA em worktree separada e registrar tag da imagem atualmente em execução. Validar `CHAT_IMAGE_TAG` com o Compose **local** antes de recriar apenas serviço `wapphub-chat`; manter `127.0.0.1:3001:3000` quando esse for o bind local. Não mexer no Core, Provider, Worker, banco, Redis ou Cloudflare Tunnel; rollback retorna somente ao artefato anterior do Chat.
