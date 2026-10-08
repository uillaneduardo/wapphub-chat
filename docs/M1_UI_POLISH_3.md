# M1 UI Polish 3 — navegação, contexto e preferências

Implementação: commit `5ff30ee`.

Branch: `feat/m1-ui-polish-3`, criada da árvore limpa na versão publicada
`24dedb92253b3c00d0e7087a5294fd6ef9b466a1`.
Core de referência preservado: `72d05aa8c0a3c9f12a8c17abb25ad737b88c65af`.
Nenhum arquivo do Core, contrato, cliente REST, tipo de API, dependência,
Dockerfile ou Compose foi alterado.

## Componentes e navegação

`AppShell` delega o menu ao novo `Sidebar`, sem mudar o lifecycle realtime.
Rotas de Conversas, Contatos, Arquivos, Equipe, Tags e Configurações permanecem.
Provedores é subitem de Configurações, com lista recuada e marcador de borda;
nenhuma página ou permission foi criada. Conversas exige a permission existente
`conversations.read` para aparecer; Provedores exige `providers.manage`. Os
outros itens preservam sua visibilidade anterior. Authorization continua nos
guards e no Core.

Ícones `Icon` seguem a convenção existente do compositor: SVG local, 20px,
viewBox 24px, traço 1.8, currentColor, ocultos do leitor de tela. Rótulos acessíveis
identificam controles e links. Estados selecionado, hover, pressionado e foco
usam os tokens existentes. `NavLink` marca também rotas filhas; Configurações
permanece destacada na rota de Provedores.

Menu expandido: 232px, ícone/texto, identidade visual e rodapé com usuário e
“Sair da conta”. Recolhido: 64px, apenas ícones e `NavHint` em portal com tooltip
por hover/foco, sem clipping pela rolagem do menu. O botão de recolher só altera
preferência; não altera URL. Não há animação de largura. Movimento reduzido é
respeitado. Sidebar desktop tem altura de viewport e posição sticky, com scroll
no nav e logout em rodapé previsível.

No modo compacto, Configurações abre um flyout não modal em portal, limitado à
viewport. Contém Visão geral (rota `/app/settings`) e Provedores quando permitido.
A primeira opção recebe foco. Tab segue os links e sai para logout; Shift+Tab
no primeiro retorna ao acionador. Setas/Home/End navegam pelos links. Escape
fecha e devolve foco; clique/foco externos também fecham. No expandido, subitens
podem ser recolhidos sem mudar a rota.

Mobile mantém a navegação inferior de 62px e reserva de altura existente.
A preferência desktop de recolhimento fica armazenada, mas não controla a largura
mobile. Itens usam ícone/rótulo e rolagem horizontal própria da navegação;
Configurações usa flyout. Logout permanece disponível à direita. Não se oculta
rolagem no body/root. A largura do menu não tem transição que dispute a ancoragem
do histórico.

Logout invoca a função existente de `SessionContext`, que continua encerrando a
sessão por `sessionApi.logout`; não é um link para login. Botão tem log-out,
texto/tooltip, alvo de pelo menos 44px, estados de foco/hover/pressão e bloqueio
de clique repetido enquanto pendente. Falha exibe mensagem genérica, sem dados
de sessão, e não acrescenta confirmação modal.

## Contexto redimensionável

`useContextPanel` mede o corpo da conversa com ResizeObserver e listener de resize
como fallback. `ContextSeparator` é um separador vertical focável, com label,
aria-controls, valor atual e limites acessíveis. Largura padrão 300px, mínimo
240px, máximo 480px. Máximo efetivo é `min(480, largura disponível - 320 - 8)`:
320px reservados ao histórico e 8px para divisória. Sem pelo menos 568px no corpo,
o contexto passa ao comportamento empilhado. Viewport até 1050px mantém o
comportamento responsivo anterior: detalhes sob histórico, até 40% do corpo,
scroll independente e sem divisória redimensionável.

Arraste para a esquerda aumenta o contexto, para a direita reduz. Pointer Events
com captura preservam o gesto fora da divisória; apenas pointer ativo e botão
primário são aceitos. Cursor col-resize, linha destacada e estado is-resizing
indicam arraste. A divisão é imediata; gravação local só ao concluir o gesto.
Cancelamento, perda de captura e Escape cancelam o ajuste transitório.

