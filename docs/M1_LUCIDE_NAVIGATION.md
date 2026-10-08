# Navegação com Lucide React

Base publicada: `e0fbec0c759c9f3260a6f37474da948655dbc20a`.
Branch: `fix/m1-lucide-navigation`. Entrega sem deploy, merge ou push.

## Biblioteca e componentes

Não havia dependência de biblioteca de ícones equivalente; a navegação usava
SVGs próprios em `Icon`. Foi adicionada `lucide-react@1.53.0` com npm, versão
exata no package.json e lockfile, sem atualizar outras versões de dependências.
[Documentação oficial](https://lucide.dev/guide/react/getting-started): imports
nomeados permitem tree shaking; não há importação dinâmica do catálogo.

`AppIcon` centraliza 11 imports explícitos, tamanho 22px, traço 2, currentColor,
`aria-hidden` e `focusable=false`. Os nomes acessíveis continuam nos controles.
`Sidebar` reutiliza esse componente no menu, no submenu e no flyout.
`Icon` conserva apenas o SVG de restauração do painel, sem modificar o desenho.
Compositor e lógica de redimensionamento não foram alterados.

| Item existente | Ícone oficial |
| --- | --- |
| Conversas | MessagesSquare |
| Contatos | ContactRound |
| Arquivos | FileText |
| Equipe | UsersRound |
| Tags | Tags |
| Configurações / Visão geral | Settings |
| Provedores | Plug |
| Recolher / Expandir menu | PanelLeftClose / PanelLeftOpen |
| Subitens | ChevronDown |
| Sair da conta | LogOut |

Rótulos, rotas, permissões e fluxo de logout preservados. Sidebar mantém 232px
expandida e 64px recolhida. Ícones não encolhem e permanecem alinhados e
centralizados pelas regras existentes. Botões de recolhimento passam a 44×44px;
links, saída, marca e flyout têm área mínima de 44px. Estados ativo, hover,
pressed, foco, tooltips e interação de teclado permanecem existentes.

## Validação

Lint, typecheck, 86 testes em 16 arquivos, build e diff check aprovados.
Testes em jsdom verificam os ícones Lucide, dimensões, traço e atributos
acessíveis; mantêm cobertura de permissões, rota ancestral ativa, recolhimento,
flyout/teclado, tooltips, mobile e logout. A suíte preserva regressões de envio,
IME, duplicação, Demo Provider, preferências e histórico.
Todos os 11 exports foram conferidos na versão instalada e compilados.

Build da base e build final realizados no mesmo ambiente:

| Artefato | Base (bytes) | Novo (bytes) | Diferença |
| --- | ---: | ---: | ---: |
| JavaScript | 325329 | 330561 | +5232 (1,61%) |
| JavaScript gzip | 101356 | 103392 | +2036 (2,01%) |
| CSS | 32910 | 32988 | +78 |
| CSS gzip | 6470 | 6485 | +15 |

O aumento é limitado aos ícones selecionados e à infraestrutura de renderização
Lucide; o catálogo completo não é incluído no bundle. Nenhuma dependência de
análise ou biblioteca de ícones adicional foi introduzida.

## Homologação e publicação futura

Homologação visual manual pendente, sem navegador ou screenshot no Homelab.
Após autorização específica de deploy, publicar somente o frontend com imagem
versionada e preservar a imagem anterior para rollback. Não alterar backend,
contratos, banco, serviços ou infraestrutura.

No notebook, revisar 1920×1080, 1366×768, 1024×768, 768×1024 e 390×844:
menu expandido/recolhido; ícones e alinhamento; áreas clicáveis; tooltips por
hover/foco; hierarquia e rota ativa; flyout (setas, Tab, Escape); permissões;
logout; navegação mobile e ausência de overflow indevido. Confirmar que histórico,
compositor e divisória mantêm o comportamento homologado. jsdom não mede layout
real; risco residual é alinhamento/encaixe visual, especialmente em telas pequenas.
