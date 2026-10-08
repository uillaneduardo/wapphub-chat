# Deploy de produção

O frontend é compilado pelo Docker e servido como arquivos estáticos por Nginx. O Nginx usa a porta interna `3000` e faz fallback de rotas SPA para `index.html`. O serviço participa apenas da rede externa `cloudflare_ingress`; não publica porta no host nem acessa banco ou Redis.

O Tunnel existente está documentado pelo serviço legado com origin `http://wapphub-chat:3000`. O serviço novo conserva esse nome DNS e porta.

Para publicar uma revisão, use a tag do commit da `main`:

```sh
CHAT_IMAGE_TAG=$(git rev-parse --short HEAD) docker compose -f compose.yml up -d --build --wait
```

Para reverter dentro do novo stack, selecione a tag de commit anterior e recrie somente o serviço:

```sh
CHAT_IMAGE_TAG=<tag-do-commit-anterior> docker compose -f compose.yml up -d --no-deps --wait wapphub-chat
```

Mantenha as imagens versionadas localmente até a revisão seguinte ser validada. O build recebe `VITE_API_BASE_URL=https://api.wapphub.com.br`; nenhum segredo faz parte da imagem.
