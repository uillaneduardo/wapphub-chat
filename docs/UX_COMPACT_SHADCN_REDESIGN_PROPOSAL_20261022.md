# WappHub Chat — Proposta de revisão visual compacta e adoção gradual de shadcn/ui
**Data:** 22/10/2026  
**Status:** PROPOSTA EM REVISÃO — documentação somente, sem alteração de componentes, dependências, build ou deploy.

## 1. Objetivo e fontes
Modernizar a interface **completa** do WappHub Chat para uma linguagem operacional compacta, próxima da densidade e clareza de aplicativos de chat atuais, preservando a identidade própria do WappHub (base branca/cinza, cor de destaque configurável), RBAC do Core, fluxos de atendimento e recursos já homologados. O objetivo não é clonar marca ou identidade visual do ChatGPT.

**Evidências analisadas:** captura mobile enviada pelo usuário em 22/10/2026 (exibe compositor em múltiplas linhas e navegação inferior extensa), código atual em `src/styles/global.css`, `src/features/conversations/composer.css`, `MessageComposer.tsx`, `Conversations.tsx`, `InboxList.tsx`, `src/components/Sidebar.tsx`, `navigation.css` e docs do repositório. **Limite:** sem captura ao vivo das rotas, inspeção DOM no navegador, aferição de performance ou auditoria de acessibilidade executada. Os pontos relativos ao desktop são riscos estruturais identificados no CSS + relato do usuário, não homologação visual reproduzida.

## 2. Diagnóstico
- **Compositor mobile:** campo, anexar, voz, formatação, prévia, enviar e seletor Enter/Shift+Enter se quebram em 3 ou mais linhas; na captura o ícone de prévia aparece isolado. A área de digitação concorre com a lista e barra inferior.
- **Barra mobile:** mistura navegação principal, ações globais e saída da conta num espaço exíguo; aumenta o espaço ocupado por controles quando há uma conversa aberta.
- **Desktop estreito:** várias regras `@media` históricas, larguras fixas e sobrescritas sucessivas em `global.css`; isso torna o comportamento entre 1024 e 1440px frágil. Não reduzir fontes abaixo de limites legíveis para solucionar encaixe.
- **Header/chat:** a foto do contato não é exibida; apenas inicial. A foto real depende de um contrato autorizado do Core — não assumir disponibilidade nem criar URL direta do Provider.
- **Consistência transversal:** navegação, permissões, contatos, configurações e modais possuem estilos distintos de botões, escalas e densidade. A solução requer tokens e componentes compartilhados, não apenas CSS local.

## 3. Direção visual
**Compacta, não minúscula.** Superfícies claras, bordas discretas, espaços pequenos consistentes; realce `--accent` da Organization apenas em ações ativas. Ícones Lucide padronizados (16–18px controles; 18–20px navegação) e fontes legíveis. Preserve contraste, alvos de toque e estados de foco, carregamento, erro e ausência de permissão.

### Tokens propostos (candidatos; validar no navegador)
| Elemento | Desktop | Mobile |
|---|---:|---:|
| Texto de interface | 13–14px | 14px |
| Metadados/timestamp | 11–12px | 11–12px |
| Título da conversa | 14–15px | 14–15px |
| Cabeçalho da conversa | 54–58px | 50–56px |
| Trilho de navegação global | 54–60px | — |
| Lista lateral de conversas | 280–320px | largura total na tela da inbox |
| Painel de contexto opcional | 272–320px | Sheet/Drawer sob demanda |
| Navegação inferior (somente telas-raiz) | — | 54–58px + safe area |
| Campo de composição, recolhido | 44–48px | 44–48px |
| Área de toque/foco dos controles | >= 40px com contexto adequado | >= 44px (preferencial) |
| Raio dos controles | 8–12px | 8–12px |

Na prática **não** encurtar fonte para 9–10px para caber; remover controles persistentes, usar menus contextuais e colunas flexíveis.

## 4. Layout de referência

### Desktop amplo (>= 1440px)
`AppNavRail (56) | Inbox (280–320) | Conversation (minmax(0,1fr)) | Context (272–320, opcional)`
- Trilho global recolhido com tooltip/acessibilidade; nome da organização e usuário em menu de contexto, não ocupando largura do histórico.
- Inbox com busca persistente, filtros compactos, avatar de fallback, nome, preview da última mensagem, horário e indicador de não lidas.
- Conversa central com cabeçalho contendo Avatar, nome, status e botão detalhes. Histórico com largura confortável e rolagem própria, sem fazer o compositor saltar.
- Contexto independente, recolhível e com dimensões sob controle do usuário; sua ausência libera espaço para a conversa.

