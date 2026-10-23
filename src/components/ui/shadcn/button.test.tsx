import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button, shadcnButtonVariants } from './button';

describe('shadcn Button (isolated official primitive)', () => {
  it('retains keyboard and default native semantics, without submit by default', () => {
    const action = vi.fn();
    render(<Button size="compact" variant="outline" onClick={action}>Abrir</Button>);
    const btn = screen.getByRole('button', { name: 'Abrir' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveAttribute('data-slot', 'shadcn-button');
    expect(btn).toHaveAttribute('data-size', 'compact');
    expect(btn.className).toContain('border-border');
    fireEvent.click(btn);
    expect(action).toHaveBeenCalledOnce();
  });
  it('does not trigger disabled actions and can explicitly submit a form', () => {
    const click = vi.fn();
    render(<><Button disabled onClick={click}>Indisponível</Button><Button type="submit">Salvar</Button></>);
    fireEvent.click(screen.getByRole('button', { name: 'Indisponível' }));
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'submit');
  });
  it('supports Radix Slot for accessible navigation links', () => {
    render(<Button asChild variant="ghost"><a href="/app/contacts">Contatos</a></Button>);
    const link = screen.getByRole('link', { name: 'Contatos' });
    expect(link).toHaveAttribute('href', '/app/contacts');
    expect(link).toHaveAttribute('data-slot', 'shadcn-button');
  });
  it('keeps variant and class merge deterministic', () => {
    expect(shadcnButtonVariants({ variant: 'outline', size: 'sm' })).toContain('bg-background');
    expect(shadcnButtonVariants({ variant: 'ghost', size: 'icon-sm' })).toContain('size-8');
  });
});
