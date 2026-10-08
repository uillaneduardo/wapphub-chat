# Reconciliação de produção Chat M1 — 2026-10-08

> **Evidências de execução e homologação reportadas pelo operador/Codex.** Este documento não significa que os commits locais foram enviados ao GitHub. A branch `main` remota ainda pode conter versões anteriores do frontend.

## Linha de publicação reportada

| Etapa | Commit Chat | Imagem reportada |
|---|---|---|
| Demo Provider UI | `2d582682ca135f090fe6a184fb1b1802b11c1217` | `wapphub-chat:demo-2d58268` |
| UI Polish | `216c384bfd4ea10ef90ad8d26f322f3a6f93693b` | `wapphub-chat:ui-polish-216c384` |
| Scroll & Composer | `24dedb92253b3c00d0e7087a5294fd6ef9b466a1` | `wapphub-chat:scroll-composer-24dedb9` |
| UI Polish 3 | `e0fbec0c759c9f3260a6f37474da948655dbc20a` | `wapphub-chat:ui-polish-3-e0fbec0` |
| Lucide Navigation | `3e234522673023a64f6bd7c827ca1adef35aaa0b` | `wapphub-chat:lucide-nav-3e23452` |

A última imagem foi reportada healthy, com login, SPA, JS/CSS HTTP 200, hashes do bundle conferidos e API readiness 200. O operador confirmou funcionamento visual da navegação Lucide em produção. Nos deploys visuais, Core/Worker/MariaDB/Redis foram reportados healthy e sem reinícios.

## Funcionalidades reportadas e observações

- Chat M1: autenticação, organização, conversas, mensagens texto, realtime, atribuição, transferência, tags, notas e arquivamento; verificar evidências detalhadas no ambiente local.
- Demo Provider: interface de simulação de contato externo e envio/recebimento de mensagens de demonstração, **não** integração real Meta.
- UI: menu com ícones Lucide via `AppIcon`, recolhimento, tooltips/flyout, destaque de rota, logout visível, painel direito redimensionável, rolagem interna e autoscroll inteligente, compositor com atalhos Enter/Shift+Enter compartilhados entre Chat/Demo.
- Última entrega Lucide: `lucide-react@1.53.0`, 86 testes aprovados, lint/typecheck/build aprovados conforme relatório; aumento informado do bundle gzip de 2.036 bytes.
- Não foi executado navegador, Playwright visual, Chromium, Firefox ou screenshot no Homelab. A política é homologação manual no notebook após deploy autorizado.
- Homologação manual reportada para rolagem/compositor e navegação Lucide. Testes de touch, leitor de tela e cobertura visual completa nas cinco resoluções **não** foram confirmados.

## Pendências antes do M2

1. Conciliar branches locais e remotas, registrar hashes e integrar commits publicados via PRs revisados, sem apagar histórico.
2. Atualizar `docs/STATUS.md`, `README.md` e docs operacionais após conferir o código local real; remover referências a imagem antiga e à exigência de navegador headless no Homelab.
3. Auditar reuso entre Chat/Demo, incluindo compositor, hooks e identidade/autorização de envio, sem refatoração automática.
4. Confirmar critérios finais de aceite M1; depois iniciar planejamento do M2 do Core, sem antecipar Meta/Mídia.

## Relatórios locais de deploy

- `/home/uillan/homelab/deploy-records/wapphub-chat/20261008-scroll-composer-24dedb9/REPORT.md`
- `/home/uillan/homelab/deploy-records/wapphub-chat/20261008-ui-polish-3-e0fbec0/REPORT.md`
- `/home/uillan/homelab/deploy-records/wapphub-chat/20261008-lucide-nav-3e23452/REPORT.md`
