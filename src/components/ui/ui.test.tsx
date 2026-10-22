import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Avatar, AvatarFallback, AvatarImage, ContactAvatar, avatarInitials } from './avatar';
import { Separator } from './separator';
import { Tooltip } from './tooltip';

describe('compact UI foundation', () => {
  it('keeps button variants, native type and keyboard-accessible focus target', () => {
    render(<><Button size="compact" variant="outline">Abrir</Button><Button type="submit" disabled>Enviar</Button></>);
    const open = screen.getByRole('button', { name: 'Abrir' });
    expect(open).toHaveAttribute('type', 'button');
    expect(open).toHaveAttribute('data-variant', 'outline');
    expect(open).toHaveAttribute('data-size', 'compact');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit');
  });
  it('preserves native input and textarea attributes', () => {
    render(<><Input aria-label="Busca" density="compact" placeholder="Pesquisar" required /><Textarea aria-label="Mensagem" maxLength={8000} rows={2} /></>);
    expect(screen.getByRole('textbox', { name: 'Busca' })).toHaveAttribute('required');
    expect(screen.getByRole('textbox', { name: 'Busca' })).toHaveAttribute('data-density', 'compact');
    expect(screen.getByRole('textbox', { name: 'Mensagem' })).toHaveAttribute('maxlength', '8000');
  });
  it('generates Unicode-aware avatar fallback, with no external photo request', () => {
    expect(avatarInitials('Mauá Tecnologia')).toBe('MT');
    expect(avatarInitials(' Elaine ')).toBe('E');
    expect(avatarInitials('  ')).toBe('?');
    const view = render(<ContactAvatar name="Elaine" large />);
    expect(view.container.querySelector('[data-slot="avatar"]')).toHaveAttribute('data-size', 'large');
    expect(view.container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('E');
    expect(view.container.querySelector('img')).toBeNull();
  });
  it('shows fallback when an explicitly supplied avatar image cannot load', () => {
    const view = render(<Avatar><AvatarImage src="/photo-with-permission" alt="" /><AvatarFallback>MT</AvatarFallback></Avatar>);
    const image = view.container.querySelector('img')!;
    expect(image).not.toBeNull();
    fireEvent.error(image);
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('MT');
  });
  it('marks decorative separators correctly and exposes semantic ones', () => {
    const view = render(<><Separator /><Separator orientation="vertical" decorative={false} aria-label="Separador" /></>);
    expect(view.container.querySelector('[data-slot="separator"][role="none"]')).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Separador' })).toHaveAttribute('aria-orientation', 'vertical');
  });
  it('describes a real keyboard-focusable tooltip trigger without changing its action', () => {
    render(<Tooltip label="Abrir detalhes"><Button variant="ghost" aria-label="Detalhes">Detalhes</Button></Tooltip>);
    const trigger = screen.getByRole('button', { name: 'Detalhes' });
    const tooltip = screen.getByRole('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toContain(tooltip.id);
    trigger.focus();
    expect(trigger).toHaveFocus();
  });
});
