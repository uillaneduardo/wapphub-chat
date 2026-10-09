# M2.1 — refinamento do editor e navegação permanente

Escopo exclusivo do Chat. Contratos REST, RBAC, permissões padrão, resolução
Core, isolamento, sessões, realtime e persistência permanecem os do M2.1.
Nenhuma migration, nova dependência ou funcionalidade M2.2.

## Diagnóstico e contratos preservados

Equipe fica em `features/team/Team.tsx`; o editor foi separado em
`MemberPermissions.tsx`, com apresentação compartilhada em `teamPresentation.ts`
e CSS restrito a `.permissions-editor`. `lib/teamApi.ts` permanece intacto.
GET `/api/v1/permissions` retorna code/name/module/resourceCode/editable/sensitive;
não há description na Permission. A busca utiliza description do Resource real
associado, presente em session.resources. GET de membro fornece version, inherited,
grants, revocations, effective e identidade/estado. PUT mantém expectedVersion,
grants e revocations; POST/reset mantém expectedVersion. DTOs/OpenAPI inalterados.

## Editor

Busca local por título, descrição do recurso e código, sem distinção de caixa e
sem novas consultas. Limpar busca restaura a lista; busca expande os resultados
sem alterar os estados de accordion guardados. Módulos vêm do catálogo, incluindo
novos nomes; contexto vazio cai em Outras permissões. Ícone desconhecido usa Lucide
Settings. Descrição de grupo aparece quando há uma descrição de recurso comum.
Botões de cabeçalho possuem aria-expanded/controls; Enter/Espaço nativos e
setas/Home/End mudam foco. Expandir/Recolher todas não altera ajustes.

Select mantém Padrão/Conceder/Revogar. Herança, override e acesso aplicado pela
API são distintos da proposta não salva. Contadores indicam concessões propostas
sobre operações de recursos AVAILABLE, considerando estado ativo do membro.
A proposta não promete aprovação da API. Recursos indisponíveis, operações não
delegáveis, permissões ausentes da autoridade efetiva do ator e autoedição são
bloqueados para escrita; o Core continua revalidando tudo.

Contagem de mudanças compara modos com o estado confirmado. Save desabilitado
sem diferenças e durante operação; lock síncrono impede duplicação. Só resposta
bem-sucedida atualiza baseline/version. Erros mantêm rascunho. Conflito 409 oferece
recarregamento com confirmação de descarte. Descartar restaura os overrides
originais, sem requisição. Restaurar padrões continua persistido no Core.
Salvar/restaurar exige confirmação com membro identificado; revogações de
operações sensitive aplicadas são listadas nominalmente, inclusive no reset.
Dialog tem foco inicial, Tab limitado, Escape/Cancelar e retorno ao controle.

A árvore de rotas migrou de BrowserRouter para createBrowserRouter/RouterProvider
com os mesmos caminhos e guards em `app/routes.tsx`, para usar o bloqueador oficial useBlocker.
Nenhum loader, polling ou nova lógica de sessão. Saída interna, seleção de outro
membro, ida a /organizations e Voltar do histórico são bloqueados com rascunho.
Reload/fechamento da aba usa confirmação nativa beforeunload, sujeita às regras
do navegador. Operação pendente não pode ser descartada enquanto salva.
Consultas abortadas e respostas de instâncias desmontadas são ignoradas.
Invalidações automáticas de segurança do M2.1 continuam desmontando estado;
a confirmação protege navegação iniciada pelo usuário, não impede revogação.

## Navegação permanente

Todos os itens públicos de `components/navigation.ts` permanecem visíveis nos
cinco contextos, mesmo sem acesso. Disponibilidade/motivo vêm do catálogo Core;
links exigem AVAILABLE, navigation=true, rota implementada e permissions efetivas
existentes. Ausência de catálogo nunca libera acesso. Disabled buttons, wrappers
focáveis, texto/descrição e tooltips curtos comunicam Acesso restrito, Em breve,
Em estudo, Indisponível ou Descontinuado. Sem href fictício ou conteúdo protegido.
Core não fornece decisão de inclusão em plano: entitlement é apenas identificador;
Não incluído não é inferido. Etiquetas em conversas continuam operacionais,
mas sua página reservada permanece bloqueada (navigation=false no Core).
Simulador Demo mantém rota e autorização próprias ao lado de Canais e integrações;
sem providers.manage, Canais aparece restrito e Demo continua acessível se autorizado.

Menu recolhido mantém ícones e flyouts, incluindo foco em recursos desabilitados.
Mobile mantém só Conversas, Contatos e Mais; demais contextos no menu secundário
com scroll vertical limitado. Dimensões do shell/compositor/rodapé preservadas.
CSS novo restrito à navegação e ao editor; sem alteração de tokens globais.

## Validação e homologação

Lint, typecheck, testes de integração/unitários em jsdom e build. Regressões M1 e
M2.1 mantidas. Os testes antigos de ocultação foram atualizados para visibilidade
permanente com bloqueio, preservando verificações de autorização/rotas.
Testes de rotas confirmam os caminhos e guards após adoção do Data Router.

Não executado navegador gráfico no homelab. Geometria real em Full HD/mobile,
leitores de tela e comportamento nativo beforeunload devem ser homologados pelo
usuário no notebook. Conferir busca, accordion, ajustes, erro/conflito, descarte,
saída/troca de membro/organização, estados da Sidebar e atendimento/realtime.
Publicação técnica registrada fora do Git em deploy-records/wapphub-chat.
