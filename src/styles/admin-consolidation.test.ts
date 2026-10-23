import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function stylesheet(name: string) {
  return readFileSync(`src/styles/${name}`, 'utf8');
}

describe('F.2 — isolated administration CSS consolidation', () => {
  it('loads historical Team base after legacy globals and before all shadcn admin overrides', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    const imports = ['global.css', 'admin-base.css', 'admin-compact.css', 'settings-compact.css', 'admin-shadcn.css'];
    let last = -1;
    for (const name of imports) {
      const offset = main.indexOf(`./styles/${name}`);
      expect(offset, `${name} is imported`).toBeGreaterThan(last);
      last = offset;
    }
  });

  it('keeps Team and Permissions selectors out of global application CSS', () => {
    const global = stylesheet('global.css');
    expect(global).not.toMatch(/\.team-list\s+li\s*\{/);
    expect(global).not.toMatch(/\.team-page\s*\{/);
    expect(global).not.toMatch(/\.permission-row\s+select\s*\{/);

    const base = stylesheet('admin-base.css');
    expect(base).toContain(':where(.admin-compact-page).team-page {');
    expect(base).toContain(':where(.admin-compact-page) .permission-row select {');
    expect(base).toContain('@media (max-width: 720px)');
    expect(base).not.toContain(':where(.admin-compact-page) .team-page {');
  });

  it('keeps the design tokens, accessible focus and mobile tap sizes centralized', () => {
    const shadcn = stylesheet('admin-shadcn.css');
    const legacy = stylesheet('admin-compact.css');
    const settings = stylesheet('settings-compact.css');
    expect(shadcn).toContain('--admin-control-height: 36px');
    expect(shadcn).toContain('--admin-touch-height: 44px');
    expect(shadcn).toContain(':focus-visible');
    expect(shadcn).toContain('var(--accent)');
    expect(legacy).not.toContain('.contact-form input { min-height:38px');
    expect(settings).not.toContain('[data-slot="shadcn-button"]:disabled');
  });

  it('preserves Tailwind v4 without global Preflight and scoped legacy media rules', () => {
    const tailwind = stylesheet('shadcn.css');
    expect(tailwind).toContain('tailwindcss/utilities.css');
    expect(tailwind).not.toMatch(/@import\s+["']tailwindcss(?:\/preflight\.css)?["']/);
    expect(stylesheet('admin-base.css')).toContain(':where(.admin-compact-page)');
    expect(stylesheet('conversation-compact.css')).toContain('.chat-app-shell');
  });
});
