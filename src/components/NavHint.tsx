import { cloneElement, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
export function NavHint({ label, enabled, children }: { label: string; enabled: boolean; children: ReactElement<{ 'aria-describedby'?: string }> }) {
  const id = useId(); const ref = useRef<HTMLSpanElement>(null); const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  function show() { const rect = ref.current?.getBoundingClientRect(); if (!enabled || !rect) return; setPosition({ left: Math.max(8, Math.min(rect.right + 8, window.innerWidth - 190)), top: Math.max(8, Math.min(rect.top, window.innerHeight - 50)) }); setOpen(true); }
  return <span ref={ref} className="nav-hint" onMouseEnter={show} onMouseLeave={() => setOpen(false)} onFocus={show} onBlur={() => setOpen(false)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
    {cloneElement(children, { 'aria-describedby': enabled ? id : undefined })}
    {enabled && createPortal(<span hidden={!open} role="tooltip" id={id} className="nav-tooltip" style={position}>{label}</span>, document.body)}
  </span>;
}
