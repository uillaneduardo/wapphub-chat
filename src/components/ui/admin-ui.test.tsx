import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PageHeader } from './page-header';
import { StatusPill } from './status-pill';

describe('compact admin presentation primitives', () => {
  it('keeps a single accessible heading with description and an independent action', () => {
    const create = vi.fn();
    render(<PageHeader eyebrow="ORGANIZAÇÃO" title="Contatos"
      description="Contatos da organização ativa"
      actions={<button type="button" onClick={create}>Novo contato</button>} />);
    expect(screen.getByRole('heading', { name: 'Contatos', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Contatos da organização ativa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Novo contato' }));
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('renders compact status without creating an interactive or permission-granting control', () => {
    const view = render(<StatusPill tone="success">Ativo</StatusPill>);
    const pill = screen.getByText('Ativo');
    expect(pill).toHaveAttribute('data-tone', 'success');
    expect(pill).toHaveAttribute('data-slot', 'status-pill');
    expect(view.container.querySelector('button, a')).toBeNull();
  });
});
