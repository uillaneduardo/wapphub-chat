import type { SendShortcut } from '../hooks/useUiPreference';
export function SendPreference({ value, onChange }: { value: SendShortcut; onChange: (value: SendShortcut) => void }) {
  return <label className="send-preference"><span className="sr-only">Atalho de envio</span><select value={value} onChange={(event) => onChange(event.target.value as SendShortcut)}><option value="enter">Enter para enviar</option><option value="shift-enter">Shift+Enter para enviar</option></select></label>;
}
