interface Registry { observer: IntersectionObserver; listeners: Map<Element, (visible: boolean) => void> }
const roots = new Map<Element | null, Registry>();
/** One observer per history root, shared by mounted messages. */
export function observeMedia(node: HTMLElement, listener: (visible: boolean) => void): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => undefined;
  const root = node.closest('.message-history');
  let registry = roots.get(root);
  if (!registry) {
    const listeners = new Map<Element, (visible: boolean) => void>();
    const observer = new IntersectionObserver(entries => { for (const entry of entries) listeners.get(entry.target)?.(entry.isIntersecting); }, { root, rootMargin: '0px', threshold: 0 });
    registry = { observer, listeners }; roots.set(root, registry);
  }
  registry.listeners.set(node, listener); registry.observer.observe(node);
  const current = registry;
  return () => { current.observer.unobserve(node); current.listeners.delete(node); if (!current.listeners.size) { current.observer.disconnect(); roots.delete(root); } };
}
