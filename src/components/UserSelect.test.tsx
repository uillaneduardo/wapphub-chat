import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { UserSelect } from './UserSelect';
const members = [
  { userId: 'a', name: 'Ana Silva', email: 'ana@example.test', status: 'ACTIVE' as const, canReceiveAssignment: true },
  { userId: 'b', name: 'Rafa Lima', email: 'rafa@example.test', status: 'ACTIVE' as const, canReceiveAssignment: true },
  { userId: 'c', name: 'Inativo', email: 'inactive@example.test', status: 'ACTIVE' as const, canReceiveAssignment: false },
];
function setup(props = {}) { const change = vi.fn(); render(<><label htmlFor="person">Pessoa</label><UserSelect id="person" members={members} value="" onChange={change} {...props} /><button>Fora</button></>); return { input: screen.getByRole('combobox'), change }; }
describe('UserSelect', () => {
  it('searches names and emails, selects and closes', () => {
    const { input, change } = setup(); fireEvent.change(input, { target: { value: 'SILVA' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.change(input, { target: { value: 'rafa@' } }); fireEvent.click(screen.getByRole('option'));
    expect(change).toHaveBeenCalledWith('b'); expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
  it('navigates with arrows, Home/End and Enter, skipping disabled users', () => {
    const { input, change } = setup(); fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'End' });
    expect(input.getAttribute('aria-activedescendant')).toMatch(/-1$/);
    fireEvent.keyDown(input, { key: 'Home' }); fireEvent.keyDown(input, { key: 'ArrowUp' }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(change).toHaveBeenCalledWith('b');
  });
  it('closes with Escape, Tab, blur and outside pointer', () => {
    const { input } = setup();
    for (const key of ['Escape', 'Tab']) { fireEvent.click(input); fireEvent.keyDown(input, { key }); expect(input).toHaveAttribute('aria-expanded', 'false'); }
    fireEvent.click(input); fireEvent.pointerDown(screen.getByRole('button', { name: 'Fora' })); expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(input); fireEvent.blur(input); expect(input).toHaveAttribute('aria-expanded', 'false');
  });
  it('shows empty results and prevents excluded selection', () => {
    const { input, change } = setup({ excludeUserId: 'a' }); fireEvent.click(input); fireEvent.click(screen.getByRole('option', { name: /Ana/ })); expect(change).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'inexistente' } }); expect(screen.getByRole('status')).toHaveTextContent('Nenhuma pessoa encontrada');
  });
  it('does not open when disabled', () => { const { input } = setup({ disabled: true }); expect(input).toBeDisabled(); fireEvent.click(input); expect(screen.queryByRole('listbox')).not.toBeInTheDocument(); });
  it('supports loading and disabled states and separates selected email', () => {
    const { input } = setup({ loading: true, value: 'a' }); expect(input).toBeDisabled(); expect(screen.getByText('ana@example.test')).toBeInTheDocument();
  });
});