### Desktop intermediário (1024–1439px)
- NavRail 56, Inbox 272–304, Conversation fluida; **detalhes abrem por Sheet** e nunca esmagam o compositor abaixo de largura funcional.
- Preservar área útil do chat em 1366×768 com a janela não maximizada. Redimensionamento usa `minmax(0,1fr)`, `min-width:0`, e eventualmente container queries, sem depender apenas de media queries globais.

### Tablet (720–1023px)
- Inbox 240–280 quando couber; detalhes em Sheet. A escolha lista/chat pode virar modo exclusivo em tamanhos estreitos.
- Nenhum painel flutuante permanente obscurece o histórico ou bloqueia o compositor.

### Mobile (<720px)
- **Tela Inbox:** cabeçalho, pesquisa/filtros, lista vertical. Barra inferior de 3 itens principais (Conversas, Contatos, Mais) com altura compacta e área de toque adequada. Logout, preferências, organização e demais destinos dentro de Mais/conta.
- **Tela Conversa:** navegação inferior global **oculta**; cabeçalho com voltar, avatar, nome, botão detalhes. Histórico ocupa espaço disponível até o compositor inferior. O botão Voltar retorna à Inbox com seu filtro/posição. Detalhes em Drawer/Sheet, não painel empilhado.
- **Teclado aberto:** usar altura dinâmica `100dvh`, `min-height:0`, `env(safe-area-inset-bottom)`; evitar `position:fixed` que sobreponha campos e a rolagem. Não ocultar mensagens atrás do campo nem recarregar histórico.

## 5. Compositor minimalista por plataforma
**Manter o mesmo modelo de envio atual** (`sendDraft`, `clientMessageId`, IME, limites, permissões, mídia sob autorização e UNKNOWN).

- **Desktop:** um contêiner de até duas linhas em repouso: textarea expansível (uma linha inicial) e rodapé compacto com anexar, voz, Negrito, Itálico, Tachado, Monoespaçado, emoji, ações adicionais por menu e Enviar à direita. Preferência de Enter/Shift+Enter em menu de opções (não um select persistente).
- **Mobile:** uma linha visual primária com `+` (abre ações: anexo, voz, formatação/preview), textarea e botão Enviar; emoji pode ficar junto ao campo se couber. Toolbar completa não fica sempre exposta, evitando 3–4 linhas. Durante gravação/anexo, faixa de prévia acima do campo, com ações de descartar/concluir.
- Em ambas: botões pequenos visualmente, alvos de toque acessíveis; ícones com tooltip/`aria-label`; Enviar desabilitado quando não há conteúdo; contagem exibida somente perto do limite; rascunho continua temporário por conta/organização/conversa.
- Formatação existente continua texto WhatsApp, sem HTML. O menu deve fechar com Escape, devolver foco corretamente e não acionar envio inadvertido por Enter.

## 6. Avatares/foto do contato
Primeira entrega: componente `Avatar` com `AvatarFallback` por iniciais/nome, usado em Inbox e header, permitindo foto futura.
Para **foto real do contato**, abrir demanda separada com contrato do Core: URL/bytes autorizados na Organization e permissões, TTL/cache adequado, limpeza ao trocar tenant. Nunca expor URL privada do Provider, nem inferir disponibilidade do WhatsApp Web. Se não existir foto, fallback permanece correto.

## 7. Estratégia de adoção shadcn/ui
**Compatibilidade:** React + Vite atuais são adequados. O repositório não tem Tailwind CSS/shadcn atualmente; adoção requer configuração explícita de Tailwind, variáveis e alias no Vite/tsconfig. Guia: https://ui.shadcn.com/docs/installation/vite .

Evitar `shadcn init` diretamente sobre produção sem isolamento/avaliação do CSS reset/Preflight, sobretudo pela folha global existente (~45 KB e regras antigas). Escolher componentes estritamente necessários, copiados em `src/components/ui`, com tokens mapeados:
- `Button`, `Input`, `Textarea`, `Separator`, `Avatar`, `Tooltip`
- `DropdownMenu` (preferência de envio, opções do contato), `Sheet` (detalhes e Mais), `Popover` (emojis), `Dialog`, `Tabs`, `Badge`, `Skeleton`.
- **Não** trocar de imediato o scroll/histórico/realtime pelo `ScrollArea` de um componente visual; manter a semântica e o elemento de rolagem atual até testes de `useMessageScroll`.
- Reusar `lucide-react` existente. Não exigir shadcn na API nem migrar o backend.

