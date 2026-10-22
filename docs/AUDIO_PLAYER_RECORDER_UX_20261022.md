# Áudio UX — player navegável e gravador compacto
Data: 22/10/2026. Escopo: `wapphub-chat`, **somente interface/reprodução e captura local**.

## Referência
Adota a direção visual escolhida em mockup pelo usuário: áudio como faixa discreta na bolha, play/pause circular, tempo atual e total, seek bar visível e velocidade; gravador com contador/cancelar/concluir e prévia navegável antes de enviar. A interface segue os tokens WappHub. O mockup é conceitual: **não foi criada waveform real** (o seek usa barra horizontal verdadeira). O pequeno movimento decorativo do gravador não representa volume capturado.

## Implementação
- `AudioPlayer.tsx`, `audio-player.css`: UI em cima do HTMLAudioElement nativo (sem dependências), com play/pause, tempo em mm:ss ou hh:mm:ss, `input type=range` navegável, velocidade 0,75/1/1,5/2×, tratamento de duração desconhecida, erro e reset por URL.
- `MessageMedia.tsx`: áudio e voz agora usam `AudioPlayer`. Mantém URL autorizada por Core, `crossOrigin=use-credentials`, `preload=metadata`, callbacks `MediaTransfers`/lease, observador de visibilidade, `onPlay/onPause`, erro/retry, download autorizado e cleanup; vídeo e imagem permanecem como antes.
- `MediaComposer.tsx`: botão Gravar voz inicia a captura explícita via MediaRecorder (mesmo WebM/Opus, limite 16MB e tempo 10min). Durante a gravação aparecem tempo, cancelar e concluir. Cancelar libera o microfone sem gerar File; concluir cria o File VOICE existente e exibe preview no mesmo `AudioPlayer`, permitindo ouvir, navegar e descartar **sem envio automático**. Upload e submit continuam sob `Conversations.tsx`.
- `media.css`: encaixes responsivos de mensagem, prévia e barra de gravação.
- Testes: duração/seek/play/velocidade/URL autorizada, cancelamento/encerramento de gravação e preview, regressões de MediaTransfers, mídia e envio.

## Invariantes e segurança
- Não mudar API, Provider, Worker, Core, DB, URL de mídia, autenticação, idempotência, autorizações, tempo de retenção, download de áudio, validação MIME/limites e status `UNKNOWN`.
- O player não transfere nem decodifica áudio em JS; a mídia é tocada pelo navegador e continua sujeita a compatibilidade do codec e range/metadata suportados.
- O seek somente é habilitado quando `duration` finita positiva é conhecida. Não fingir duração em arquivos com metadados indisponíveis. Tempo visual e velocidade não alteram bytes do arquivo.
- Nenhuma nova permissão de microfone é pedida sem clique no botão Gravar voz; recorder é desmontado com limpeza existente.
- O defeito separado de **voz aparecendo no WappHub mas não entregue ao WhatsApp** permanece na [issue #46 do Core](https://github.com/uillaneduardo/wapphub-core/issues/46). Esta entrega não reenvia mensagens incertas nem afirma corrigir delivery.

## Homologação manual (notebook, não no homelab)
1. Abrir VOICE/AUDIO existente e confirmar barra de seek sempre visível, play/pause, duração, alteração de velocidade e download; testar arrastar thumb e clique em ponto específico após metadados carregados.
2. Com 390px e 1366×768 confirmar sem sobreposição do player com timestamp/metadados da bolha.
3. Em + / Gravar voz, confirmar indicador, tempo, cancelar sem anexo; gravar outra voz, concluir, pré-escutar, arrastar a barra, descartar; testar anexar áudio existente.
4. Testar anexos de imagem/vídeo e mudança de conversa; player não deve reter mídia do tenant anterior nem recriar URLs de blob depois do unmount.
5. Permissão negada e áudio incompatível devem mostrar mensagens seguras; se o navegador não oferecer duration/seekable, barra deve permanecer desabilitada sem quebrar reprodução.
6. Confirmar fluxo de envio texto/imagem e idempotência `UNKNOWN`; **não** usar recebimento de voz no WhatsApp como aceite do player, issue #46 aberta.

## Gates / publicação
CI GitHub: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`.
Deploy somente `wapphub-chat`, por worktree do SHA mergeado, imagem versionada e `CHAT_IMAGE_TAG` no Compose **local**. Preservar imagem anterior e não reiniciar Core/Provider/banco. Visual só é homologado após teste do usuário no notebook; não executar Playwright ou navegador gráfico no homelab.
