import {
  ChevronDown, ContactRound, FileText, LogOut, MessagesSquare,
  PanelLeftClose, PanelLeftOpen, Plug, Settings, Tags, UsersRound,
} from 'lucide-react';

// Explicit imports keep the navigation independent of Lucide's full catalog.
const icons = {
  conversations: MessagesSquare,
  contacts: ContactRound,
  files: FileText,
  team: UsersRound,
  tags: Tags,
  settings: Settings,
  providers: Plug,
  collapse: PanelLeftClose,
  expand: PanelLeftOpen,
  logout: LogOut,
  chevron: ChevronDown,
};

export type AppIconName = keyof typeof icons;

export function AppIcon({ name }: { name: AppIconName }) {
  const Glyph = icons[name];
  return <Glyph className="app-icon" size={22} strokeWidth={2} aria-hidden="true" focusable="false" />;
}
