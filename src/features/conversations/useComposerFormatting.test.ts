import { describe, expect, it } from 'vitest';
import { formatSelection, insertAtSelection, MAX_COMPOSER_LENGTH } from './useComposerFormatting';

describe('WhatsApp formatting preserves native text and selection', () => {
  it.each([
    ['bold', '*texto*'],
    ['italic', '_texto_'],
    ['strike', '~texto~'],
    ['code', '```texto```'],
  ] as const)('wraps selected text in %s markers', (kind, expected) => {
    const result = formatSelection('texto', { start: 0, end: 5 }, kind);
    expect(result).toMatchObject({ text: expected, selection: { start: expected.length - 5, end: expected.length } });
    const reversed = formatSelection(expected, result!.selection, kind);
    expect(reversed?.text).toBe('texto');
  });
  it('inserts caret between new delimiters and toggles back without losing content', () => {
    const formatted = formatSelection('antes depois', { start: 6, end: 6 }, 'bold');
    expect(formatted).toMatchObject({ text: 'antes **depois', selection: { start: 7, end: 7 } });
    expect(formatSelection(formatted!.text, formatted!.selection, 'bold')?.text).toBe('antes depois');
  });
  it('keeps multiline Unicode text unchanged and inserts emoji at a specific caret', () => {
    const source = 'ação\n🙂 fim', inserted = insertAtSelection(source, { start: 5, end: 5 }, '❤️');
    expect(inserted?.text).toBe('ação\n❤️🙂 fim');
    expect(inserted?.selection).toMatchObject({ start: 7, end: 7 });
  });
  it('never bypasses the backend 8000 UTF-16 code-unit limit', () => {
    const original = 'a'.repeat(MAX_COMPOSER_LENGTH - 1);
    expect(formatSelection(original, { start: 0, end: 0 }, 'bold')).toBeNull();
    expect(insertAtSelection(original, { start: 0, end: 0 }, '🙂')).toBeNull();
    expect(formatSelection('*x*', { start: 1, end: 2 }, 'bold')?.text).toBe('x');
  });
});