O shadcn/ui fornece **primitivos**, não resolve densidade automaticamente. Estabelecer variantes `size=compact`, `size=touch`, tokens de tipografia e espaçamento, com isolamento CSS/migração de estilos comprovada. Ver também https://ui.shadcn.com/docs/tailwind-v4 e https://ui.shadcn.com/docs/components/radix/avatar .

## 8. Telas a revisar
1. **Shell/nav:** desktop rail + mobile navegação curta/Mais, conta/organização, tooltips e acessos desabilitados segundo permissions.
2. **Inbox:** busca, filtros, tags, preview, status, avatares, lista com densidade e estados.
3. **Conversa:** cabeçalho, balões, mídia, status, carregamento/rolagem, detalhes em Sheet.
4. **Compositor:** toolbar adaptativa, prévia de anexos, voz, emoji, formatação e envio.
5. **Contatos:** lista/detalhe/formulários com campos densos e hierarquia.
6. **Equipe/permissões:** tabelas, accordion, buscas e confirmações; respeitar RBAC.
7. **Configurações/Provedores:** cards, estados, conectividade e diagnósticos sem novos privilégios.
8. **Autenticação/organizações:** login e seletor padronizados.
9. **Demais rotas/placeholders:** apenas componentes e layout, sem falsificar disponibilidade de funcionalidades.

## 9. Fases/PRs propostos (não executados)
- **PR A – Base visual (sem mudança de UX):** spike shadcn/Tailwind isolado, aliases, tokens, Button/Input/Avatar/Tooltip; testar interferência com CSS e telas existentes.
- **PR B – Shell responsivo:** NavRail, header, mobile bottom bar só no contexto raiz e Mais/Conta; preservar rotas/permissões.
- **PR C – Atendimento:** Inbox, header/avatares fallback, layout fluido, painel de contexto em Sheet; manter histórico e scroll.
- **PR D – Compositor compacto:** reaproveitar lógica atual; menu de ferramentas e preferência, layouts distintos mobile/desktop, acessibilidade.
- **PR E – Telas administrativas:** contatos, equipe/permissões, configurações, providers, estados/erros em componentes compartilhados.
- **PR F – Harmonização/remoção controlada:** eliminar CSS duplicado após regressões, acessibilidade e performance; marcar status só após homologação humana.

Cada PR deve manter o deploy independente/revertível. Não começar a reescrita de todas as telas em um único commit.

## 10. Critérios de aceite e regressão
- Inspecionar em notebook real: **320×568, 390×844, 768×1024, 1024×768, 1366×768 e 1920×1080**; zoom de navegador 100% e 125–200%, teclado virtual e orientação paisagem.
- Em modo de conversa no mobile, barra global não rouba espaço do histórico. Compositor ocupa **1 linha primária** em repouso, expandindo só para texto/anexo ou ferramentas solicitadas.
- Em 1366×768, conversa, inbox e compositor cabem sem scroll horizontal global, sobreposição ou botões que vazam da tela. Sidebar e contexto não comprimem campo desnecessariamente.
- Seleção/caret de formatação, Unicode, emoji, Enter/Shift+Enter, IME e rascunhos preservados; estados `UNKNOWN` não reenviados automaticamente.
- Autorização permanece no Core; esconder controle visual não concede/revoga permissão. Troca de usuário/organização remove conteúdo do tenant anterior.
- Mensagens/áudios/vídeos não remontam ao recebimento de eventos; `useMessageScroll`, `MediaTransfers`, Blob URL/leases, lightbox, foco, visualização/legendas e visibilidade continuam válidos.
- CI: ESLint, TypeScript, Vitest/integration, build, testes de DOM e CSS. **Sem browser gráfico ou Playwright no Homelab**, conforme `AGENTS.md`.
- Homologação visual manual documentada pelo usuário no notebook após deploy controlado. A proposta não representa UI publicada.

## Decisão pendente
Confirmar direção visual/densidade antes dos PRs funcionais. Recomenda-se aprovar a **hierarquia proposta e a adoção incremental de shadcn**. Os valores de tokens são candidatos a serem ajustados na inspeção dos primeiros protótipos; o serviço atual segue intacto.
