# Integração Git proposta — sem execução remota

> Registro histórico intermediário preservado. Fotografia e estratégia atuais: [M1_FINAL_GIT_CONSOLIDATION.md](M1_FINAL_GIT_CONSOLIDATION.md), aceite: [M1_FINAL_ACCEPTANCE.md](M1_FINAL_ACCEPTANCE.md). Etapas P0/P1/contatos mencionadas como futuras abaixo já foram publicadas/homologadas.

Ver `GIT_PRODUCTION_INVENTORY_20261008.md` para refs completas. main local e
origin/main=9072267; produção=3e23452. Dez commits posteriores publicados estão
somente locais. PR documental #3 é draft, não os contém e não foi mesclado.

| Ordem | Branch existente / commits preservados | Base de revisão |
| --- | --- | --- |
| 1 | feat/m1-demo-provider-ui: b1b4c31,2d58268 | origin/main 9072267; depende de Demo Core 81a8103/72d05aa |
| 2 | feat/m1-ui-polish: 3060ea6,216c384 | ponta Demo UI |
| 3 | fix/m1-chat-scroll-composer: 1bdafae,24dedb9 | ponta UI polish |
| 4 | feat/m1-ui-polish-3: 5ff30ee,e0fbec0 | ponta scroll/composer |
| 5 | fix/m1-lucide-navigation: 028ab8f,3e23452 | ponta polish3 |
| 6 | documentação desta auditoria | ponta código revisado; reconciliar PR #3 |

Após autorização, enviar as branches existentes sem force push e abrir PRs
empilhados (base na branch anterior) para diffs de dois commits. Revisar dependências,
86 testes, lint/typecheck/build e contratos com Core; não exigir navegador no
Homelab. Usar merge commits para preservar SHAs originais, sem squash/rebase de
linhas já publicadas. Após cada integração, revisar base dos próximos PRs, fetch
e comparação de ancestry/diff, sem reset ou descarte. Conflitos documentais devem
preservar novas evidências e histórico. Integração Git por si só não requer deploy
nem reaplicar migrations; observar automações externas antes de merges autorizados.
Não há workflows versionados em .github nos repos auditados, mas isso não prova
inexistência de automações externas.

PR #3 (docs/reconcile-m1-production-20261008) deve continuar draft. Sua nota foi
incorporada integralmente com complemento; STATUS foi reconciliado sem perder o
histórico. Após integrar código, atualizar PR #3 ou substituí-lo por PR documental
revisado com referência cruzada, evitando aplicar o mesmo patch duas vezes.
Não fechar/mesclar automaticamente. A branch nova baseada em produção inclui
ancestralidade funcional pendente: não abrir PR direto na main chamando todo o
diff de “documentação”; use base na revisão funcional ou aguarde integração.

A1/P0 e A2/P1 descritos na auditoria devem ter PRs pequenos de correção/teste
antes do encerramento M1. Não incorporar correções silenciosamente a estes
commits documentais. Testes de repro em ambiente isolado; sem acesso mutável a
produção. Preservar branches antigas até `git merge-base --is-ancestor` confirmar
que commits estão no remoto e imagens/backups necessários estiverem registrados.
M2 nasce da main reconciliada e M1 corrigido/aceito, nunca da main antiga por
presunção. Toda operação de push/PR novo/merge/deploy exige autorização futura;
nenhuma delas foi executada nesta auditoria.
