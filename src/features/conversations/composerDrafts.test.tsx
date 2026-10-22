import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { activateComposerScope, clearComposerDrafts, composerDraftKey, readComposerDraft, useConversationDraft } from './composerDrafts';

describe('composer draft isolation', () => {
  afterEach(clearComposerDrafts);
  it('retains drafts in memory when switching conversations and clears them at a tenant boundary', () => {
    activateComposerScope('u', 'org-one');
    const key = composerDraftKey('u', 'org-one', 'c1');
    const view = renderHook(() => useConversationDraft(key));
    act(() => view.result.current[1]('Mensagem temporária'));
    expect(readComposerDraft(key)).toBe('Mensagem temporária');
    view.unmount();
    expect(readComposerDraft(composerDraftKey('u', 'org-one', 'c2'))).toBe('');
    const returnView = renderHook(() => useConversationDraft(key));
    expect(returnView.result.current[0]).toBe('Mensagem temporária');
    returnView.unmount();
    activateComposerScope('u', 'org-two');
    expect(readComposerDraft(key)).toBe('');
    activateComposerScope('other', 'org-two');
    expect(readComposerDraft(key)).toBe('');
  });
  it('deletes a draft after an intentional clear and never persists to storage', () => {
    activateComposerScope('u', 'org-one');
    const key = composerDraftKey('u', 'org-one', 'c1');
    const view = renderHook(() => useConversationDraft(key));
    act(() => { view.result.current[1]('primeiro'); view.result.current[1](current => current + ' segundo'); });
    expect(view.result.current[0]).toBe('primeiro segundo');
    act(() => view.result.current[1](''));
    expect(readComposerDraft(key)).toBe('');
    view.unmount();
  });
});
