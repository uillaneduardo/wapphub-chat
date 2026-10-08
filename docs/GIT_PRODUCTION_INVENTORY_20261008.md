# Inventário Git e produção — 2026-10-08

Captura: 2026-10-08T17:14:38.757463+00:00. Inspeção inicial com árvore limpa em `fix/m1-lucide-navigation`,
HEAD `3e234522673023a64f6bd7c827ca1adef35aaa0b`. Após fetch de origin, foi criada somente a branch documental
`docs/m1-audit-m2-preparation-20261008`, baseada nesse HEAD publicado.
Nenhum reset, clean, rebase, merge, push ou mudança de produção.

## Estados que não devem ser confundidos

| Referência | Commit | Interpretação |
| --- | --- | --- |
| main local | `90722675535746384905e321f989625272d56005` | Código integrado localmente |
| origin/main após fetch | `90722675535746384905e321f989625272d56005` | Código integrado no GitHub |
| Produção e branch funcional original | `3e234522673023a64f6bd7c827ca1adef35aaa0b` | Código efetivamente executado |
| origin/docs/reconcile-m1-production-20261008 | `36b788e8f2951f419824e1613cbfed05c947e295` | Nota operacional remota, não código de produção |

main local coincide com origin/main. Produção é descendente de origin/main;
nenhuma divergência de ancestralidade nas linhas publicadas.

## Branches e refs preservadas

```text
* docs/m1-audit-m2-preparation-20261008                3e23452 docs: record Lucide navigation validation and manual review
  feat/m1-chat-ui                                      6092a09 [origin/feat/m1-chat-ui] feat(chat): select active members for assignment
  feat/m1-demo-provider-ui                             2d58268 [origin/main: ahead 2] docs(m1): add visual homologation runbook
  feat/m1-ui-polish                                    216c384 docs(m1): record UI polish validation and local browser procedure
  feat/m1-ui-polish-3                                  e0fbec0 docs(m1): document UI preferences and permanent manual visual policy
  fix/m1-chat-scroll-composer                          24dedb9 docs(m1): describe chat scroll policy and manual acceptance
  fix/m1-lucide-navigation                             3e23452 docs: record Lucide navigation validation and manual review
  main                                                 9072267 [origin/main] docs(m1): record chat production rollout
  remotes/origin/HEAD                                  -> origin/main
  remotes/origin/docs/align-m1-core                    01be0c6 docs: mark media as post-M1 scope
  remotes/origin/docs/reconcile-m1-production-20261008 36b788e docs: sinalizar status histórico e apontar reconciliação M1
  remotes/origin/feat/m1-chat-ui                       6092a09 feat(chat): select active members for assignment
  remotes/origin/main                                  9072267 docs(m1): record chat production rollout
```

## Commits publicados ainda fora da main

```text
b1b4c31ad91bac29d68188acb824de1931da6aaf feat(m1): add demo provider settings and simulator
2d582682ca135f090fe6a184fb1b1802b11c1217 docs(m1): add visual homologation runbook
3060ea6deacd6e31e361c61d03ea3d50f0b2a0fa feat(m1): polish user selection, context layout and text composer
216c384bfd4ea10ef90ad8d26f322f3a6f93693b docs(m1): record UI polish validation and local browser procedure
1bdafae104279e2039f352d082b806bb2560011a fix(m1): bound chat scrolling and refine disabled composer tools
24dedb92253b3c00d0e7087a5294fd6ef9b466a1 docs(m1): describe chat scroll policy and manual acceptance
5ff30eec4994afb0c4e436a5a5ea603b1afec965 feat(m1): add collapsible navigation, context resizing and send preferences
e0fbec0c759c9f3260a6f37474da948655dbc20a docs(m1): document UI preferences and permanent manual visual policy
028ab8f7543d73b9e51f7824ee2c19733d57d225 fix(ui): standardize navigation icons with Lucide React
3e234522673023a64f6bd7c827ca1adef35aaa0b docs: record Lucide navigation validation and manual review
```

## Commits locais não alcançáveis por nenhum remoto (antes dos commits desta auditoria)

