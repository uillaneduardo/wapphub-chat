# G.2 — Envio seguro de múltiplas imagens

Data: 23/10/2026. Primeiro recorte da G.2, sobre G.1/F.3. Documento de contrato e homologação de `wapphub-chat`.

## Fluxo entregue

1. Usuário escolhe imagens JPG, PNG e WebP com `input[type=file][multiple]` em uma mesma seleção, ou abre o seletor novamente para adicionar outras fotos. O rascunho da conversa permanece visível.
2. **Fila máxima de dez imagens**, ordenada de acordo com a seleção e as novas inclusões. Prévia mostra miniaturas, posição e remoção individual ou **Limpar**. Nome técnico não aparece na prévia; textos de acessibilidade identificam cada miniatura.
3. O limite e a validação por arquivo são **atômicos**: se uma foto estiver vazia, for incompatível (por exemplo HEIC) ou exceder os 8 MiB permitidos, nenhum elemento daquela nova seleção é adicionado. Seleção cancelada preserva a fila. Mistura com áudio e vídeo exige concluir ou limpar as imagens.
4. **Um único clique Enviar** inicia sequência limitada de mensagens existentes: cada foto vira uma mensagem distinta com `clientMessageId` exclusivo, `POST /conversations/:id/media` e `POST /conversations/:id/messages`. O Core e o Provider mantêm a autoria, o status, os controles de tenant e a regra de idempotência. Não existe contrato de álbum, então a UI não o simula.
5. Se o usuário escreveu legenda, ela acompanha **somente a primeira imagem** do lote. As demais são mensagens de mídia com corpo vazio.
6. Após cada sucesso no registro da mensagem, a imagem é removida da fila; nas falhas, a fila **para imediatamente** e mantém o item que falhou e os próximos para revisão. A intenção falhada permite repetição segura usando `clientMessageId` quando apropriado.
7. Quando a confirmação de envio é **UNKNOWN**, o lote é interrompido. Não retransmitir automaticamente. Usar **Verificar envio** e aguardar confirmação antes de novo clique. Se uma tentativa confirmada não estiver mais na fila, preservar apenas as fotos realmente pendentes.
8. No navegador, ao sair da conversa durante um lote, não iniciar a próxima mídia; o componente é isolado por conversa/usuário/organização. URL de prévia por item é revogada na remoção/desmontagem.

## Delimitação

- A arquitetura atual só consegue enviar **uma mídia por mensagem**; esta UI utiliza sequenciamento de várias mensagens, não há upload paralelo nem álbum no WhatsApp.
- A fila não é persistida em `localStorage` (contém `File` do navegador), para não reter mídias sensíveis; saia da conversa apenas quando não houver mídias pendentes.
- O backend continua aprovando formato/tamanho, autorização de envio, disponibilidade do Provider e conteúdo; a validação frontend é apenas UX.
- Não introduz envio de PDF, DOCX, XLSX ou outros documentos: Core/Provider bloqueiam `DOCUMENT` atualmente. Dependência formal em [Core #49](https://github.com/uillaneduardo/wapphub-core/issues/49). Backlog visual e funcional original: [Chat #51](https://github.com/uillaneduardo/wapphub-chat/issues/51).
- A falha anterior do navegador Android ao abrir a câmera, antes de devolver o arquivo, ainda requer inspeção no aparelho real; não declarada resolvida.
- Nenhum Core/Provider/Worker/DB/Cloudflare Tunnel alterado.

## Testes e validação

CI: `npm ci`, lint, typecheck, testes Vitest e build. Cobertura adicionada: fila de até dez imagens; seleção simultânea e sucessiva; itens com IDs exclusivos; descarte individual/conjunto; cancelamento e erro de formato; URL de miniatura; três uploads e três mensagens idempotentes; uma só legenda; falha no segundo upload que mantém segundo e terceiro item e não reenvia o primeiro.

Homologação real deve ser feita no **notebook e no celular**, sem navegador gráfico instalado no homelab:

- [ ] Selecionar 3 fotos, depois anexar mais 2; conferir 5 miniaturas na ordem, sem substituir anteriores
- [ ] Remover segunda foto e usar Limpar; testar cancelamento de seletor
- [ ] Tentar seleção maior que dez, HEIC e imagem acima de 8 MiB; conferir mensagem segura e fila anterior preservada
- [ ] Enviar 3 fotos com uma legenda e confirmar 3 mensagens separadas no WhatsApp, com legenda somente na primeira
- [ ] Induzir falha de conexão ou meio indisponível; conferir que a fila para e não transmite duplicado no retry
- [ ] Selecionar outros tipos de mídia separadamente; testar gravação de voz e vídeo depois do envio
- [ ] Responsividade 320×568, 390×844, 1366×768, 1920×1080 e acento da organização, tab/foco, imagens longas
- [ ] Troca de organização e permissões AGENT não permitem upload sem acesso

**Publicação:** build e deploy somente de `wapphub-chat`, após merge e CI verde; preserve imagem anterior. Esta etapa não precisa reiniciar o Provider porque não altera o Core, mas pode confirmar conexão normalmente após o deploy.

## Próximo recorte G.2

Documentos precisam de contrato/backend seguro: metadados, assinaturas MIME verificadas, Vault/Provider upload e download, normalização Baileys, tamanho e quotas, OpenAPI e novos testes. Não exibir no Chat opção que falhará na API antes de existir suporte real ponta a ponta.
