import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MessageComposer } from './MessageComposer';

function Harness({ onSend = () => undefined, mediaEnabled = false }: { onSend?: (text: string) => void; mediaEnabled?: boolean }) {
  const [draft, setDraft] = useState('');
  const [shortcut, setShortcut] = useState<'enter' | 'shift-enter'>('enter');
  return <MessageComposer draft={draft} onDraftChange={setDraft} onSubmit={event => { event.preventDefault(); onSend(draft); }} onTextKeyDown={event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); onSend(draft); }
  }} sending={false} disabled={false} mediaEnabled={mediaEnabled} attachment={null} onAttachmentChange={() => {}} shortcut={shortcut} onShortcutChange={setShortcut} />;
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
  it('keeps the textarea mounted when secondary tools are toggled', () => {
    const send = vi.fn();
    const view = render(<Harness onSend={send} mediaEnabled />);
    const input = screen.getByRole('textbox', { name: 'Escrever mensagem' });
    const fileInput = view.container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { value: 'mensagem preservada' } });
    const tools = screen.getByRole('button', { name: 'Mais ferramentas' });
    expect(tools).toHaveAttribute('aria-expanded', 'false');
    const strip = view.container.querySelector('.composer-secondary');
    expect(strip).not.toHaveClass('is-expanded');
    fireEvent.click(tools);
    expect(screen.getByRole('button', { name: 'Recolher ferramentas' })).toHaveAttribute('aria-expanded', 'true');
    expect(strip).toHaveClass('is-expanded');
    fireEvent.click(screen.getByRole('button', { name: 'Recolher ferramentas' }));
    expect(screen.getByRole('textbox', { name: 'Escrever mensagem' })).toBe(input);
    expect(screen.getByRole('textbox', { name: 'Escrever mensagem' })).toHaveValue('mensagem preservada');
    expect(view.container.querySelector('input[type="file"]')).toBe(fileInput);
    expect(send).not.toHaveBeenCalled();
  });
  it('moves the send shortcut into a closable preferences popover', () => {
    render(<Harness />);
    expect(screen.queryByRole('combobox', { name: 'Atalho de envio' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preferências de envio' }));
    const panel = screen.getByRole('group', { name: 'Preferências de envio' });
    const select = screen.getByRole('combobox', { name: 'Atalho de envio' });
    expect(select).toHaveFocus();
    fireEvent.change(select, { target: { value: 'shift-enter' } });
    expect(select).toHaveValue('shift-enter');
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.queryByRole('combobox', { name: 'Atalho de envio' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preferências de envio' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Preferências de envio' }));
    expect(screen.getByRole('combobox', { name: 'Atalho de envio' })).toHaveValue('shift-enter');
  });
  it('keeps exactly one emoji trigger and does not send while opening overlays', async () => {
    const send = vi.fn();
    render(<Harness onSend={send} />);
    expect(screen.getAllByRole('button', { name: 'Emojis' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Emojis' }));
    expect(await screen.findByRole('dialog', { name: 'Selecionar emoji' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mais ferramentas' }));
    expect(screen.getByRole('textbox', { name: 'Escrever mensagem' })).toHaveValue('');
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
