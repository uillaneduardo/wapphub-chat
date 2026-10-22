import { useEffect, useMemo, useRef, useState } from 'react';
import { emojiCategories, type EmojiOption } from './emojiData';

const recent: EmojiOption[] = [];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Rostos');
  const [version, setVersion] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const results = useMemo(() => {
    const query = normalize(search.trim());
    if (query) return emojiCategories.flatMap(section => section.items).filter(item => normalize(item.name).includes(query) || item.emoji.includes(query));
    if (category === 'Recentes') return [...recent];
    return emojiCategories.find(section => section.name === category)?.items ?? [];
  }, [search, category, version]);
  function pick(item: EmojiOption) {
    const index = recent.findIndex(old => old.emoji === item.emoji);
    if (index >= 0) recent.splice(index, 1);
    recent.unshift(item); recent.splice(12);
    setVersion(value => value + 1);
    onPick(item.emoji);
  }
  return <div className="emoji-picker" role="dialog" aria-label="Selecionar emoji" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    // Never submit the parent composer form from the picker.
    if (event.key === 'Enter' && event.target === input.current) event.preventDefault();
  }}>
    <div className="emoji-picker-header">
      <strong>Emojis</strong>
      <button type="button" aria-label="Fechar emojis" onClick={onClose}>×</button>
    </div>
    <input ref={input} type="search" aria-label="Buscar emoji" placeholder="Buscar emoji..." value={search} onChange={event => setSearch(event.target.value)} />
    {!search && <div className="emoji-picker-tabs" role="group" aria-label="Categorias de emojis">
      {['Recentes', ...emojiCategories.map(section => section.name)].map(name => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
    </div>}
    <div className="emoji-picker-grid" aria-label="Emojis disponíveis">
      {results.map(item => <button type="button" key={item.emoji} aria-label={item.name} title={item.name} onClick={() => pick(item)}>{item.emoji}</button>)}
      {!results.length && <p className="muted">Nenhum emoji encontrado.</p>}
    </div>
  </div>;
}
