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