```text
3e234522673023a64f6bd7c827ca1adef35aaa0b docs: record Lucide navigation validation and manual review
028ab8f7543d73b9e51f7824ee2c19733d57d225 fix(ui): standardize navigation icons with Lucide React
e0fbec0c759c9f3260a6f37474da948655dbc20a docs(m1): document UI preferences and permanent manual visual policy
5ff30eec4994afb0c4e436a5a5ea603b1afec965 feat(m1): add collapsible navigation, context resizing and send preferences
24dedb92253b3c00d0e7087a5294fd6ef9b466a1 docs(m1): describe chat scroll policy and manual acceptance
1bdafae104279e2039f352d082b806bb2560011a fix(m1): bound chat scrolling and refine disabled composer tools
216c384bfd4ea10ef90ad8d26f322f3a6f93693b docs(m1): record UI polish validation and local browser procedure
3060ea6deacd6e31e361c61d03ea3d50f0b2a0fa feat(m1): polish user selection, context layout and text composer
2d582682ca135f090fe6a184fb1b1802b11c1217 docs(m1): add visual homologation runbook
b1b4c31ad91bac29d68188acb824de1931da6aaf feat(m1): add demo provider settings and simulator
```

Os commits documentais desta auditoria acrescentam-se a essa lista e serão
identificados no relatório da entrega. Estão exclusivamente locais.

## PRs consultados no GitHub

Consulta somente leitura via API GitHub `/repos/uillaneduardo/wapphub-chat/pulls?state=all`.

