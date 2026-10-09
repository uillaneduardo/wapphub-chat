# Navegação atual — M2.1

Todos os recursos públicos cadastrados na navegação permanecem visíveis.
Somente recursos autorizados com AVAILABLE/navigation=true têm links ativos.
[Arquitetura, estados e limites atuais](PERMISSIONS_UI_POLISH.md).

## Histórico — consolidação anterior de 2026-10-09

# Navegação por contextos — 2026-10-09

A Sidebar deriva de `src/components/navigation.ts`: Atendimento, Produtividade,
Comunicação, Gestão e Preferências, nesta ordem. Grupos sem itens visíveis são
omitidos. Identificadores são estáveis; cada item admite rota, ícone Lucide,
permissions efetivas, disponibilidade e campos opcionais featureCode/entitlement.
Os dois últimos permanecem sem valores: o bootstrap atual não fornece catálogo
ou entitlements. Não há inferência por role/plano nem contrato novo com o Core.
A autorização de API continua no backend.

Atendimento preserva Conversas (`conversations.read`), Contatos (`contacts.read`),
Etiquetas e Arquivos, nesta ordem e nas rotas M1 originais. Os catálogos de
Etiquetas/Arquivos continuam placeholders existentes (`RESERVED_ROUTE`); preservar
seus links não declara mídia nem catálogo de etiquetas implementados. Etiquetas
em conversas continuam operacionais como antes.

Produtividade: Respostas rápidas, Automações e Bots de conversa são PLANNED.
Comunicação: Campanhas é PLANNED; Status/Chamadas são RESEARCH, dependentes das
capacidades oficiais do provider. Todos são controles desabilitados, sem rotas
novas. Inserção por `/` no compositor permanece futura. Nenhuma integração
WhatsApp não oficial ou funcionalidade M2 foi adicionada.

Gestão: Equipe e permissões conserva `/app/team` como PLACEHOLDER desabilitado,
sem anunciar RBAC granular. Canais e integrações usa `/app/settings/providers`
com `providers.manage`. Simulador Demo exige `providers.simulate` E `messages.read`.
Para sessão apenas simuladora, o acesso existente a Canais aponta ao simulador.
Uso e custos/Plano e assinatura são PLANNED, desabilitados.
Preferências: Configurações conserva `/app/settings` como PLACEHOLDER desabilitado.
Preferências cosméticas reais (menu, contexto e atalho de envio) mantêm controles
existentes e armazenamento por User; não foram movidas nem duplicadas. Todas as
rotas profundas anteriores continuam registradas em App.tsx.

Desktop: grupos discretos com separadores, menu recolhível persistido por User,
tooltips e flyouts. Foco inicial, setas/Home/End, Escape com retorno ao gatilho,
Tab de saída, fechamento por foco externo/clique/rota/Organization são preservados.
Mobile: somente Conversas/Contatos diretamente na barra, conforme permissions;
“Mais” abre os demais contextos agrupados, com rolagem vertical limitada à viewport.
Sem multiplicar botões horizontais. Geometria da inbox/compositor não foi alterada.

Rodapé mantém identidade, Organization, realtime/retry e logout. Para múltiplas
Organizations, “Trocar organização” abre `/organizations` (no mobile fica em Mais).
Não altera contexto diretamente: usa o fluxo server-side existente, que desmonta
o shell durante loading e remonta o conteúdo por User/Organization, encerrando
subscriptions/reconciliação anteriores. Nenhum seletor local ou cache novo.

Validação: lint/typecheck/test/build e CI GitHub sem navegador gráfico. Os testes
cobrem catálogo/ordem/permissões/grupos vazios/indisponibilidade/rotas, menu e foco,
mobile, entrada de troca de Organization, desmontagem tenant-scoped, realtime e
logout. A homologação visual/funcional final cabe ao usuário no navegador.

## Evolução M2.1

Equipe/permissões passa a ser funcional e protegida por permissions efetivas.
Navegação mantém recursos públicos visíveis nos cinco contextos; disponibilidade
e permissions efetivas do Core controlam links e motivos de bloqueio.
Refinamento: [PERMISSIONS_UI_POLISH.md](PERMISSIONS_UI_POLISH.md).
Contrato, revalidação de sessão e limites: [M2_1_TEAM_PERMISSIONS.md](M2_1_TEAM_PERMISSIONS.md).
Homologação manual pelo usuário permanece pendente.
