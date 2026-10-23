import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import { Button } from '../components/ui/shadcn/button';

describe('contact action and new conversation style contract', () => {
  it('keeps primary link actions as links while carrying the shadcn variant', () => {
    render(<MemoryRouter><Button asChild size="compact" className="contact-create-link">
      <Link to="/app/conversations/new?contactId=one">Nova conversa interna</Link>
    </Button></MemoryRouter>);
    const link = screen.getByRole('link', { name: 'Nova conversa interna' });
    expect(link).toHaveAttribute('href', '/app/conversations/new?contactId=one');
    expect(link).toHaveAttribute('data-slot', 'shadcn-button');
    expect(link).toHaveAttribute('data-variant', 'default');
  });

  it('sets unlayered primary contrast to override legacy global anchor color', () => {
    const global = readFileSync('src/styles/global.css', 'utf8');
    const shadcn = readFileSync('src/styles/shadcn.css', 'utf8');
    expect(global).toContain('a { color: var(--accent);');
    expect(shadcn).toMatch(/\[data-slot="shadcn-button"\]\[data-variant="default"\]\s*\{[^}]*background-color:\s*var\(--accent\);[^}]*color:\s*var\(--accent-contrast\);/);
    expect(shadcn).toContain('background-color: var(--accent-hover)');
  });

  it('keeps compact channel styling scoped and loaded after the baseline', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    const css = readFileSync('src/styles/new-conversation-compact.css', 'utf8');
    expect(main.indexOf("./styles/new-conversation-compact.css")).toBeGreaterThan(main.indexOf("./styles/global.css"));
    expect(css).toContain('.new-conversation-compact .conversation-channel-field');
    expect(css).toContain('[data-slot="shadcn-native-select"]');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain(':focus-visible');
  });
});
