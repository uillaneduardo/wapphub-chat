# Deploy de produção

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
CHAT_IMAGE_TAG=lucide-nav-3e23452 docker compose -f compose.yml up -d --no-deps --no-build --pull never --wait --wait-timeout 60 wapphub-chat
```

Preservar imagens/volumes. Verificar health, login/SPA, JS/CSS e hashes do bundle,
readiness API e logs. Não executar migrations, suites mutáveis de produção ou
browsers no Homelab. Homologação manual pelo notebook após publicação autorizada.
Core não pode retornar automaticamente ao artefato vulnerável demo-72d05aa.
