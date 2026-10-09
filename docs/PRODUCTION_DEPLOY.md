# Deploy de produção

> Atualização de aceite final: o usuário confirmou nove cenários finais M1, além de cinco P0 e sete P1. **Homologação funcional declarada concluída**, não executada pelo Codex. [Aceite e limites](M1_FINAL_ACCEPTANCE.md). Pendência administrativa: integração Git, sem novo deploy. Os resultados/pendências abaixo registram o momento original da publicação/implementação.

> Produção atual — 2026-10-08, 18:00 Recife: M1 contatos/conversas publicado.
> Core/API/Worker `a45fb33` (`wapphub-core:m1-contacts-a45fb33`), Chat `6b04e65`
> (`wapphub-chat:m1-contacts-6b04e65`). Todos healthy, health/readiness/HTTP/assets aprovados.
> 224 testes anteriores reaproveitados; sem migrations. MariaDB/Redis preservados.
> Homologação dos novos fluxos PENDENTE; M1 não formalmente encerrado.
> [Registro e contingência](DEPLOY_M1_CONTACTS_20261008.md). Notas abaixo são histórico.


> P1 publicado em 2026-10-08: Chat `6bbc1c474f6f5b8f321bd957f8e904bb9016147a`,
> imagem `wapphub-chat:p1-realtime-6bbc1c4`, healthy. HTTP/SPA/assets/hashes aprovados.
> Core/API/Worker permanecem P0 cbaf50c; MariaDB/Redis preservados.
> 129 testes anteriores reaproveitados, sem repetição. Homologação P1 manual pendente.
> [Registro da publicação](DEPLOY_P1_20261008.md). Demais aceites M1 permanecem.

## Registro anterior / procedimentos

> Atualização de produção — 2026-10-08, 15:00 Recife: P0 publicado em Core/API/Worker
> `cbaf50c5eedd6731e1ca3a674c1d9b0b20005a7d` (`wapphub-core:p0-preview-cbaf50c`)
> e Chat `d93efc576bd560fcbab0146343fb98bbbc1d0b69` (`wapphub-chat:p0-preview-d93efc5`).
> Todos os cinco serviços healthy; HTTP, assets e integridade aprovados.
> Validação funcional isolada anterior reaproveitada: 58 Core + 91 Chat; não reexecutada.
> Homologação visual desta publicação pendente. A2 e demais aceites M1 permanecem;
> M1 não formalmente encerrado. M2/P1 não iniciados.
> [Registro de publicação e contingência](DEPLOY_P0_20261008.md).

O frontend é compilado pelo Dockerfile existente e servido pelo Nginx na porta
interna 3000, com fallback SPA. O serviço usa a rede externa cloudflare_ingress;
não publica porta no host nem acessa banco/Redis. Configuração API de build:
https://api.wapphub.com.br. Nenhum segredo integra o bundle.

A main não representa necessariamente produção. Antes de qualquer publicação,
confirmar revisão aprovada, validações e autorização específica. Construir imagem
versionada pelo Dockerfile existente, preservando configuração de API e imagem anterior.
Após build e gates, atualizar somente o serviço, com dependências preservadas:

```sh
CHAT_IMAGE_TAG=<tag-aprovada-construida> docker compose -f compose.yml up -d --no-deps --no-build --pull never --wait --wait-timeout 60 wapphub-chat
```

A publicação P0 utilizou CHAT_IMAGE_TAG=p0-preview-d93efc5. O default Compose não
foi alterado; informar explicitamente a tag em operações futuras.

Rollback frontend somente se seguro, mantendo Core P0 corrigido saudável:

```sh
CHAT_IMAGE_TAG=p0-preview-d93efc5 docker compose -f compose.yml up -d --no-deps --no-build --pull never --wait --wait-timeout 60 wapphub-chat
```

Preservar imagens/volumes. Verificar health, login/SPA, JS/CSS e hashes do bundle,
readiness API e logs. Não executar migrations, suites mutáveis de produção ou
browsers no Homelab. Homologação manual pelo notebook após publicação autorizada.
Core não pode retornar automaticamente ao artefato vulnerável demo-72d05aa.
