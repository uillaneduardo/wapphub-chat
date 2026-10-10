import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormattedMessage } from './FormattedMessage';

describe('normalized external message formatting', () => {
  it('preserves bold, italics, strike and monospace without inferring an author', () => {
    const { container } = render(<p><FormattedMessage body={'*Maria:* _itálico_ ~removido~ ```código```'} /></p>);
    expect(container.querySelector('strong')).toHaveTextContent('Maria:'); expect(container.querySelector('em')).toHaveTextContent('itálico'); expect(container.querySelector('s')).toHaveTextContent('removido'); expect(container.querySelector('code')).toHaveTextContent('código');
    expect(container.querySelector('.message-author')).toBeNull();
  });
  it('escapes HTML and retains whitespace, unicode and unmatched markers', () => {
    const body = '  <script>alert(1)</script>\n😀 *aberto';
    const { container } = render(<p><FormattedMessage body={body} /></p>);
    expect(container.textContent).toBe(body); expect(container.querySelector('script')).toBeNull();
  });
  it('formats nested text without altering the stored source', () => {
    const body = '*forte _suave_*'; render(<p><FormattedMessage body={body} /></p>);
    expect(screen.getByText('suave').tagName).toBe('EM'); expect(body).toBe('*forte _suave_*');
  });
});
