/** Small, static, local catalog loaded only when the picker is opened. */
export interface EmojiOption { emoji: string; name: string }
export interface EmojiCategory { name: string; items: EmojiOption[] }
export const emojiCategories: EmojiCategory[] = [
  { name: 'Rostos', items: [
    { emoji: '😀', name: 'sorriso' }, { emoji: '😃', name: 'alegre' }, { emoji: '😄', name: 'feliz' }, { emoji: '😁', name: 'sorrindo' },
    { emoji: '😂', name: 'rindo lágrimas' }, { emoji: '🤣', name: 'gargalhando' }, { emoji: '😊', name: 'carinha feliz' }, { emoji: '😍', name: 'apaixonado' },
    { emoji: '🥰', name: 'carinhoso' }, { emoji: '😘', name: 'beijo' }, { emoji: '😎', name: 'óculos de sol' }, { emoji: '🤔', name: 'pensando' },
    { emoji: '😅', name: 'alívio' }, { emoji: '🥹', name: 'emocionado' }, { emoji: '😢', name: 'chorando' }, { emoji: '😭', name: 'triste' },
    { emoji: '😡', name: 'bravo' }, { emoji: '😴', name: 'dormindo' }, { emoji: '🥳', name: 'festa' }, { emoji: '🤩', name: 'encantado' },
  ] },
  { name: 'Gestos', items: [
    { emoji: '👍', name: 'curtir positivo' }, { emoji: '👎', name: 'negativo' }, { emoji: '👏', name: 'palmas' }, { emoji: '🙌', name: 'comemoração' },
    { emoji: '🙏', name: 'obrigado oração' }, { emoji: '🤝', name: 'acordo aperto de mãos' }, { emoji: '👌', name: 'perfeito' },
    { emoji: '✌️', name: 'paz vitória' }, { emoji: '👋', name: 'olá tchau' }, { emoji: '💪', name: 'força' }, { emoji: '🤞', name: 'torcendo' },
    { emoji: '❤️', name: 'coração amor' }, { emoji: '💚', name: 'coração verde' }, { emoji: '💙', name: 'coração azul' }, { emoji: '💯', name: 'cem pontos' },
  ] },
  { name: 'Objetos', items: [
    { emoji: '📎', name: 'anexo clipe' }, { emoji: '📷', name: 'câmera foto' }, { emoji: '🎥', name: 'vídeo câmera' }, { emoji: '🎤', name: 'microfone' },
    { emoji: '📱', name: 'celular' }, { emoji: '💻', name: 'computador' }, { emoji: '🔧', name: 'reparo ferramenta' }, { emoji: '✅', name: 'concluído' },
    { emoji: '❌', name: 'cancelado' }, { emoji: '⚠️', name: 'atenção alerta' }, { emoji: '📦', name: 'pacote' }, { emoji: '📅', name: 'calendário' },
  ] },
  { name: 'Natureza', items: [
    { emoji: '🌻', name: 'girassol' }, { emoji: '🌹', name: 'rosa flor' }, { emoji: '🌴', name: 'palmeira' }, { emoji: '🌎', name: 'terra mundo' },
    { emoji: '☀️', name: 'sol' }, { emoji: '🌈', name: 'arco íris' }, { emoji: '⭐', name: 'estrela' }, { emoji: '🔥', name: 'fogo' },
    { emoji: '☕', name: 'café' }, { emoji: '🍕', name: 'pizza' }, { emoji: '🍔', name: 'hambúrguer' }, { emoji: '🎂', name: 'bolo aniversário' },
  ] },
  { name: 'Símbolos', items: [
    { emoji: '🎉', name: 'celebração confete' }, { emoji: '✨', name: 'brilho' }, { emoji: '🚀', name: 'foguete' }, { emoji: '💬', name: 'conversa' },
    { emoji: '📌', name: 'marcador fixar' }, { emoji: '⏰', name: 'relógio alarme' }, { emoji: '🔔', name: 'sino aviso' }, { emoji: '🔒', name: 'cadeado segurança' },
    { emoji: '✔️', name: 'certo' }, { emoji: '❗', name: 'exclamação' }, { emoji: '❓', name: 'pergunta' }, { emoji: '➕', name: 'adicionar' },
  ] },
];
