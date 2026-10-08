import { vi } from 'vitest';

// jsdom has no layout engine. Model scroll geometry explicitly; this tests behavior, not CSS rendering.
export function mockScrollGeometry() {
  const tops = new WeakMap<HTMLElement, number>();
  const height = (node: HTMLElement) => node.textContent === 'Tall' ? 200 : 100;
  const items = (node: HTMLElement) => [...node.querySelectorAll<HTMLElement>('[data-message-key]')];
  let viewportHeight = 200;
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('message-history') ? viewportHeight : 0; });
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('message-history') ? items(this).reduce((sum, item) => sum + height(item), 0) : 0; });
  vi.spyOn(HTMLElement.prototype, 'scrollTop', 'get').mockImplementation(function (this: HTMLElement) { return tops.get(this) ?? 0; });
  vi.spyOn(HTMLElement.prototype, 'scrollTop', 'set').mockImplementation(function (this: HTMLElement, value) { tops.set(this, Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight))); });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const history = this.closest<HTMLElement>('.message-history');
    let top = 0; let elementHeight = viewportHeight;
    if (history && this.hasAttribute('data-message-key')) {
      const siblings = items(history); top = siblings.slice(0, siblings.indexOf(this)).reduce((sum, item) => sum + height(item), 0) - history.scrollTop; elementHeight = height(this);
    }
    return { top, bottom: top + elementHeight, left: 0, right: 300, width: 300, height: elementHeight, x: 0, y: top, toJSON: () => ({}) };
  });
  return { resize: (height: number) => { viewportHeight = height; } };
}
