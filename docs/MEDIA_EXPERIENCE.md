# Experiência de mídia — consolidação B3

Implementação em branch de revisão, **não publicada ou homologada**. A aprovação técnica do [PR25 do Core](https://github.com/uillaneduardo/wapphub-core/pull/25#pullrequestreview-5484867318) inclui vídeo e substitui a exclusão antiga de MVP neste escopo. Progresso canônico e plano B5 estão no Core; não criar acompanhamento paralelo.

## Experiência implementada

Capacidade efetiva vem do Core: flags técnicas + autorização da conexão + Membership/RBAC. Quando habilitada, o compositor oferece anexo e gravação de voz; selecionar arquivo/gravar somente prepara prévia local. Upload e intenção de envio começam em **Enviar**. Nenhuma chamada direta do Chat ao Provider ou WhatsApp.

Imagem JPEG/PNG/WebP até 8 MiB, áudio/voz até 16 MiB, vídeo MP4 H.264/AAC até 25 MiB, duração máxima de 600s. Arquivos suportados são inspecionados pelo backend; erro de codec/expiração é apresentado ao operador. Gravação usa MediaRecorder WebM/Opus quando disponível; Provider converte voz para Ogg/Opus. Navegador sem suporte oferece anexo de áudio. Preview e player usam Blob URL local, revogada ao sair/trocar contexto; trilhas do microfone são encerradas ao concluir/sair.

Recebimento não baixa automaticamente binários. **Abrir mídia** chama rota autenticada do Core vinculada à mensagem e à conversa. Imagem abre visualização, áudio/voz e vídeo usam controles nativos; UI mostra indisponibilidade/expiração. Documentos permanecem apenas metadados nesta entrega. Referência PENDING não comprova bytes disponíveis.

## Domínio e segurança

Core é autoridade de Organization/Conversation/Message/ator/idempotência/visibilidade FULL/LIMITED/NONE. Media SQL guarda metadados e vínculos; bytes e referências de download ficam no cache/Vault criptografados do Provider, sujeitos a TTL/quota. Nenhuma mediaKey, URL de WhatsApp, token, credencial ou Signal key chega ao Chat. Downloads são sob demanda, autenticados e limitados; não são arquivo remoto permanente nem galeria global.

Mensagem de envio é PENDING até recibo/echo confirmado. Resultado UNKNOWN não oferece retransmissão cega. Retry explícito reaproveita clientMessageId apenas nos casos que o Core confirma como seguros; upload sem envio não equivale a mensagem entregue. Mensagem do aparelho vinculado mantém autoria externa.

## Validação e limites

Jsdom verifica demanda explícita, erro/expiração, cleanup/abort e indisponibilidade da gravação. Core/Provider têm integração SQL/journal e runtime Docker sintético sem rede com imagem/áudio/voz/vídeo e conversão WebM. Não houve browser/Playwright no homelab, upload/envio real ou deploy. Qualidade de gravação/players, layouts e mídias reais dependem de homologação humana após B5 autorizado.

Galeria, gerenciador global de arquivos e storage comercial permanecem fora deste escopo; Demo conserva sua experiência de texto.
