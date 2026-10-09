import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TeamMember } from '../types/chat';
interface Props { id: string; members: TeamMember[]; value: string; onChange: (value: string) => void; disabled?: boolean; loading?: boolean; excludeUserId?: string }
export function UserSelect({ id, members, value, onChange, disabled, loading, excludeUserId }: Props) {
  const listId = useId(); const input = useRef<HTMLInputElement>(null); const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [active, setActive] = useState(-1);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 240 });
  const selected = members.find((member) => member.userId === value);
  const eligible = (member: TeamMember) => member.canReceiveAssignment && member.status === 'ACTIVE' && member.userId !== excludeUserId;
  const filtered = members.filter((member) => `${member.name} ${member.email}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const expanded = open && !disabled && !loading;
  useLayoutEffect(() => {
    if (!expanded) return;
    function place() {
      const rect = input.current!.getBoundingClientRect(); const margin = 8;
      const below = window.innerHeight - rect.bottom - margin; const above = rect.top - margin;
      const height = Math.max(0, Math.min(240, Math.max(below, above) - margin)); const width = Math.min(rect.width, window.innerWidth - margin * 2);
      setPosition({ left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)), top: below >= Math.min(240, above) ? rect.bottom + 4 : Math.max(margin, rect.top - height - 4), width, maxHeight: height });
    }
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [expanded]);
  useEffect(() => {
    if (!expanded) return;
    function outside(event: PointerEvent) { if (!input.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside);
  }, [expanded]);
  useEffect(() => { if (expanded) popup.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' }); }, [active, expanded]);
  function choose(member: TeamMember) { if (!eligible(member)) return; onChange(member.userId); setQuery(''); setOpen(false); setActive(-1); input.current?.focus(); }
  return <div className="user-select"><input ref={input} id={id} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? listId : undefined} aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
    disabled={disabled || loading} placeholder={loading ? 'Carregando equipe…' : 'Buscar por nome ou e-mail'} value={expanded ? query : selected?.name ?? ''}
    onClick={() => { setQuery(''); setActive(-1); setOpen(true); }} onBlur={(event) => { if (!popup.current?.contains(event.relatedTarget)) setOpen(false); }} onChange={(event) => { setQuery(event.target.value); setActive(-1); setOpen(true); }}
    onKeyDown={(event) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key === 'Tab') setOpen(false);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        if (!expanded && ['Home', 'End'].includes(event.key)) return;
        event.preventDefault(); setOpen(true); const indices = filtered.flatMap((member, index) => eligible(member) ? [index] : []); const current = indices.indexOf(active);
        const next = event.key === 'Home' ? indices[0] : event.key === 'End' ? indices.at(-1) : event.key === 'ArrowDown' ? indices[(current + 1) % indices.length] : indices[(current < 0 ? indices.length - 1 : current - 1 + indices.length) % indices.length]; setActive(next ?? -1);
      }
      if (event.key === 'Enter' && expanded) { event.preventDefault(); if (filtered[active]) choose(filtered[active]); }
    }} />{selected && <small className="selected-user-email">{selected.email}</small>}
    {expanded && createPortal(<div ref={popup} className="user-select-popup" style={position} onMouseDown={(event) => event.preventDefault()}><div role="listbox" id={listId} aria-label="Pessoas da equipe">{filtered.map((member, index) => <div key={member.userId} id={`${listId}-${index}`} role="option" aria-selected={member.userId === value} aria-disabled={!eligible(member)} data-active={index === active} className="user-select-option" onClick={() => choose(member)}><strong>{member.name}{member.userId === value ? ' ✓' : ''}</strong><span>{member.email}</span>{!eligible(member) && <small>Indisponível para receber esta conversa</small>}</div>)}</div>{!filtered.length && <p role="status">Nenhuma pessoa encontrada.</p>}</div>, document.body)}
  </div>;
}
