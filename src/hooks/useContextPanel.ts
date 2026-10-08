import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useMediaQuery } from './useMediaQuery';
import { DEFAULT_CONTEXT_WIDTH, useUiPreference } from './useUiPreference';

export const MIN_CONTEXT_WIDTH = 240;
export const MAX_CONTEXT_WIDTH = 480;
const MIN_HISTORY_WIDTH = 320;
const SEPARATOR_WIDTH = 8;
export function contextLimits(available: number, wide: boolean) {
  const max = Math.min(MAX_CONTEXT_WIDTH, Math.floor(available - MIN_HISTORY_WIDTH - SEPARATOR_WIDTH));
  return { inline: wide && max >= MIN_CONTEXT_WIDTH, max: Math.max(MIN_CONTEXT_WIDTH, max) };
}
const clamp = (value: number, max: number) => Math.round(Math.max(MIN_CONTEXT_WIDTH, Math.min(max, value)));

export function useContextPanel(userId: string | undefined, ready: boolean) {
  const [preferred, setPreferred] = useUiPreference(userId, 'contextWidth');
  const wide = useMediaQuery('(min-width: 1051px)'); const bodyRef = useRef<HTMLDivElement>(null); const contextId = useId();
  const [available, setAvailable] = useState(0); const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const drag = useRef<{ id: number; x: number; start: number; width: number; target: HTMLDivElement } | null>(null);
  const limits = contextLimits(available, wide); const width = clamp(liveWidth ?? preferred, limits.max);
  useLayoutEffect(() => {
    const node = bodyRef.current; if (!ready || !node) return;
    const measure = () => setAvailable(node.getBoundingClientRect().width);
    measure(); window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure); observer?.observe(node);
    return () => { window.removeEventListener('resize', measure); observer?.disconnect(); };
  }, [ready]);
  function end(commit: boolean) {
    const current = drag.current; if (!current) return;
    drag.current = null; if (commit) setPreferred(clamp(current.width, limits.max)); setLiveWidth(null);
    if (current.target.hasPointerCapture?.(current.id)) current.target.releasePointerCapture(current.id);
  }
  useLayoutEffect(() => {
    if (!limits.inline && drag.current) {
      const current = drag.current; drag.current = null; setLiveWidth(null);
      if (current.target.hasPointerCapture?.(current.id)) current.target.releasePointerCapture(current.id);
    }
  }, [limits.inline]);
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!limits.inline || event.button !== 0 || drag.current) return;
    event.preventDefault(); event.currentTarget.focus();
    drag.current = { id: event.pointerId, x: event.clientX, start: width, width, target: event.currentTarget };
    event.currentTarget.setPointerCapture?.(event.pointerId); setLiveWidth(width);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current; if (!current || event.pointerId !== current.id || !limits.inline) return;
    current.width = clamp(current.start + current.x - event.clientX, limits.max); setLiveWidth(current.width);
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!limits.inline) return;
    const step = event.shiftKey ? 64 : 16;
    const next = event.key === 'ArrowLeft' ? width + step : event.key === 'ArrowRight' ? width - step : event.key === 'Home' ? MIN_CONTEXT_WIDTH : event.key === 'End' ? limits.max : null;
    if (next !== null) { event.preventDefault(); end(false); setPreferred(clamp(next, limits.max)); }
    if (event.key === 'Escape') end(false);
  }
  function restore() { end(false); setPreferred(DEFAULT_CONTEXT_WIDTH); }
  return { bodyRef, contextId, inline: limits.inline, width, maxWidth: limits.max, resizing: liveWidth !== null, restore, separatorProps: {
    onPointerDown, onPointerMove, onKeyDown,
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => { if (event.pointerId === drag.current?.id) end(true); },
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => { if (event.pointerId === drag.current?.id) end(false); },
    onLostPointerCapture: () => end(false),
  } };
}