- [PR #3](https://github.com/uillaneduardo/wapphub-chat/pull/3): docs: reconciliar evidências M1 de produção antes do M2; estado open, draft=True, merged_at=None; `docs/reconcile-m1-production-20261008` → `main`.
- [PR #2](https://github.com/uillaneduardo/wapphub-chat/pull/2): feat(m1): implement operational chat frontend; estado closed, draft=False, merged_at=2026-10-08T04:31:12Z; `feat/m1-chat-ui` → `main`.

O [PR #3](https://github.com/uillaneduardo/wapphub-chat/pull/3) continua
em rascunho, sem merge. Seus dois commits documentais foram lidos por Git fetch;
a nota `M1_PRODUCTION_RECONCILIATION_20261008.md` é incorporada integralmente com
um complemento de auditoria, sem perder o texto/histórico remoto. O aviso de
STATUS foi incorporado à reconciliação atual, preservando as evidências anteriores.
Nenhuma versão funcional remota mais recente foi sobrescrita.

## Commits remotos documentais ainda fora da main

```text
97db0cbdcb317ba023fba95d6a9be10c8270e66a docs: registrar deploys e homologações Chat M1
36b788e8f2951f419824e1613cbfed05c947e295 docs: sinalizar status histórico e apontar reconciliação M1
```

Estão no PR draft, não na ancestralidade funcional de produção. Incorporar o
conteúdo não equivale a mesclar esses commits; eles permanecem preservados no remoto.

## Produção confirmada em leitura

| Container | ID | Imagem | ID exato da imagem | Iniciado em UTC | Saúde |
| --- | --- | --- | --- | --- | --- |
| wapphub-core-wapphub-core-api-1 | `f3bc5488ef616608972db127cefd3c755c7c2f2fa0a27538532f2a305a4f0af0` | `wapphub-core:demo-72d05aa` | `sha256:f0a209caf8ebd44db7a7e088d8e60f5a9d0c4f8e92feefeae719ee4bebf0cd26` | 2026-10-08T14:35:05.456211507Z | healthy |
| wapphub-core-wapphub-core-worker-1 | `22e777fc13d7dc809a72633001935ccc9edf31148950296972a73617717dde79` | `wapphub-core:demo-72d05aa` | `sha256:f0a209caf8ebd44db7a7e088d8e60f5a9d0c4f8e92feefeae719ee4bebf0cd26` | 2026-10-08T14:35:05.449518608Z | healthy |
| wapphub-core-wapphub-db-1 | `65750f142703a60e3310905a9cc854d12a7733442f026577f4a232dbc44eafc8` | `mariadb:11.4` | `sha256:611a2fcc5fa7c6ceb8644c6f74b25ede004ff6c3a6b38c8f8c23d3bbf6c26430` | 2026-10-07T23:52:48.955973259Z | healthy |
| wapphub-core-wapphub-redis-1 | `1ec5cdfb29de467a5d520ce32150431203c2a85cbd210d18f264a16a7f99e6e8` | `redis:7.4-alpine` | `sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf` | 2026-10-07T23:52:48.942135077Z | healthy |
| wapphub-chat-wapphub-chat-1 | `0cd29109e301e42b2ce55ee2b72183b81c970ca294d50813e15f0b4c07bc8d57` | `wapphub-chat:lucide-nav-3e23452` | `sha256:c572bc80bca741cca297bf53e23a624230bf0bd7c27a5c83d66a2315628a92bd` | 2026-10-08T16:59:54.290121127Z | healthy |

Core API/Worker usam compose.yml do Core + `/tmp/wapphub-core-demo-override.yml`;
MariaDB/Redis usam compose.yml do Core. Chat usa compose.yml do Chat com tag
`CHAT_IMAGE_TAG=lucide-nav-3e23452`. Arquivos não foram editados. O override
Core em /tmp é uma dependência operacional frágil: não assumir que o Compose
base/default representa a imagem corrente. Registrar/persistir operacionalmente
esse override é uma ação futura sujeita à autorização de infraestrutura.

Core não tem label OCI de revisão: a revisão foi confirmada comparando SHA-256
em 37 arquivos versionados (`src`, `prisma`, `scripts`, package/lock e OpenAPI)
presentes na imagem de API e Worker contra o commit 72d05aa, sem divergências.
Isso é evidência de conteúdo, não atestação criptográfica de build reproduzível.
Chat declara a revisão 3e23452 na label; bundle público confere byte a byte com
manifesto da imagem extraído no deploy. Image ID é o ID Docker local, não um
digest publicado em registry remoto.

API health/readiness e Chat login/rota profunda: HTTP 200. HTML/JS/CSS públicos
com hashes iguais ao manifesto do deploy Lucide. WEB_ORIGINS atual permite
somente https://chat.wapphub.com.br; descrições antigas de lista vazia são
históricas. Nenhuma sessão ou dado pessoal foi consultado.

## Migrations

Core main remota contém as quatro migrations de fundação/M1 interno. Branch
Demo e imagem publicada contêm seis. O Chat não tem migrations.
Tabela `_prisma_migrations` foi consultada somente por SELECT, sem comandos de
migração ou alterações de dados; seis concluídas, nenhuma com rollback.

| Migration | SHA-256 versionado = checksum de produção | Concluída UTC |
| --- | --- | --- |
| 202610070001_foundation | `f53cc87e37f192259ec2b57cb9a6e3c6b129aac1901ebc8b85c75611ab8dd647` | 2026-10-07T23:53:03.373Z |
| 202610070002_foundation_relations | `8d201a975b26ac4294edb0d7c1c8fc860ddf2be04a770ca3c4f1f9042062b0d9` | 2026-10-07T23:55:12.511Z |
| 20261008013000_m1_internal_chat | `928ba2caabd08948650bd6feba4cecfb885a84af0dabd1efed325961a6daff41` | 2026-10-08T02:27:49.992Z |
| 20261008014000_m1_transfer_audience | `e621754efc350ecb19d38ee6ce0bad249d397e1458df01438d561dceea3ffca6` | 2026-10-08T02:27:50.048Z |
| 20261008020000_demo_provider | `e5b55c69f6db12e4d9f304ea6f19ee1da05784a0f699d9791faaa187a4565f7b` | 2026-10-08T14:34:56.083Z |
| 20261008021000_demo_provider_rbac | `a1e99c8da3087bec54f60c92791224c0c1efdd5b8973418188a1c86e6f49ddaf` | 2026-10-08T14:34:56.107Z |

Não reescrever SQLs já aplicados. Confronto de checksums não substitui uma
inspeção integral de drift do schema físico; essa inspeção não foi executada.
Não há migration pendente entre os SQLs versionados nesta revisão e o ledger
consultado. O rollback de Core anterior ao Demo não é seguro após dados externos;
ver `DEMO_PROVIDER.md` do Core e registros de deploy.

## Divergências de documentação e de aceite

README/STATUS antigos subestimavam a produção, tratavam Demo como não publicado
e roster como não integrado. Foram corrigidos nesta branch documental.
main remota não inclui Demo nem as melhorias posteriores do Chat; não declarar
essas funções integradas só por estarem em produção. As homologações de mensagens,
Demo e melhorias visuais foram informadas pelo usuário e são evidência operacional,
sem inventar cobertura de touch/leitor de tela/cinco viewports ou fluxo multi-tenant.

A matriz e os achados em `M1_ARCHITECTURE_ACCEPTANCE_20261008.md` impedem o
encerramento formal do M1. Planejamento de M2 não implica implementação.
