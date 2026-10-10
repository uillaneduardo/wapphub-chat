/** Display the external identifier without the internal connection namespace. */
export const contactIdentifier = (value: string) => value.replace(/^web:[0-9a-f-]{36}:/i, '');
