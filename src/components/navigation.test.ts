import { resourceFixture } from '../test/resourceFixture';
import { describe, expect, it } from 'vitest';
import { isNavigationLink, navigationItems, visibleNavigation } from './navigation';

describe('declarative context navigation', () => {
  it('uses stable unique ids and ordered contexts', () => {
    expect(new Set(navigationItems.map((item) => item.id)).size).toBe(navigationItems.length);
    expect(visibleNavigation(['conversations.read', 'contacts.read', 'providers.manage', 'team.read'], resourceFixture).map((group) => group.context)).toEqual(['Atendimento', 'Gestão']);
  });
  it('filters real permissions, requires both Demo permissions, and omits empty contexts', () => {
    const guarded = navigationItems.filter((item) => item.permissions);
    expect(visibleNavigation([], resourceFixture, guarded)).toEqual([]);
    expect(visibleNavigation(['contacts.read'], resourceFixture, guarded).map((group) => group.context)).toEqual(['Atendimento']);
    expect(visibleNavigation(['providers.simulate'], resourceFixture, guarded)).toEqual([]);
    expect(visibleNavigation(['providers.simulate', 'messages.read'], resourceFixture, guarded)[0].items[0]).toMatchObject({ id: 'demo', label: 'Canais e integrações', to: '/app/providers/demo/simulator' });
    expect(visibleNavigation(['OWNER'], resourceFixture, guarded)).toEqual([]);
  });
  it('never turns planned, research, unsupported or placeholder items into links', () => {
    for (const item of navigationItems.filter((item) => !['AVAILABLE', 'RESERVED_ROUTE'].includes(item.availability))) expect(isNavigationLink(item)).toBe(false);
    expect(isNavigationLink({ ...navigationItems[0], availability: 'UNSUPPORTED' })).toBe(false);
    expect(navigationItems.every((item) => item.featureCode && !item.entitlement)).toBe(true);
    expect(visibleNavigation(['conversations.read'], [])).toEqual([]);
    expect(visibleNavigation(['conversations.read'], resourceFixture.map((resource) => ({ ...resource, availability: 'PLANNED' })))).toEqual([]);
  });
  it('preserves M1 route destinations and explicitly identifies reserved catalogs', () => {
    expect(Object.fromEntries(navigationItems.filter((item) => item.to).map((item) => [item.id, item.to]))).toEqual({ conversations: '/app/conversations', contacts: '/app/contacts', tags: '/app/tags', files: '/app/files', team: '/app/team', providers: '/app/settings/providers', demo: '/app/providers/demo/simulator', settings: '/app/settings' });
    expect(navigationItems.filter((item) => item.availability === 'RESERVED_ROUTE').map((item) => item.id)).toEqual(['tags', 'files']);
  });
});
