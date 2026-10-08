import type { ChatEvent } from '../types/chat';

const listeners = new Set<(event: ChatEvent) => void>();
export const realtimeBus = {
  emit(event: ChatEvent): void { listeners.forEach((listener) => listener(event)); },
  subscribe(listener: (event: ChatEvent) => void): () => void { listeners.add(listener); return () => listeners.delete(listener); },
};
