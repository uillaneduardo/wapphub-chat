import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Input } from './input';
import { Badge } from './badge';

describe('shadcn form/metadata primitives', () => {
  it('preserves native input attributes, changes and readonly state', () => {
    const onChange = vi.fn();
    render(<><Input aria-label="Nome" density="compact" maxLength={120} required onChange={onChange} />
      <Input aria-label="E-mail" readOnly value="teste@example.test" /></>);
    const name = screen.getByRole('textbox', { name: 'Nome' });
    fireEvent.change(name, { target: { value: 'Ana' } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(name).toHaveAttribute('maxlength', '120');
    expect(name).toHaveAttribute('data-density', 'compact');
    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveAttribute('readonly');
  });
  it('does not expose a badge as a button or imply permissions', () => {
    render(<Badge variant="secondary">Em desenvolvimento</Badge>);
    expect(screen.getByText('Em desenvolvimento')).toHaveAttribute('data-slot', 'shadcn-badge');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