Teclado: ArrowLeft aumenta 16px, ArrowRight reduz 16px; Shift aumenta o passo para
64px. Home vai ao mínimo; End ao máximo dinâmico. “Restaurar largura padrão” no
contexto redefine preferência a 300px, sempre sujeita ao limite disponível.
Encolher a janela limita a largura aplicada, sem sobrescrever a preferência;
ampliar restaura a preferência. Ao faltar espaço, a divisória desaparece e um
gesto ativo é cancelado. Nenhum conteúdo funcional do painel foi removido.

Grid continua minmax(0, 1fr), altura limitada à viewport, histórico/contexto com
scroll próprios e compositor no rodapé. `useMessageScroll` homologado não mudou;
ResizeObserver mantém a mensagem em leitura quando largura/quebra de linha mudam.

## Preferências e compositor

`useUiPreference` usa localStorage em `wapphub:ui:v1:<userId codificado>`. Armazena
somente sidebarCollapsed, contextWidth e sendShortcut. Nunca sessão, tokens,
permissões, textos, conversas, e-mails ou Organization Context. Contas distintas
no mesmo dispositivo usam chaves diferentes. Para a mesma conta, preferências
valem nas Organizations e compositores compatíveis, sem dependência de backend.
A sidebar remonta ao mudar a conta. Preferências ficam disponíveis no próximo
login da mesma conta; logout não as compartilha com a próxima conta.

useSyncExternalStore sincroniza instâncias e eventos storage de outras abas.
Dados inválidos usam defaults e larguras são limitadas. Se storage estiver
bloqueado/sem quota, controles funcionam em memória por conta, sem persistência
garantida ao recarregar. Essas preferências cosméticas não substituem RBAC.

`SendPreference` é um select compacto abaixo de Enviar, com label acessível
“Atalho de envio”. `useComposerShortcut` centraliza a regra nos compositores
principal e Demo, sem refatorar envio, providers ou modelo de mensagem:

| Preferência | Enviar pelo teclado | Nova linha nativa |
|---|---|---|
| Enter para enviar (padrão) | Enter | Shift+Enter |
| Shift+Enter para enviar | Shift+Enter | Enter |

IME (isComposing ou keyCode 229) nunca dispara envio. Ctrl/Alt/Meta não são
capturados. Botão Enviar permanece independente da preferência. Não há alteração
de payload, limite de 8000 caracteres, retry idempotente do principal, envio
otimista, estados de erro ou permissões. Demo continua usando ingestão existente
e bloqueando envio se provedor estiver desativado. Foi acrescentado um lock
síncrono ao Demo para que o novo atalho não duplique uma requisição pendente.
Ferramentas futuras continuam desabilitadas.

A duplicação relevante de teclado/preferência foi resolvida com um hook e select
compartilhados. Formulários e lifecycle de envio ainda são distintos (principal
com reconciliação/retry; Demo com ingestão como contato). Proposta separada, se
necessária: extrair uma casca visual comum de textarea/ações sem unificar regras
desses fluxos. Nenhuma refatoração arquitetural ampla foi feita nesta entrega.

## Estrutura responsiva revisada por código

Esta tabela descreve o comportamento de CSS/hooks, não medições em navegador.

| Resolução | Navegação | Contexto |
|---|---|---|
| 1920×1080 | 232px/64px conforme preferência | Inline quando cabe; divisória dinâmica |
| 1366×768 | 232px/64px conforme preferência | Inline quando cabe; preserva histórico ≥320px |
| 1024×768 | 232px/64px conforme preferência | Empilhado, sem arraste |
| 768×1024 | 232px/64px conforme preferência | Empilhado, sem arraste |
| 390×844 | Barra inferior, logout acessível | Empilhado, sem arraste |

Ferramentas/Enviar e preferência quebram linha quando necessário. Campos, grid e
flex containers continuam com min-width/min-height: 0. Tooltips/flyout em portal
não dependem do overflow de sidebar. Sem scroll horizontal indevido do documento;
a faixa horizontal do nav mobile é intencional.

## Testes e limites

