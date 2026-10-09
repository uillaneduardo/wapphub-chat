import type { KeyboardEvent } from 'react';
import { useUiPreference } from './useUiPreference';
import type { SendShortcut } from './useUiPreference';
export function shouldSendOnKey(event: KeyboardEvent<HTMLTextAreaElement>, shortcut: SendShortcut) {
  if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.ctrlKey || event.altKey || event.metaKey) return false;
  return event.key === 'Enter' && (shortcut === 'enter' ? !event.shiftKey : event.shiftKey);
}
export function useComposerShortcut(userId?: string) {
  const [shortcut, setShortcut] = useUiPreference(userId, 'sendShortcut');
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, send: () => void) {
    if (shouldSendOnKey(event, shortcut)) { event.preventDefault(); send(); }
  }
  return { shortcut, setShortcut, onKeyDown };
}
