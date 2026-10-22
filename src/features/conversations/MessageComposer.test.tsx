import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MessageComposer } from './MessageComposer';

function Harness({ onSend = vi.fn() }: { onSend?: ReturnType<typeof vi.fn> }) {
  const [draft, setDraft] = useState('');
  const [shortcut, setShortcut] = useState<'enter' | 'shift-enter'>('enter');
  return <MessageComposer draft={draft} onDraftChange={setDraft} onSubmit={event => { event.preventDefault(); onSend(draft); }} onTextKeyDown={event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); onSend(draft); }
  }} sending={false} disabled={false} mediaEnabled={false} attachment={null} onAttachmentChange={() => {}} shortcut={shortcut} onShortcutChange={setShortcut} />;
}
describe('compact composer', () => {
  afterEach(() => vi.restoreAllMocks());
  it('formats the textarea selection and provides a sanitized preview', async () => {
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Escrever mensagem' }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'olá' } });
    input.focus(); input.setSelectionRange(0, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Negrito' }));
    expect(input.value).toBe('*olá*');
    fireEvent.click(screen.getByRole('button', { name: 'Prévia' }));
    expect(screen.getByRole('region', { name: 'Prévia da formatação' }).querySelector('strong')).toHaveTextContent('olá');
    expect(input).toHaveAttribute('maxlength', '8000');
  });
  it('inserts a searched emoji in the draft without submitting it', async () => {
    const send = vi.fn();
    render(<Harness onSend={send} />);
    fireEvent.click(screen.getByRole('button', { name: 'Emojis' }));
    const picker = await screen.findByRole('dialog', { name: 'Selecionar emoji' });
    expect(picker).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar emoji' }), { target: { value: 'sorriso' } });
    fireEvent.click(await screen.findByRole('button', { name: 'sorriso' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Escrever mensagem' })).toHaveValue('😀'));
    expect(screen.queryByRole('dialog', { name: 'Selecionar emoji' })).not.toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });
  it('keeps keyboard composition from triggering formatting or sending', () => {
    const send = vi.fn();
    render(<Harness onSend={send} />);
    const input = screen.getByRole('textbox', { name: 'Escrever mensagem' });
    fireEvent.change(input, { target: { value: 'teste' } });
    fireEvent.keyDown(input, { key: 'b', ctrlKey: true, isComposing: true });
    expect(input).toHaveValue('teste');
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(send).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'b', ctrlKey: true });
    expect(input).toHaveValue('teste**');
  });
});
