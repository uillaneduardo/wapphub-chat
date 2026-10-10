# WhatsApp Web — interface do Checkpoint 3

Em `/app/settings/providers`, o catálogo real do Core pode oferecer WhatsApp Web.
A mesma permissão efetiva providers.manage protege a tela. O navegador chama
somente Core API; não conhece endereço/segredo do serviço privado nem importa SDK.

Criar conexão provisiona sessão ociosa. Solicitar QR envia um comando explícito;
nenhum connect ocorre no mount. Estado do serviço e comando pendente são distintos.
QR_REQUIRED/FAILED/LOGGED_OUT são normalizados pelo Core para QR_READY/ERROR/
DISCONNECTED. Renovação solicita refresh real; desconexão confirma revogação do
vínculo antes de enviar comando. Falhas exibem orientações e códigos seguros.

O QR é gerado localmente como SVG usando qrcode 1.5.4 fixo, com margem adequada,
instruções e alternativa acessível. Não usa Base64, URL externa, storage ou log.
Expira usando duração fornecida pelo Core descontada a latência do pedido; esconder,
fechar tela, trocar Organization/permissões ou conectar remove a representação.
AbortController, chave de contexto e versões impedem respostas atrasadas de expor
QR/estado de outra organização. Botões bloqueiam submissões simultâneas.

Realtime dedicado via `/api/v1/providers/realtime` reutiliza RealtimeClient e Core
session guard, sem exigir conversations.read. Eventos apenas invalidam o estado
da conexão; cursor separado somente em memória. Não há polling frequente. Perda
do stream é indicada, com consulta manual e reconciliação ao reconectar. Autoridade
revogada atualiza sessão pelo fluxo existente.

Conversa Web usa o mesmo histórico/visibilidade do M1. A capacidade outboundEnabled
retornada pelo Core bloqueia compositor; autoria de mensagem externa DEVICE aparece
como Aparelho conectado, sem atribuir ao usuário atual. Demo permanece funcional.

Envio pelo Chat e mídias ainda não estão disponíveis. Contratos normalizados já
preveem referências de imagem/áudio/vídeo/documento, mas faltam armazenamento,
ACL por conversa, upload/download e fila de transferência no Core. Nenhum controle
visual anuncia essas capacidades como implementadas. Meta/Platform não mudam.

Homologação manual no notebook: abrir
https://chat.wapphub.com.br/app/settings/providers com providers.manage, criar
conexão, solicitar QR, testar expiração/renovação, verificar estados, trocar de
organização e conferir desaparecimento do QR, testar confirmação/cancelamento de
desconexão e o Demo. O vínculo com conta real exige ação explícita humana; nenhum
QR foi escaneado automaticamente nem envio externo realizado pela implementação.
Verificar Full HD/mobile e teclado. Nenhum navegador gráfico é executado no servidor.
