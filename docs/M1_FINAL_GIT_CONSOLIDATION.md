# Consolidação Git final M1 — wapphub-chat

Consulta/fetch: 2026-10-08T21:20:07.303195+00:00. GitHub consultado pelo conector em modo GET; PR [3](https://github.com/uillaneduardo/wapphub-chat/pull/3) continua aberto/draft, base main, 2 commits, 2 arquivos documentais, mergeable=true contra a main atual. É o único PR aberto retornado para este repositório.

## Fotografia anterior à auditoria

- Branch: `feat/m1-contacts-conversation-creation`, árvore limpa.
- HEAD e docs pós-deploy: `4997d19b330c9de5b997fd37ce9efc4cd3527776`.
- main local: `90722675535746384905e321f989625272d56005`.
- origin/main após fetch: `90722675535746384905e321f989625272d56005`; iguais, nenhum commit main remoto faltante.
- Produção homologada: `6b04e653d03fa5b06aafad205b9c760072c01fd0`; não presumir que main a contém.
- Branch preparada: `integration/m1-accepted-20261008`, criada sem cherry-pick/rebase/merge a partir do HEAD acima; alterações desta auditoria somente docs.

## Branches e ancestralidade

Contagens abaixo são antes dos commits desta auditoria. Main-only/ref-only comparam com origin/main. Incluída significa tip ancestral do HEAD homologado + docs; refs remotas disponíveis como objetos locais após fetch podem não ser ancestrais de nenhuma branch local.

| Ref | SHA completo | main-only | ref-only | Incluída |
| --- | --- | --- | --- | --- |
| `docs/m1-audit-m2-preparation-20261008` | `6b3026623417a89669b6c0e5d197f00268437496` | 0 | 11 | sim |
| `docs/p0-production-deploy-20261008` | `6cdec1660546bed99edbfef07fbd391c166dd0fb` | 0 | 13 | sim |
| `docs/p1-production-deploy-20261008` | `fb199b2c08cb9a825984266ca569342b701aedc9` | 0 | 17 | sim |
| `feat/m1-chat-ui` | `6092a0961f6d0ed6a4bc9899cce51ca8e45149fe` | 3 | 0 | sim |
| `feat/m1-contacts-conversation-creation` | `4997d19b330c9de5b997fd37ce9efc4cd3527776` | 0 | 20 | sim |
| `feat/m1-demo-provider-ui` | `2d582682ca135f090fe6a184fb1b1802b11c1217` | 0 | 2 | sim |
| `feat/m1-ui-polish` | `216c384bfd4ea10ef90ad8d26f322f3a6f93693b` | 0 | 4 | sim |
| `feat/m1-ui-polish-3` | `e0fbec0c759c9f3260a6f37474da948655dbc20a` | 0 | 8 | sim |
| `fix/m1-chat-scroll-composer` | `24dedb92253b3c00d0e7087a5294fd6ef9b466a1` | 0 | 6 | sim |
| `fix/m1-lucide-navigation` | `3e234522673023a64f6bd7c827ca1adef35aaa0b` | 0 | 10 | sim |
| `fix/m1-message-preview-authorization` | `d93efc576bd560fcbab0146343fb98bbbc1d0b69` | 0 | 12 | sim |
| `fix/m1-realtime-consistency` | `6bbc1c474f6f5b8f321bd957f8e904bb9016147a` | 0 | 16 | sim |
| `main` | `90722675535746384905e321f989625272d56005` | 0 | 0 | sim |
| `origin` | `90722675535746384905e321f989625272d56005` | 0 | 0 | sim |
| `origin/docs/align-m1-core` | `01be0c62b3960cede55595ca0f642209d9a64de9` | 7 | 0 | sim |
| `origin/docs/reconcile-m1-production-20261008` | `36b788e8f2951f419824e1613cbfed05c947e295` | 0 | 2 | não |
| `origin/feat/m1-chat-ui` | `6092a0961f6d0ed6a4bc9899cce51ca8e45149fe` | 3 | 0 | sim |
| `origin/main` | `90722675535746384905e321f989625272d56005` | 0 | 0 | sim |

## Commits locais ainda não publicados em nenhuma ref origin

- `4997d19b330c9de5b997fd37ce9efc4cd3527776 docs(deploy): record M1 contacts production publication`
- `6b04e653d03fa5b06aafad205b9c760072c01fd0 docs(m1): record contacts and conversation acceptance evidence`
- `be151d7e430d649fe8b2ce26b875e7b1fbfe334d feat(m1): add contact management and manual conversation creation`
- `fb199b2c08cb9a825984266ca569342b701aedc9 docs(deploy): record frontend-only P1 publication and rollback`
- `6bbc1c474f6f5b8f321bd957f8e904bb9016147a docs(realtime): record P1 guarantees, regression evidence and rollout plan`
- `cc61ef02b31e39a90a794f18eb3dd07fe14fc663 fix(realtime): guard pagination and serialize Demo reconciliation`
- `dc70f6a4f1b8eebe0b3e5d37502a5264547833c4 fix(realtime): confirm REST reconciliation before advancing checkpoints`
- `6cdec1660546bed99edbfef07fbd391c166dd0fb docs(deploy): record controlled P0 publication and safety backup`
- `d93efc576bd560fcbab0146343fb98bbbc1d0b69 fix(m1): hide inbox previews without message read permission`
- `6b3026623417a89669b6c0e5d197f00268437496 docs(m1): reconcile Chat production, shared UI and acceptance gaps`
- `3e234522673023a64f6bd7c827ca1adef35aaa0b docs: record Lucide navigation validation and manual review`
- `028ab8f7543d73b9e51f7824ee2c19733d57d225 fix(ui): standardize navigation icons with Lucide React`
- `e0fbec0c759c9f3260a6f37474da948655dbc20a docs(m1): document UI preferences and permanent manual visual policy`
- `5ff30eec4994afb0c4e436a5a5ea603b1afec965 feat(m1): add collapsible navigation, context resizing and send preferences`
- `24dedb92253b3c00d0e7087a5294fd6ef9b466a1 docs(m1): describe chat scroll policy and manual acceptance`
- `1bdafae104279e2039f352d082b806bb2560011a fix(m1): bound chat scrolling and refine disabled composer tools`
- `216c384bfd4ea10ef90ad8d26f322f3a6f93693b docs(m1): record UI polish validation and local browser procedure`
- `3060ea6deacd6e31e361c61d03ea3d50f0b2a0fa feat(m1): polish user selection, context layout and text composer`
- `2d582682ca135f090fe6a184fb1b1802b11c1217 docs(m1): add visual homologation runbook`
- `b1b4c31ad91bac29d68188acb824de1931da6aaf feat(m1): add demo provider settings and simulator`

## Commits remotos sem ancestralidade em branches locais

- `36b788e8f2951f419824e1613cbfed05c947e295 docs: sinalizar status histórico e apontar reconciliação M1`
- `97db0cbdcb317ba023fba95d6a9be10c8270e66a docs: registrar deploys e homologações Chat M1`

## Histórico de merges preservado

- `899c5db9e2a25b4aaccc60118a5e0300a468d59c Merge pull request #2 from uillaneduardo/feat/m1-chat-ui`
- `70d21497c8cd28d54a29d0fa15cb913a94d74e12 merge: align M1 documentation with Core`

## Estratégia escolhida: branch consolidada com história existente (B)

A linha homologada é descendente linear da main remota (Core 10 commits, Chat 20 commits antes desta auditoria). Nenhum commit da main remota ficou de fora. Criar branch a partir do tip pós-deploy conserva commits originais e inclui docs posteriores; não copia/squasha/reordena commits. É mais seguro que vários PRs de branches históricas que sobrepõem ancestrais e exigiriam sincronização documental repetida. Revisão pode ser dividida em ranges funcionais, mantendo um PR consolidado por repo e merge commit final, somente após autorização.

Opção A histórica é possível, mas muitos tips incluem docs antigos de status e builds intermediários. Opção de cherry-pick/rebase descartada por duplicar hashes ou alterar a linha homologada. Branch consolidada não significa incorporar todas as branches locais.

Revisão Core por grupos: Demo 81a8103/72d05aa; reconciliação e planejamento documental preexistente e0ff500/99ef04b; P0 cbaf50c/8a7c432; contatos e32ed65/54f3665/a45fb33; deploy c8faef3; aceite atual. 99ef04b é plano M2 histórico, não implementação M2; preservá-lo não autoriza execução. Revisão Chat por grupos: Demo b1b4c31/2d58268; UI/scroll/preferences/Lucide até3e23452; auditoria6b30266; P0 d93efc5/6cdec16; P1 dc70f6a/cc61ef0/6bbc1c4/fb199b2; contatos be151d7/6b04e65; deploy4997d19; aceite atual.

Core `chore/admin-bootstrap-cli` / 15dab117b814cdbc7729ca550d6e64fe03defd74 é separado, não ancestral da entrega, modifica scripts/add-demo-members.ts. **Não incorporar** à branch consolidada, não executar provisionador, não apagar branch. Demais branches históricas funcionais são ancestrais e já estão preservadas. Não deletar automaticamente após futura integração.

## PR documental divergente: integração correspondente interrompida

PR #7 Core e #3 Chat têm base main e conteúdo de versões antigas. As notas remotas foram incorporadas como conteúdo com complemento local, não como commits; por isso os dois hashes de cada draft não são ancestrais da entrega. `git merge-tree --write-tree HEAD origin/docs/reconcile-m1-production-20261008` foi usado apenas para análise, sem merge/index/worktree alterados: conflitos add/add em docs/M1_PRODUCTION_RECONCILIATION_20261008.md e content em docs/STATUS.md nos dois repos. mergeable=true do GitHub refere-se à main antiga, não à entrega consolidada.

Conteúdo original preservado: nota local inclui íntegra do arquivo remoto e complemento posterior; evidência comparada por diff. Nenhuma versão mais recente foi sobrescrita. **Não integrar drafts diretamente**. Futuro tratamento precisa revisão: preferencialmente considerar os drafts substituídos pela consolidação e encerrá-los apenas com autorização; se exigida preservação de seus hashes na main, resolver merge documental em branch separada mediante autorização, conferindo o diff e preservando ambas as notas históricas. Não executar esse merge nesta tarefa.

## Sequência futura (nenhuma operação remota realizada)

1. Rever esta branch, evidências e limites; confirmar diff funcional idêntico à produção, sem provisionador ou M2 funcional.
2. Após autorização de push/PR, publicar branch nova sem force. Não publicar automaticamente branches antigas ou main local.
3. PR consolidado Core e Chat, revisão por ranges acima, validar ancestralidade; não requer novo deploy ou suites se apenas consolidação documental equivalentes. Qualquer resolução funcional nova exige validação direcionada.
4. Resolver destino dos drafts documentais sem perder conteúdo; até decisão, mantê-los abertos/draft.
5. Integração autorizada preservando todos os commits (merge commit, sem squash/rebase destrutivo). Não realizar merge nesta execução.
6. Fetch de confirmação: commits homologados devem ser ancestrais de origin/main; conferir ausência de diffs funcionais inesperados; registrar encerramento administrativo.

Antes de futuro merge, verificar automação externa: ausência de workflows versionados não prova ausência de deploy por webhook/serviço externo. Os dois SQLs Demo que aparecem no diff contra main já são históricos/aplicados; integrar Git não autoriza reaplicação de migrations.

Push, criação/edição/encerramento de PRs e merge exigem autorização posterior. Nenhuma infraestrutura, código ou banco alterado; nenhuma suite repetida. Evidência completa em evidence/M1_FINAL_20261008/git-inventory.json e github-pr.json. Inventário anterior GIT_PRODUCTION_INVENTORY_20261008.md permanece histórico.
