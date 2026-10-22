# Proposta e implementação — apresentação de mídia na conversa (22/10/2026)

## Objetivo

Tornar **imagem, áudio, voz e vídeo** legíveis, consistentes e fáceis de acessar dentro das bolhas do atendimento, sem alterar envio/recebimento, API, provider, autorização, fluxos de transferência, persistência, estado de mensagens, compositor nem comportamento do visualizador. Esta revisão é estritamente de apresentação do `MessageMedia`.

## Diagnóstico das capturas fornecidas

- Imagem: prévia já funcional, mas rotulagem `arquivo`, download e affordance para ampliar aparecem sem hierarquia visual uniforme.
- Áudio/voz: player nativo ocupa uma área larga, velocidade e download se alinham fora da composição e parecem ações desconectadas.
- Vídeo: falta um enquadramento estável no feed, com ação de ampliar e de baixar visualmente separadas dos controles.
- Como todas as mensagens ficam entre a lista de conversas e o painel de contexto, larguras fixas prejudicam a leitura em janelas menores.

## Direção visual

Base branca/cinza e ícones Lucide em `currentColor`; ações usam os tokens do Chat e respeitam a `accentColor` da organização. Sem sombras fortes, gradientes, cores fixas por organização ou reformulação da bolha e seus metadados.

| Tipo | Dentro da conversa | Ação principal | Ação secundária |
| --- | --- | --- | --- |
| Imagem | Miniatura proporcional, até 300 px de altura, sem recorte | Clique na imagem para ampliar | Baixar |
| Áudio | Linha compacta com ícone de áudio, player nativo e seletor de velocidade agrupados | Reproduzir/pausar no player | Baixar |
| Voz | Mesmo layout de áudio, rótulo e ícone próprios | Reproduzir/pausar no player | Baixar |
| Vídeo | Quadro 16:9 com controles nativos e dimensões responsivas | Reproduzir no feed | Ampliar vídeo / Baixar |

Todas as mídias possuem um cabeçalho compacto com **tipo** e **nome original truncado visualmente**, com `title` para consultar o nome completo. O nome genérico `arquivo` é omitido, evitando repetição vazia. A prévia de imagem mostra indicação discreta de ampliação em hover/foco e, em dispositivos sem hover, permanentemente. A área de ações é independente dos controles nativos.

## Estados e regras preservados

1. **Inicial/fora da viewport:** mantém carregamento por visibilidade com `IntersectionObserver`, estado de espera e `Abrir mídia` como fallback manual. Não há download extra ou automático fora da viewport.
2. **Pronto:** renderiza o conteúdo autorizado e as ações existentes. Imagem usa Blob URL local; áudio, voz e vídeo mantêm URL autorizada pelo Core com cookies, Range e `preload=metadata`.
3. **Falha:** permanece mensagem de erro segura e `Tentar novamente`, sem revelar URLs ou credenciais do provider.
4. **Navegação/limpeza:** leases, aborts, pausa/remoção de `src` e revogação de Blob URLs mantidos.
5. **Expandido:** lightbox de imagem e vídeo existentes preservados, inclusive zoom, download, foco/Escape e player de vídeo.

Esta entrega **não** reescreve player, cria waveform real, busca duração adicional, gera miniatura remota, converte codecs, altera mensagens de texto ou implementa novos endpoints. As políticas de media transfer do Core continuam a fonte de verdade.

## Critérios de aceite

- Os quatro tipos apresentam tipo, conteúdo, ação de download acessível e alinhamento consistente.
- Imagens retrato/paisagem conservam proporção; vídeo conserva proporção dentro da miniatura sem cortar o conteúdo; áudio/voz usam controles nativos.
- Cada cartão cabe na largura disponível do balão em desktop e dispositivos estreitos; nomes longos não transbordam.
- Acesso pelo teclado (foco visível), identificação pelos leitores de tela, zoom e ações de download continuam disponíveis.
- Os testes automatizados existentes de ciclo de vida, autorização, retry, lightbox, velocidade e autenticação de mídia continuam verdes.

## Validação

- Automatizada: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build` no CI do PR.
- Visual (manual no notebook, **não no homelab**): abrir mensagens de imagem retrato/paisagem, áudio curto/longo, voz e vídeo; testar zoom e reprodução, velocidade, download, mensagens expiradas, largura reduzida/painel de contexto expandido, teclado e mudança de conversa. Homologação visual depende dessa execução humana após deploy autorizado.
- Implantação não incluída nesta alteração de código; o merge na `main` não significa que a imagem Docker foi compilada/publicada no homelab.

## Arquivos do recorte

- `src/features/conversations/MessageMedia.tsx`: cabeçalho, conteúdo por tipo e ações, sem alterar as funções de transporte/ciclo de vida.
- `src/features/conversations/media.css`: layout, responsividade, estados hover/foco; visualizador e compositor mantidos.
- `src/features/conversations/MessageMedia.test.tsx`: regressão de nomenclatura e ações acessíveis.

A alteração é revertível pelo commit/PR sem migrações de dados ou alteração do contrato HTTP. Não atualizar `docs/STATUS.md` antes de homologação conforme política do projeto.
