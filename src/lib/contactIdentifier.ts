/** Presentation only: preserve raw identities in contracts; never turn an opaque LID into a phone. */
export const contactIdentifier = (value: string) => {
  const external = value.replace(/^web:[0-9a-f-]{36}:/i, '');
  if (/^\d+@s\.whatsapp\.net$/.test(external)) return `+${external.split('@')[0]}`;
  if (/@(?:s\.whatsapp\.net|lid)$/.test(external) || /^demo:/i.test(external)) return 'Identificador externo';
  return external;
};
