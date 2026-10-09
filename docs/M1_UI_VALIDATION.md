# Homologação M1 — Chat e Demo Provider

## Reconciliação atual — 2026-10-08

Core publicado em 72d05aa, Chat publicado em 3e23452. Usuário confirmou operação Demo e
últimas melhorias visuais. Reexecutados lint/typecheck, 86 testes/16 arquivos e
build sem browser. Homologação manual é evidência operacional, não comprovação
exaustiva de permissões/multi-org/viewports. Não encerrar M1 antes de resolver
A1/A2 e demais aceites em M1_ARCHITECTURE_ACCEPTANCE_20261008.md.

## Estado histórico da revisão Demo UI

- Frontend revisado em `feat/m1-demo-provider-ui` (`b1b4c31ad91bac29d68188acb824de1931da6aaf`); Core compatível em `feat/m1-demo-provider` (`72d05aa8c0a3c9f12a8c17abb25ad737b88c65af`).
- `npm run lint`, `npm run typecheck`, `npm test` (11 arquivos, 36 testes) e `npm run build`: passaram.
- Os testes Vitest cobrem estados e interações da tela de provedores e simulador com API mockada. Smoke HTTP/WebSocket separado no Core isolado passou em ativação, provisionamento, mensagens nos dois sentidos, bloqueio após desativação, reativação idempotente e replay.
- A revisão inicial relatou uma limitação de navegador no host e deixou inspeção
  visual pendente. Esse registro histórico não autoriza tentar executá-lo novamente.
  Política permanente: proíbe Chromium/Firefox/Playwright Browser e screenshots
  automatizados no Homelab; não instalar dependências gráficas. Homologação ocorre
  manualmente no notebook após deploy autorizado. Operação/visual já foram relatados
  pelo usuário; cobertura completa do roteiro abaixo ainda não foi confirmada.

## Compatibilidade e pré-requisitos

O frontend depende de `GET /api/v1/providers`, `PUT /api/v1/providers/demo`, `GET /api/v1/providers/demo/contacts` e `POST /api/v1/providers/demo/messages`, além das rotas M1 de conversas, mensagens, equipe e realtime. Publique primeiro o Core com migrations e depois o Chat. O frontend desta branch não funciona com o Core anterior.

Use somente uma API e banco descartáveis. Para o Compose de teste do Core, siga `wapphub-core/docs/M1_VALIDATION.md` e `wapphub-core/docs/LOCAL_DEVELOPMENT.md`; confirme que `scripts/m1-test.sh` aponta ao projeto `wapphub-m1-test`, volume `wapphub-m1-test_test-db`, rede isolada e API local `127.0.0.1:3101`. Configure a origem permitida como `http://127.0.0.1:4173`. Nunca use `https://api.wapphub.com.br` neste teste.

O teste de atribuição/transferência precisa de dois membros ativos na mesma Organization: Owner e uma pessoa destinatária com `conversations.read` e `messages.read`. O bootstrap local cria o Owner; este repositório não possui um provisionador visual de membros. Prepare o destinatário apenas no banco descartável, usando as regras oficiais de hash de senha, Membership e RBAC do Core. Guarde as credenciais fora do repositório e com permissão restrita.

## Execução em estação de desenvolvimento

1. No notebook, usar as revisões publicadas Core 72d05aa e Chat 3e23452 (preservar branches locais); as refs acima são históricas. No Core, prepare o Compose de teste com os comandos de `docs/M1_VALIDATION.md`; execute migrations apenas nesse banco descartável. Bootstrap de Owner e destinatário de teste deve usar identidades sintéticas e credenciais temporárias.
2. No Chat, instale as dependências do lockfile e inicie o servidor local apontando exclusivamente ao API de teste:

   ```sh
   npm ci
   VITE_API_BASE_URL=http://127.0.0.1:3101 npm run dev -- --host 127.0.0.1 --port 4173
   ```

3. Abra `http://127.0.0.1:4173/login` em Chromium/Firefox com DevTools. Confirme no painel Network que as chamadas vão a `127.0.0.1:3101`, nunca ao hostname público.
4. No modo responsivo, execute o fluxo abaixo em cada viewport e salve evidência local: `1920×1080`, `1366×768`, `1024×768`, `768×1024`, `390×844`.

## Fluxo e critérios visuais

1. Faça login como Owner e confirme a Organization de teste.
2. Abra Configurações → Provedores. Ative Demo e confirme estado Ativo, dois contatos e duas conversas com as mensagens iniciais recebidas.
3. Abra uma conversa na Inbox, responda como atendente e confirme a mensagem enviada e o indicador DEMO.
4. Abra o simulador, escolha o contato, envie uma mensagem e confirme sua chegada na conversa do atendente em tempo real. Responda novamente e confirme a chegada no simulador.
5. Atribua a conversa a uma pessoa elegível; transfira para outra com `FULL`, `LIMITED` e `NONE`, confirmando que os controles mostram nomes e respeitam as permissões. Recarregue a conversa após cada transferência.
6. Desative Demo. Confirme que novos envios ficam bloqueados, o histórico permanece acessível e o estado não exibe sucesso antes da resposta da API.
7. Em todos os tamanhos, inspecione sidebar, lista, painel de mensagens, painel contextual, dropdowns, compositor, simulator, estados de loading/erro, foco por teclado, rolagem e overflow horizontal. No mobile, valide lista → conversa → voltar e seleção de contato no simulador.
8. Salve screenshots sem dados pessoais, identificando viewport e rota. Registre falhas e navegador/versão; não marque esta validação como aprovada antes de revisar as evidências.

O projeto ainda não tem runner Playwright nem fixture reutilizável de usuário/Organization. Esta revisão não adicionou uma dependência E2E que não pôde ser executada no host; o procedimento manual acima é a alternativa reproduzível. A revisão original tinha 36 testes; a revisão atual possui 86 testes aprovados.
