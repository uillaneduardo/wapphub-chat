import type { ReactNode } from 'react';

/** WhatsApp text markers only. React escapes text; no HTML or author inference. */
export function FormattedMessage({ body, depth = 0 }: { body: string; depth?: number }) {
  if (depth >= 4) return body;
  const result: ReactNode[] = []; let offset = 0;
  const markers = /```[\s\S]+?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~/g;
  for (const match of body.matchAll(markers)) {
    result.push(body.slice(offset, match.index));
    const value = match[0], code = value.startsWith('```');
    const content = code ? value.slice(3, -3) : <FormattedMessage body={value.slice(1, -1)} depth={depth + 1} />;
    result.push(code ? <code key={match.index}>{content}</code> : value[0] === '*' ? <strong key={match.index}>{content}</strong> : value[0] === '_' ? <em key={match.index}>{content}</em> : <s key={match.index}>{content}</s>);
    offset = match.index + value.length;
  }
  result.push(body.slice(offset)); return result;
}
