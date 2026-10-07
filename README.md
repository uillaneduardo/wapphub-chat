# WappHub Chat

Frontend operacional de atendimento do ecossistema WappHub.

## Responsabilidade

O WappHub Chat é a aplicação usada por Owner, Supervisor e Atendente para operar o atendimento da organização atual.

O Chat não administra catálogo comercial global, preços ou produtos da WappHub. Esses recursos pertencem ao `wapphub-platform`.

## MVP funcional

- Login e sessão compartilhada com o WappHub Core.
- Seleção de organização após login quando houver mais de uma.
- Alternância de organização durante a sessão.
- URLs reais e visíveis na barra de endereço.
- Equipe e convites.
- Contatos.
- Conversas.
- Mensagens de texto, imagem e áudio.
- Atribuição manual.
- Atribuição automática inicial por round-robin.
- Transferência de conversa com histórico completo, últimas X mensagens ou sem histórico.
- Notas internas.
- Tags.
- Arquivamento e consulta de arquivadas.
- Supervisão de conversas.
- Gerenciador de imagens e áudios.
- Configuração e diagnóstico do canal WhatsApp.

## Rotas

A navegação deve usar rotas reais com History API/BrowserRouter e suportar refresh direto.

Exemplos:

- `/login`
- `/organizations`
- `/app/conversations`
- `/app/conversations/:conversationId`
- `/app/contacts`
- `/app/files`
- `/app/team`
- `/app/tags`
- `/app/settings`

A especificação completa fica em `docs/ROUTES.md`.

## Segurança

A interface pode ocultar ações sem permissão ou entitlement, porém toda autorização é revalidada no WappHub Core.

## Estado atual

**Fase:** documentação e definição pré-implementação.

Consulte `docs/STATUS.md` antes de assumir qualquer funcionalidade como existente.
