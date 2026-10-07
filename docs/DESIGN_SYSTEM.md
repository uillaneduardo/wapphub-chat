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

## Evitar

- excesso de cards;
- cores decorativas desnecessárias;
- sombras fortes;
- controles inconsistentes;
- CSS específico por cliente;
- hardcode de cor de marca em componentes.
