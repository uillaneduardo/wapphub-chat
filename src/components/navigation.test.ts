import { resourceFixture } from '../test/resourceFixture';
import { describe, expect, it } from 'vitest';
import { isNavigationLink, navigationItems, visibleNavigation } from './navigation';

describe('declarative context navigation', () => {
  it('uses stable unique ids and ordered contexts', () => {
    expect(new Set(navigationItems.map((item) => item.id)).size).toBe(navigationItems.length);
    expect(visibleNavigation(['conversations.read', 'contacts.read', 'providers.manage', 'team.read'], resourceFixture).map((group) => group.context)).toEqual(['Atendimento', 'Produtividade', 'Comunicação', 'Gestão', 'Preferências']);
  });
  it('keeps public items visible but gates routes by real effective permissions, including both Demo permissions', () => {
    const links = (permissions: string[]) => visibleNavigation(permissions, resourceFixture).flatMap((group) => group.items).filter(isNavigationLink);
    expect(links([])).toEqual([]); expect(links(['OWNER'])).toEqual([]);
    expect(links(['contacts.read']).map((item) => item.id)).toEqual(['contacts']);
    expect(links(['providers.simulate'])).toEqual([]);
    expect(links(['providers.simulate', 'messages.read'])[0]).toMatchObject({ id: 'demo', label: 'Simulador Demo', to: '/app/providers/demo/simulator' });
    expect(visibleNavigation([], resourceFixture).flatMap((group) => group.items)).toHaveLength(navigationItems.length);
  });
  it('never turns planned, research, unsupported or placeholder items into links', () => {
    for (const item of navigationItems.filter((item) => !['AVAILABLE', 'RESERVED_ROUTE'].includes(item.availability))) expect(isNavigationLink(item)).toBe(false);
    expect(isNavigationLink({ ...navigationItems[0], availability: 'UNSUPPORTED' })).toBe(false);
    expect(navigationItems.every((item) => item.featureCode && !item.entitlement)).toBe(true);
    expect(visibleNavigation(['conversations.read'], []).flatMap((group) => group.items).filter(isNavigationLink)).toEqual([]);
    expect(visibleNavigation(['conversations.read'], resourceFixture.map((resource) => ({ ...resource, availability: 'PLANNED' }))).flatMap((group) => group.items).filter(isNavigationLink)).toEqual([]);
  });
  it('preserves M1 route destinations and explicitly identifies reserved catalogs', () => {
    expect(Object.fromEntries(navigationItems.filter((item) => item.to).map((item) => [item.id, item.to]))).toEqual({ conversations: '/app/conversations', contacts: '/app/contacts', tags: '/app/tags', files: '/app/files', team: '/app/team', providers: '/app/settings/providers', demo: '/app/providers/demo/simulator', settings: '/app/settings' });
    expect(navigationItems.filter((item) => item.availability === 'RESERVED_ROUTE').map((item) => item.id)).toEqual(['tags', 'files']);
  });
});

describe('catalog availability labels', () => {
  it.each([['PLANNED', 'Em breve'], ['RESEARCH', 'Em estudo'], ['UNSUPPORTED', 'Indisponível'], ['DEPRECATED', 'Descontinuado']] as const)('shows %s with %s and no live route', (availability, label) => {
    const resources = resourceFixture.map((resource) => resource.code === 'chat.conversations' ? { ...resource, availability } : resource);
    const item = visibleNavigation(['conversations.read'], resources)[0].items[0];
    expect(item.disabledReason).toBe(label); expect(isNavigationLink(item)).toBe(false);
  });
  it('never infers plan exclusion from an entitlement identifier or base flag', () => {
    const resources = resourceFixture.map((resource) => resource.code === 'chat.conversations' ? { ...resource, base: false, entitlement: 'future.example' } : resource);
    const item = visibleNavigation(['conversations.read'], resources)[0].items[0];
    expect(isNavigationLink(item)).toBe(true); expect(item.disabledReason).toBeUndefined();
    expect(visibleNavigation([], resources)[0].items[0].disabledReason).toBe('Acesso restrito');
  });
});
