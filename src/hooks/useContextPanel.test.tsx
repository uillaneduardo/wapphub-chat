import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextSeparator } from '../components/ContextSeparator';
import { contextLimits, useContextPanel } from './useContextPanel';
import { preferenceKey } from './useUiPreference';
function Panel() {
  const panel = useContextPanel('resize-user', true);
  return <div ref={panel.bodyRef}>{panel.inline && <ContextSeparator panel={panel} />}<aside id={panel.contextId}><button onClick={panel.restore}>Restaurar</button></aside><output>{panel.width}</output></div>;
}
let available = 900;
function geometry() { vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: available, height: 500, top: 0, bottom: 500, left: 0, right: available, x: 0, y: 0, toJSON: () => ({}) })); }
describe('context splitter without a browser', () => {
  beforeEach(() => {
    available = 900; localStorage.clear(); geometry();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('PointerEvent', class extends MouseEvent { pointerId: number; constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; } });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('enforces static and dynamic limits with a usable history width', () => {
    expect(contextLimits(900, true)).toEqual({ inline: true, max: 480 }); expect(contextLimits(600, true)).toEqual({ inline: true, max: 272 });
    expect(contextLimits(550, true).inline).toBe(false); expect(contextLimits(900, false).inline).toBe(false);
  });
  it('uses pointer capture, constrains drag and persists only at pointer-up', () => {
    const view = render(<Panel />); const handle = screen.getByRole('separator'); const capture = vi.fn(); const release = vi.fn();
    Object.assign(handle, { setPointerCapture: capture, hasPointerCapture: () => true, releasePointerCapture: release });
    fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientX: 200 }); fireEvent.pointerMove(handle, { pointerId: 2, clientX: 500 }); expect(handle).toHaveAttribute('aria-valuenow', '240'); fireEvent.pointerMove(handle, { pointerId: 2, clientX: -200 });
    expect(handle).toHaveAttribute('aria-valuenow', '480'); expect(handle).toHaveClass('is-resizing'); expect(localStorage.getItem(preferenceKey('resize-user'))).toBeNull();
    fireEvent.pointerUp(handle, { pointerId: 2 }); expect(capture).toHaveBeenCalledWith(2); expect(release).toHaveBeenCalledWith(2);
    expect(JSON.parse(localStorage.getItem(preferenceKey('resize-user'))!).contextWidth).toBe(480); expect(handle).not.toHaveClass('is-resizing');
    view.unmount(); render(<Panel />); expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '480');
  });
  it('supports keyboard resizing, bounds, and restoring the default', () => {
    render(<Panel />); const handle = screen.getByRole('separator'); expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(document.getElementById(handle.getAttribute('aria-controls')!)).toBeInTheDocument();
    fireEvent.keyDown(handle, { key: 'ArrowLeft' }); expect(handle).toHaveAttribute('aria-valuenow', '316');
    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true }); expect(handle).toHaveAttribute('aria-valuenow', '252');
    fireEvent.keyDown(handle, { key: 'Home' }); expect(handle).toHaveAttribute('aria-valuenow', '240');
    fireEvent.keyDown(handle, { key: 'End' }); expect(handle).toHaveAttribute('aria-valuenow', '480');
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' })); expect(handle).toHaveAttribute('aria-valuenow', '300');
  });
  it('cancels a drag and ignores secondary and unrelated pointers', () => {
    render(<Panel />); const handle = screen.getByRole('separator'); fireEvent.pointerDown(handle, { button: 2, clientX: 200 }); expect(handle).not.toHaveClass('is-resizing');
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 200 }); fireEvent.pointerMove(handle, { pointerId: 5, clientX: -500 }); expect(handle).toHaveAttribute('aria-valuenow', '300');
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: -500 }); fireEvent.pointerCancel(handle, { pointerId: 1 }); expect(handle).toHaveAttribute('aria-valuenow', '300'); expect(localStorage.getItem(preferenceKey('resize-user'))).toBeNull();
  });
  it('does not render a draggable separator at the responsive breakpoint', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(<Panel />); expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
  it('clamps to available space without overwriting the preferred width, and stacks when cramped', () => {
    localStorage.setItem(preferenceKey('resize-user'), JSON.stringify({ contextWidth: 480 })); render(<Panel />);
    available = 600; act(() => window.dispatchEvent(new Event('resize'))); expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '272');
    available = 550; act(() => window.dispatchEvent(new Event('resize'))); expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    available = 900; act(() => window.dispatchEvent(new Event('resize'))); expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '480');
  });
});
