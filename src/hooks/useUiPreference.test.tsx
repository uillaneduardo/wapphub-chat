import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preferenceKey, useUiPreference } from './useUiPreference';
function Probe({ user, label = 'Preferência' }: { user: string; label?: string }) {
  const [collapsed, setCollapsed] = useUiPreference(user, 'sidebarCollapsed');
  const [shortcut, setShortcut] = useUiPreference(user, 'sendShortcut');
  const [width] = useUiPreference(user, 'contextWidth');
  return <section aria-label={label}><output aria-label={label}>{`${collapsed}:${shortcut}:${width}`}</output><button onClick={() => setCollapsed(!collapsed)}>Alternar {label}</button><button onClick={() => setShortcut('shift-enter')}>Atalho {label}</button></section>;
}
describe('account-local UI preferences', () => {
  beforeEach(() => localStorage.clear()); afterEach(() => vi.restoreAllMocks());
  it('persists only cosmetic values and restores them on remount', () => {
    const view = render(<Probe user="a" />); fireEvent.click(screen.getByRole('button', { name: 'Alternar Preferência' })); fireEvent.click(screen.getByRole('button', { name: 'Atalho Preferência' }));
    expect(JSON.parse(localStorage.getItem(preferenceKey('a'))!)).toEqual({ sidebarCollapsed: true, contextWidth: 300, sendShortcut: 'shift-enter' });
    view.unmount(); render(<Probe user="a" />); expect(screen.getByRole('status')).toHaveTextContent('true:shift-enter:300');
  });
  it('isolates accounts even when the same mounted hook changes users', () => {
    const view = render(<Probe user="a" />); fireEvent.click(screen.getByRole('button', { name: 'Alternar Preferência' }));
    view.rerender(<Probe user="b" />); expect(screen.getByRole('status')).toHaveTextContent('false:enter:300');
    view.rerender(<Probe user="a" />); expect(screen.getByRole('status')).toHaveTextContent('true:enter:300');
  });
  it('synchronizes multiple composers in the same window and storage events from other tabs', () => {
    render(<><Probe user="a" label="Principal" /><Probe user="a" label="Demo" /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Atalho Principal' })); expect(screen.getByRole('status', { name: 'Demo' })).toHaveTextContent('shift-enter');
    localStorage.setItem(preferenceKey('a'), JSON.stringify({ sendShortcut: 'enter', contextWidth: 360 }));
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: preferenceKey('a') })));
    expect(screen.getByRole('status', { name: 'Principal' })).toHaveTextContent('false:enter:360');
  });
  it('defaults invalid data and clamps numeric stored widths', () => {
    localStorage.setItem(preferenceKey('bad'), '{invalid'); const view = render(<Probe user="bad" />); expect(screen.getByRole('status')).toHaveTextContent('false:enter:300');
    localStorage.setItem(preferenceKey('other'), JSON.stringify({ contextWidth: 999, sendShortcut: 'invalid', sidebarCollapsed: 'true' }));
    view.rerender(<Probe user="other" />); expect(screen.getByRole('status')).toHaveTextContent('false:enter:480');
  });
  it('keeps controls working in memory when storage writes are blocked', () => {
    localStorage.setItem(preferenceKey('blocked-write'), JSON.stringify({ sidebarCollapsed: false, contextWidth: 350 }));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota'); });
    render(<Probe user="blocked-write" />); fireEvent.click(screen.getByRole('button', { name: 'Alternar Preferência' }));
    expect(screen.getByRole('status')).toHaveTextContent('true:enter:350');
  });
  it('handles blocked reads without leaking an account preference', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked'); });
    render(<Probe user="blocked-read" />); expect(screen.getByRole('status')).toHaveTextContent('false:enter:300');
  });
});
