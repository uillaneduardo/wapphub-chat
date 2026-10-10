import { describe, expect, it } from 'vitest';
import { contactIdentifier } from './contactIdentifier';
describe('external identity presentation', () => {
 it('hides protocol/provider labels without interpreting a LID as a phone or mutating the value', () => {
  const value = 'web:11111111-1111-4111-8111-111111111111:123456@lid';
  expect(contactIdentifier(value)).toBe('Identificador externo'); expect(value).toContain('@lid');
  expect(contactIdentifier('123456@s.whatsapp.net')).toBe('+123456'); expect(contactIdentifier('demo:contact-1')).toBe('Identificador externo'); expect(contactIdentifier('manual@example.test')).toBe('manual@example.test');
 });
});
