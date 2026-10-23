import type { Attachment } from './MediaComposer';
import { documentMime } from '../../lib/documentTypes';

/** Matches currently authorized Core media types; never imply a document or HEIC upload is supported. */
export function validateMediaFile(file: File, voice = false): { attachment?: Attachment; error?: string } {
  if (!file.size) return { error: 'O arquivo selecionado está vazio ou a câmera não retornou o arquivo. Tente novamente ou escolha da galeria.' };
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  const image = ['image/jpeg', 'image/png', 'image/webp'].includes(mime) || (!mime && /\.(jpe?g|png|webp)$/.test(name));
  const video = mime === 'video/mp4' || (!mime && /\.mp4$/.test(name));
  const audio = ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/webm'].includes(mime) ||
    (!mime && /\.(ogg|mp3|m4a|webm)$/.test(name));
  const document = Boolean(documentMime(file));
  const type: Attachment['type'] | undefined = voice && mime === 'audio/webm' ? 'VOICE' : image ? 'IMAGE' : video ? 'VIDEO' : audio ? 'AUDIO' : document ? 'DOCUMENT' : undefined;
  if (!type) {
    return { error: 'Formato não aceito. Use foto JPG, PNG ou WebP, vídeo MP4 ou áudio OGG, MP3, M4A ou WebM. Fotos HEIC/HEIF da câmera devem ser convertidas para JPG antes de anexar.' };
  }
  const maxMiB = type === 'IMAGE' ? 8 : type === 'VIDEO' ? 25 : 16;
  if (file.size > maxMiB * 1024 * 1024) {
    return { error: `O arquivo tem ${(file.size / 1048576).toFixed(1).replace('.', ',')} MB e supera o limite de ${maxMiB} MB para ${type === 'IMAGE' ? 'imagem' : type === 'VIDEO' ? 'vídeo' : type === 'DOCUMENT' ? 'documento' : 'áudio'}. Escolha um arquivo menor antes de enviar.` };
  }
  return { attachment: { file, type } };
}