Lint, typecheck, 86 testes em 16 arquivos, build e git diff --check passaram.
Incluem itens/ícones/hierarquia/rotas ativas, disclosure/flyout/foco, menu persistido,
isolamento entre contas, abas, dados inválidos/storage bloqueado, mobile e logout;
Pointer Events/captura/cancelamento, limites, teclado/restore/persistência, resize
responsivo; ambos os modos de teclado, IME, vazio e duplicação; regressões de
Demo, payloads, retry, realtime e scroll. Geometria é modelada em jsdom; esses
checks não comprovam layout CSS ou acessibilidade com leitor de tela real.

Homologação visual desta entrega pendente. Nenhum Chromium, Firefox, Playwright
Browser, bibliotecas gráficas, screenshot ou teste visual foi instalado/executado
no Homelab. Nenhum teste mutável em produção foi executado. Validar pointer/touch,
zoom, teclado virtual, leitor de tela e posicionamento de tooltip/flyout no
notebook. Navegadores sem ResizeObserver usam resize da janela para medir o
painel; alteração de largura só por recolher menu pode exigir resize da janela
para recalcular limites nesses navegadores antigos.

## Homologação manual após publicação autorizada

Em https://chat.wapphub.com.br/app/conversations, revisar os cinco tamanhos:

1. Expandir/recolher menu sem mudar rota. Conferir ícones, rótulos, seleção de
   pai/filho, hover/pressão/foco e Provedores sob Configurações conforme permission.
2. Compacto: tooltips em hover/foco, flyout dentro da viewport, foco inicial,
   setas, Tab/Shift+Tab, Escape e clique externo. Mobile: nav e logout acessíveis.
3. Recarregar: restaurar preferências. Sair e entrar em outra conta: defaults ou
   preferências próprias, sem reaproveitar as da anterior. Voltar à primeira:
   preferências próprias restauradas. Confirmar encerramento real de sessão.
4. Arrastar divisória: atingir limites, teclado, cancelar gesto e restaurar 300px.
   Encolher janela/recolher menu: manter limites e leitura; painel não cria scroll
   horizontal nem empurra Enviar. Em telas pequenas, sem divisória ativa.
5. Histórico longo: leitura de mensagens antigas, novas mensagens/indicador,
   paginação, retorno ao final e resize não devem reiniciar histórico/compositor.
6. Selecionar cada atalho nos dois compositores: Enter/Shift+Enter, multilinha,
   IME, vazio, botão Enviar, duplo acionamento e provedor desativado. Confirmar
   ferramentas indisponíveis e limite de texto. Usar conta/conversas de homologação.
7. Regressão de atribuição, transferência, tags e notas: conteúdo/permissões
   preservados, painel e dropdown sem clipping.

## Publicação futura

Aguardar autorização explícita. Não houve deploy, merge, push, migration,
alteração de banco, Core, containers, serviços, DNS ou Cloudflare.
Após autorização, verificar revisão exata e repetir checks essenciais. Construir
imagem versionada com VITE_API_BASE_URL=https://api.wapphub.com.br, preservando
`wapphub-chat:scroll-composer-24dedb9`, e atualizar somente wapphub-chat via Compose
existente/--no-deps, conforme docs/PRODUCTION_DEPLOY.md. Nenhuma migration é
necessária. Smoke HTTP/estáticos/readiness; homologação visual somente no notebook.

## Arquivos

- AppShell.tsx/test.tsx, Sidebar.tsx, Icon.tsx, NavHint.tsx: navegação/logout.
- ContextSeparator.tsx, useContextPanel.ts/test.tsx: divisória e limites.
- SendPreference.tsx, useComposerShortcut.ts, useUiPreference.ts/test.tsx,
  useMediaQuery.ts: preferências locais e regras compartilhadas.
- Conversations.tsx/ConversationView.test.tsx: integração principal.
- Providers.tsx/Providers.test.tsx: integração Demo, sem mudar contrato.
- global.css e messageScrollGeometry.ts: estilos e fixture de testes.
- AGENTS.md e docs/STATUS.md: registro da política permanente sem browser no Homelab.
- docs/M1_UI_POLISH_3.md, DESIGN_SYSTEM.md e UX_REALTIME.md: documentação.
