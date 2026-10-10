import type { Resource } from '../types/resources';
import type { AppIconName } from './AppIcon';

export type NavigationContext = 'Atendimento' | 'Produtividade' | 'Comunicação' | 'Gestão' | 'Preferências';
export type Availability = 'AVAILABLE' | 'RESERVED_ROUTE' | 'PLACEHOLDER' | 'PLANNED' | 'RESEARCH' | 'UNSUPPORTED' | 'DEPRECATED';
export interface NavigationItem {
  id: string;
  context: NavigationContext;
  label: string;
  icon: AppIconName;
  to?: string;
  permissions?: readonly string[];
  availability: Availability;
  // Core resource identifier. No inferred entitlement inclusion or permission codes.
  featureCode?: string;
  entitlement?: string;
  navigable?: boolean;
  disabledReason?: string;
}
export const navigationContexts: readonly NavigationContext[] = ['Atendimento', 'Produtividade', 'Comunicação', 'Gestão', 'Preferências'];
export const navigationItems: readonly NavigationItem[] = [
  { id: 'conversations', featureCode: 'chat.conversations', context: 'Atendimento', label: 'Conversas', icon: 'conversations', to: '/app/conversations', permissions: ['conversations.read'], availability: 'AVAILABLE' },
  { id: 'contacts', featureCode: 'chat.contacts', context: 'Atendimento', label: 'Contatos', icon: 'contacts', to: '/app/contacts', permissions: ['contacts.read'], availability: 'AVAILABLE' },
  { id: 'tags', featureCode: 'conversation.tags', context: 'Atendimento', label: 'Etiquetas', icon: 'tags', to: '/app/tags', availability: 'RESERVED_ROUTE' },
  { id: 'files', featureCode: 'chat.files', context: 'Atendimento', label: 'Arquivos', icon: 'files', to: '/app/files', availability: 'RESERVED_ROUTE' },
  { id: 'quick-replies', featureCode: 'chat.quick_replies', context: 'Produtividade', label: 'Respostas rápidas', icon: 'quickReplies', availability: 'PLANNED' },
  { id: 'automations', featureCode: 'chat.automations', context: 'Produtividade', label: 'Automações', icon: 'automations', availability: 'PLANNED' },
  { id: 'bots', featureCode: 'chat.bots', context: 'Produtividade', label: 'Bots de conversa', icon: 'bots', availability: 'PLANNED' },
  { id: 'campaigns', featureCode: 'chat.campaigns', context: 'Comunicação', label: 'Campanhas', icon: 'campaigns', availability: 'PLANNED' },
  { id: 'status', featureCode: 'whatsapp.status', context: 'Comunicação', label: 'Status', icon: 'status', availability: 'RESEARCH' },
  { id: 'calls', featureCode: 'calling.audio', context: 'Comunicação', label: 'Chamadas', icon: 'calls', availability: 'RESEARCH' },
  { id: 'team', featureCode: 'team.permissions', context: 'Gestão', label: 'Equipe e permissões', icon: 'team', to: '/app/team', permissions: ['team.read'], availability: 'AVAILABLE' },
  { id: 'providers', featureCode: 'providers.management', context: 'Gestão', label: 'Canais e integrações', icon: 'providers', to: '/app/settings/providers', permissions: ['providers.manage'], availability: 'AVAILABLE' },
  { id: 'demo', featureCode: 'providers.demo', context: 'Gestão', label: 'Simulador de contato', icon: 'providers', to: '/app/providers/demo/simulator', permissions: ['providers.simulate', 'messages.read'], availability: 'AVAILABLE' },
  { id: 'usage', featureCode: 'organization.usage', context: 'Gestão', label: 'Uso e custos', icon: 'usage', availability: 'PLANNED' },
  { id: 'billing', featureCode: 'organization.subscription', context: 'Gestão', label: 'Plano e assinatura', icon: 'billing', availability: 'PLANNED' },
  { id: 'settings', featureCode: 'chat.settings', context: 'Preferências', label: 'Configurações', icon: 'settings', to: '/app/settings', availability: 'PLACEHOLDER' },
];
export const availabilityLabels: Record<Resource['availability'], string> = {
  AVAILABLE: 'Indisponível', PLANNED: 'Em breve', RESEARCH: 'Em estudo',
  UNSUPPORTED: 'Indisponível', DEPRECATED: 'Descontinuado',
};
export function visibleNavigation(permissions: readonly string[], resources: readonly Resource[] = [], items: readonly NavigationItem[] = navigationItems) {
  const resolved = items.map((item) => {
    const resource = resources.find((resource) => resource.code === item.featureCode);
    const authorized = !item.permissions || item.permissions.every((permission) => permissions.includes(permission));
    const navigable = Boolean(resource?.availability === 'AVAILABLE' && resource.navigation && authorized && item.to && (item.availability === 'AVAILABLE' || item.availability === 'RESERVED_ROUTE'));
    // An entitlement identifier is not an entitlement decision. The current Core
    // contract supplies no plan inclusion state, so never infer “Não incluído”.
    const disabledReason = !resource ? 'Indisponível' : resource.availability !== 'AVAILABLE' ? availabilityLabels[resource.availability] : !authorized ? 'Acesso restrito' : 'Indisponível';
    return { ...item, navigable, disabledReason: navigable ? undefined : disabledReason };
  });
  return navigationContexts.map((context) => ({ context, items: resolved.filter((item) => item.context === context) })).filter((group) => group.items.length > 0);
}
export function isNavigationLink(item: NavigationItem) {
  return item.navigable === true && Boolean(item.to);
}
