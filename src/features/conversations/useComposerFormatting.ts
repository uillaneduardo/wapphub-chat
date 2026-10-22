export type FormatKind = 'bold' | 'italic' | 'strike' | 'code';
export interface TextSelection { start: number; end: number; direction?: 'forward' | 'backward' | 'none' }
export interface EditResult { text: string; selection: TextSelection }
export const MAX_COMPOSER_LENGTH = 8000;
const markers: Record<FormatKind, string> = { bold: '*', italic: '_', strike: '~', code: '```' };

export function formatSelection(text: string, selection: TextSelection, kind: FormatKind): EditResult | null {
  const marker = markers[kind], length = marker.length;
  const start = Math.max(0, Math.min(text.length, selection.start));
  const end = Math.max(start, Math.min(text.length, selection.end));
  const selected = text.slice(start, end);
  let next: string; let selectedStart: number; let selectedEnd: number;
  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= 2 * length) {
    next = text.slice(0, start) + selected.slice(length, -length) + text.slice(end);
    selectedStart = start; selectedEnd = end - 2 * length;
  } else if (text.slice(start - length, start) === marker && text.slice(end, end + length) === marker) {
    next = text.slice(0, start - length) + selected + text.slice(end + length);
    selectedStart = start - length; selectedEnd = end - length;
  } else {
    next = text.slice(0, start) + marker + selected + marker + text.slice(end);
    selectedStart = start + length; selectedEnd = end + length;
  }
  if (next.length > MAX_COMPOSER_LENGTH) return null;
  return { text: next, selection: { start: selectedStart, end: selectedEnd, direction: selection.direction ?? 'none' } };
}

export function insertAtSelection(text: string, selection: TextSelection, insertion: string): EditResult | null {
  const start = Math.max(0, Math.min(text.length, selection.start));
  const end = Math.max(start, Math.min(text.length, selection.end));
  const next = text.slice(0, start) + insertion + text.slice(end);
  if (next.length > MAX_COMPOSER_LENGTH) return null;
  const caret = start + insertion.length;
  return { text: next, selection: { start: caret, end: caret, direction: 'none' } };
}
