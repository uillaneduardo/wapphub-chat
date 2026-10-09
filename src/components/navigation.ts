import type { AppIconName } from './AppIcon';

export type NavigationContext = 'Atendimento' | 'Produtividade' | 'Comunicação' | 'Gestão' | 'Preferências';
export type Availability = 'AVAILABLE' | 'RESERVED_ROUTE' | 'PLACEHOLDER' | 'PLANNED' | 'RESEARCH' | 'UNSUPPORTED';
export interface NavigationItem {
  id: string;
  context: NavigationContext;
  label: string;
  icon: AppIconName;
  to?: string;
  permissions?: readonly string[];
  availability: Availability;
  // Reserved for a real Core catalog. No inferred feature or entitlement codes.
  featureCode?: string;
  entitlement?: string;
}
export const navigationContexts: readonly NavigationContext[] = ['Atendimento', 'Produtividade', 'Comunicação', 'Gestão', 'Preferências'];
export const navigationItems: readonly NavigationItem[] = [
  { id: 'conversations', context: 'Atendimento', label: 'Conversas', icon: 'conversations', to: '/app/conversations', permissions: ['conversations.read'], availability: 'AVAILABLE' },
  { id: 'contacts', context: 'Atendimento', label: 'Contatos', icon: 'contacts', to: '/app/contacts', permissions: ['contacts.read'], availability: 'AVAILABLE' },
  { id: 'tags', context: 'Atendimento', label: 'Etiquetas', icon: 'tags', to: '/app/tags', availability: 'RESERVED_ROUTE' },
  { id: 'files', context: 'Atendimento', label: 'Arquivos', icon: 'files', to: '/app/files', availability: 'RESERVED_ROUTE' },
  { id: 'quick-replies', context: 'Produtividade', label: 'Respostas rápidas', icon: 'quickReplies', availability: 'PLANNED' },
  { id: 'automations', context: 'Produtividade', label: 'Automações', icon: 'automations', availability: 'PLANNED' },
  { id: 'bots', context: 'Produtividade', label: 'Bots de conversa', icon: 'bots', availability: 'PLANNED' },
  { id: 'campaigns', context: 'Comunicação', label: 'Campanhas', icon: 'campaigns', availability: 'PLANNED' },
  { id: 'status', context: 'Comunicação', label: 'Status', icon: 'status', availability: 'RESEARCH' },
  { id: 'calls', context: 'Comunicação', label: 'Chamadas', icon: 'calls', availability: 'RESEARCH' },
  { id: 'team', context: 'Gestão', label: 'Equipe e permissões', icon: 'team', to: '/app/team', availability: 'PLACEHOLDER' },
  { id: 'providers', context: 'Gestão', label: 'Canais e integrações', icon: 'providers', to: '/app/settings/providers', permissions: ['providers.manage'], availability: 'AVAILABLE' },
  { id: 'demo', context: 'Gestão', label: 'Simulador Demo', icon: 'providers', to: '/app/providers/demo/simulator', permissions: ['providers.simulate', 'messages.read'], availability: 'AVAILABLE' },
  { id: 'usage', context: 'Gestão', label: 'Uso e custos', icon: 'usage', availability: 'PLANNED' },
  { id: 'billing', context: 'Gestão', label: 'Plano e assinatura', icon: 'billing', availability: 'PLANNED' },
  { id: 'settings', context: 'Preferências', label: 'Configurações', icon: 'settings', to: '/app/settings', availability: 'PLACEHOLDER' },
];
export function visibleNavigation(permissions: readonly string[], items: readonly NavigationItem[] = navigationItems) {
  const visible = items.filter((item) => !item.permissions || item.permissions.every((permission) => permissions.includes(permission)));
  // A simulation-only session retains the existing channels entry point.
  const providers = visible.find((item) => item.id === 'providers');
  const demo = visible.find((item) => item.id === 'demo');
  const resolved = !providers && demo ? visible.map((item) => item.id === 'demo' ? { ...item, label: 'Canais e integrações' } : item) : visible;
  return navigationContexts.map((context) => ({ context, items: resolved.filter((item) => item.context === context) })).filter((group) => group.items.length > 0);
}

export function isNavigationLink(item: NavigationItem) {
  return Boolean(item.to && (item.availability === 'AVAILABLE' || item.availability === 'RESERVED_ROUTE'));
}
