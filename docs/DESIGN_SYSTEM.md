# Design System do WappHub Chat

## Direção visual

Interface neutra, operacional e discreta.

Base:
- branco;
- tons de cinza;
- texto escuro;
- bordas leves;
- poucas sombras;
- sem gradientes decorativos como padrão.

A cor de destaque pode ser personalizada por Organization.

## Tokens

Tokens mínimos:

```
--background
--surface
--surface-muted
--border
--text
--text-muted

--accent
--accent-hover
--accent-contrast

--success
--warning
--danger
```

## Personalização

A Organization pode definir `accentColor`.

Uso:
- ações primárias;
- seleção ativa;
- links;
- focus;
- indicadores selecionados.

Não usar accentColor para pintar toda a interface.

## Contraste

O sistema deve calcular/selecionar `accentContrast` apropriado e validar legibilidade.

Personalização nunca pode reduzir acessibilidade básica.

## Logo

Organization pode fornecer logo.

A marca do cliente aparece como contexto da operação, sem pressupor white-label total no MVP.

## Tema

MVP prioriza tema claro bem executado.

Tokens devem permitir tema escuro futuramente sem refazer componentes.

## Componentes

Componentes devem manter hierarquia consistente:
- sidebar;
- list item de conversa;
- header de conversa;
- composer;
- message bubble;
- badge/tag;
- menu;
- modal;
- toast;
- empty state;
- loading/skeleton;
- health/status indicator.
- cards de provedores, estado de ativação e conversa simulada em duas colunas;
  em viewport estreito, seletor de contatos vira faixa horizontal e o histórico
  mantém rolagem própria.

## Responsividade revisada no branch Demo

O shell e a área de atendimento usam limites flexíveis de altura/largura para
preservar rolagem da inbox e do histórico em resoluções baixas. Dropdowns e
compositores mantêm foco visível e controles touch. A validação automatizada
disponível é CSS/build e Testing Library; inspeção visual em browser real segue
pendente neste ambiente.

## Evitar

- excesso de cards;
- cores decorativas desnecessárias;
- sombras fortes;
- controles inconsistentes;
- CSS específico por cliente;
- hardcode de cor de marca em componentes.

## Atendimento — rolagem e compositor

Na rota de conversas, `chat-app-shell` limita a altura à viewport dinâmica e o
main reserva linhas para status realtime e workspace. Histórico fica entre o
cabeçalho e o compositor, com rolagem vertical própria e foco visível por teclado.
Nas resoluções menores, detalhes preservam até 40% do corpo disponível e também
rolam. A navegação mobile mantém sua reserva de 62px; outras rotas não herdam a
restrição de altura do atendimento. O body não recebe bloqueio de overflow.

Ferramentas do compositor usam SVGs de 20px, viewBox de 24px, traço de 1.8 e
`currentColor`. Áreas de 40px (44px no mobile), espaçamento de 4px, borda e fundo
com tokens existentes. Wrappers focáveis anunciam indisponibilidade e descrevem
os botões nativamente desabilitados. O tooltip fica acima da barra e limitado à
largura dela. Ferramentas/Enviar quebram linha quando necessário, com envio
alinhado à direita. O indicador de novas mensagens usa superfície discreta e
um link de ação para voltar ao final, sem sobrepor mensagens ou campo de texto.

Validação desta revisão é unitária/integração em jsdom, sem renderização de layout.
Homologação visual manual será feita no notebook após deploy autorizado; não
executar navegador ou screenshots automatizados no Homelab.

## M1 UI Polish 3

Navegação usa ícones SVG locais da mesma convenção do compositor (20px/24px,
traço 1.8, currentColor). Sidebar de 232px ou 64px, sem transição de largura;
Provedores é subitem de Configurações. Compacto oferece tooltip e flyout com foco,
Escape e navegação por teclado. Logout “Sair da conta” tem ícone próprio e fica
no rodapé; mobile conserva a barra de 62px com saída acessível.

Contexto inicia em 300px; divisória de 8px permite Pointer Events/teclado, limites
240–480px e mínimo de 320px para histórico. Se não cabe ou viewport ≤1050px,
detalhes ficam empilhados e não há divisória ativa. Restauro usa 300px sujeito
a espaço disponível. Preferências de menu, largura e teclado são locais por conta.

Select compacto abaixo de Enviar alterna Enter/Shift+Enter nos compositores
principal e Demo, sem habilitar recursos de mídia. Estados, cores, bordas e foco
reutilizam tokens. Critérios completos e limitações: `M1_UI_POLISH_3.md`.
A política permanente proíbe browser/testes visuais no Homelab; homologação manual
pelo usuário no notebook após publicação autorizada.
