# Rotas do WappHub Chat

## Regra

A rota deve aparecer na barra de endereço. Usar History API / BrowserRouter ou equivalente.

Refresh direto deve funcionar por configuração de fallback no servidor.

## Públicas

- `/login`
- `/forgot-password`
- `/invite/:token`

## Contexto

- `/organizations`

## Aplicação

- `/app/conversations`
- `/app/conversations/:conversationId`
- `/app/contacts`
- `/app/contacts/:contactId`
- `/app/files`
- `/app/team`
- `/app/team/invitations`
- `/app/tags`
- `/app/settings`
- `/app/settings/company`
- `/app/settings/conversations`
- `/app/settings/assignment`
- `/app/settings/channels`
- `/app/settings/channels/whatsapp`
- `/app/settings/providers`
- `/app/providers/demo/simulator`

## Comportamento ao trocar Organization

A troca de Organization:
- mantém o User autenticado;
- muda o Organization Context;
- revalida Membership, permissions e entitlements;
- invalida caches tenant-scoped;
- redireciona para uma rota válida no novo contexto;
- nunca reaproveita dados visuais da organização anterior.

## Visibilidade

Menu e rotas podem variar por permission/entitlement, porém o backend continua sendo a autoridade de segurança.

## Rotas funcionais adicionadas nesta entrega local

`/app/contacts` e `/app/contacts/:id`: lista/detalhe reais protegidos por `contacts.read`; escrita condicionada a `contacts.write`. `/app/conversations/new`: seleção/cadastro de contato e criação interna, exige `conversations.read`, `conversations.create` e `contacts.read`. A abertura usa o filtro de inbox correspondente à atribuição. Publicação/homologação pendentes.

## Consolidação de navegação por contextos — 2026-10-09

A Sidebar usa catálogo declarativo centralizado em `src/components/navigation.ts`.
Rotas M1 preservadas; providers/Demo em Gestão, configurações reservadas em
Preferências, recursos futuros desabilitados. Mobile usa acesso rápido e Mais.
Detalhes de disponibilidade, permissões e arquitetura em [CONTEXT_NAVIGATION.md](CONTEXT_NAVIGATION.md).
Homologação desta alteração permanece pendente pelo usuário.
