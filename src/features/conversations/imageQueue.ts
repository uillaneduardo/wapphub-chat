import { validateMediaFile } from './mediaFileValidation';

export const MAX_IMAGE_BATCH = 10;
export type QueuedImage = { id: string; file: File; type: 'IMAGE' };
export type ImageQueueResult = { items: QueuedImage[]; error: string | null };

/** File picker changes are atomic: no partial append on invalid files or quota errors.
 * Each file is a separately addressable message — there is no fake WhatsApp album endpoint.
 */
export function queueImages(current: QueuedImage[], chosen: readonly File[], makeId: () => string = () => crypto.randomUUID()): ImageQueueResult {
  if (!chosen.length) return { items: current, error: null }; // Camera/picker canceled.
  if (current.length + chosen.length > MAX_IMAGE_BATCH)
    return { items: current, error: `É possível anexar até ${MAX_IMAGE_BATCH} imagens por envio. Remova algumas antes de adicionar outras.` };
  const validated = chosen.map(file => validateMediaFile(file));
  const invalid = validated.find(item => item.error || item.attachment?.type !== 'IMAGE');
  if (invalid) return { items: current, error: invalid.error ?? 'Selecione somente imagens neste conjunto.' };
  return {
    items: [...current, ...chosen.map(file => ({ id: makeId(), file, type: 'IMAGE' as const }))],
    error: null,
  };
}

export function imageBatchCaption(index: number, caption: string): string {
  // Exactly one caption, on the first message. Failed/retried items never repeat it.
  return index === 0 ? caption : '';
}
