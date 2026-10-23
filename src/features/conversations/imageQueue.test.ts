import { describe, expect, it } from 'vitest';
import { imageBatchCaption, MAX_IMAGE_BATCH, queueImages } from './imageQueue';

const photo = (name: string, mime = 'image/jpeg', size = 5) => new File([new Uint8Array(size)], name, { type: mime });
describe('G.2 image queue', () => {
  it('appends in selection order across multiple picker actions and uses unique item IDs', () => {
    let next = 0;
    const makeId = () => 'image-' + ++next;
    const first = queueImages([], [photo('one.jpg'), photo('two.png', 'image/png')], makeId);
    const second = queueImages(first.items, [photo('three.jpg')], makeId);
    expect(second.error).toBeNull();
    expect(second.items.map(item => item.id)).toEqual(['image-1', 'image-2', 'image-3']);
    expect(second.items.map(item => item.file.name)).toEqual(['one.jpg', 'two.png', 'three.jpg']);
    expect(new Set(second.items.map(item => item.id)).size).toBe(3);
  });
  it('rejects mixed files, oversized media, and exceeding the limit atomically', () => {
    const first = queueImages([], [photo('keep.jpg')], () => 'keep').items;
    expect(queueImages(first, [photo('bad.heic','image/heic')]).items).toBe(first);
    expect(queueImages(first, [photo('document.pdf','application/pdf')]).error).toMatch(/Formato/);
    expect(queueImages(first, Array.from({ length: MAX_IMAGE_BATCH }, (_,i) => photo(i+'.jpg'))).error).toMatch(/até 10 imagens/);
    const huge = new File([new Uint8Array(8 * 1024 * 1024 + 1)],'huge.jpg',{type:'image/jpeg'});
    expect(queueImages(first,[huge]).items).toBe(first);
  });
  it('retains the existing selection on picker cancel and only captions the first message', () => {
    const queued = queueImages([], [photo('keep.jpg')]).items;
    expect(queueImages(queued, []).items).toBe(queued);
    expect(imageBatchCaption(0, 'Legenda')).toBe('Legenda');
    expect(imageBatchCaption(1, 'Legenda')).toBe('');
    expect(imageBatchCaption(8, 'Legenda')).toBe('');
  });
});
