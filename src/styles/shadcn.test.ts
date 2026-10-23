import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('isolated Tailwind v4 bootstrap', () => {
  it('imports utilities and theme without loading the global Preflight reset', () => {
    const css = readFileSync('src/styles/shadcn.css', 'utf8');
    expect(css).toContain('@import "tailwindcss/theme.css" layer(theme)');
    expect(css).toContain('@import "tailwindcss/utilities.css" layer(utilities)');
    expect(css).not.toMatch(/@import\s+["']tailwindcss["']/);
    expect(css).not.toMatch(/@import\s+["']tailwindcss\/preflight\.css["']/);
    expect(css).toContain('--color-primary: var(--accent)');
    expect(css).toContain('--color-border: var(--border)');
  });
});
