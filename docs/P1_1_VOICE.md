# P1.1 — gravação preservada e retry seguro (em revisão)

Dependência: PR30/P1.2 realtime. Diagnóstico completo, HAR, backend e rollback:
[wapphub-core/WHATSAPP_WEB_VOICE_P11.md](https://github.com/uillaneduardo/wapphub-core/blob/fix/p11-voice-send/docs/WHATSAPP_WEB_VOICE_P11.md).
Sem publicação ou browser gráfico; recebimento permanece homologado pelo usuário.

Falha no upload mantém o File/WebM e a prévia. Erro mostra estágio upload versus
registro e código seguro. Retry mantém clientMessageId e reutiliza mídia já
confirmada pelo Core quando o registro recebe rejeição certa antes de commit.
Não reenvia automaticamente intenção incerta: mantém gravação e oferece
Verificar envio, consulta REST e reconciliação por clientMessageId. Status
confirmado via realtime não regride quando a resposta POST falha depois.

Mídia gravada e intenções ficam somente em memória da conversa, isoladas por
usuário/organização; troca de contexto/unmount libera os dados. Nenhuma nova
persistência no navegador, autorização/contrato, dependência ou fila.

Validação: 360/360 em34 arquivos, lint/typecheck/build aprovados. Casos novos:
MediaRecorder simulado produz File/audio/webm; upload503 preserva prévia e retry;
rejeição403 após upload reusa mediaId e mesmo clientMessageId; UNKNOWN bloqueia
nova intenção e verifica via REST; sem duplicação. Captura/player real e envio ao
celular dependem de homologação humana no notebook após publicação autorizada.

Rollback: reverter apenas este commit Chat preservando correção realtime PR30;
sem DB/filas/sessão. Pode voltar imagem publicada baaee36, reintroduzindo também
as corridas realtime. Homologar gravação curta e1min, falha/retry, UNKNOWN,
negação/troca de tenant e imagem/vídeo/áudio anteriores.

Revisão de limpeza: descarte explícito remove a referência ao File e o intent
local que falhou antes de persistir, preservando linhas UNKNOWN já submetidas.
Confirmação tardia de um envio antigo nunca apaga uma gravação nova selecionada.
MediaRecorder libera handlers, chunks e referências ao stream ao concluir;
prévia autorizada permanece até sucesso, descarte ou saída da conversa.
Duas regressões adicionais cobrem descarte e confirmação após substituição.

Após integrar a revisão final realtime (incluindo Core GET/readScope), a suíte
completa da branch de voz passou370/370 em34arquivos. Duas regressões adicionais
verificam descarte e confirmação após substituição. CI e os SHAs finais ficam
no progresso/evidência de entrega do Core; permanece sem publicação.
