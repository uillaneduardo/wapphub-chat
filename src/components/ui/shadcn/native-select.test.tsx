import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NativeSelect } from './native-select';

describe('shadcn-style native channel selector', () => {
  it('keeps label, disabled channel choices and native change behavior', () => {
    const update = vi.fn();
    render(<div>
      <label htmlFor="test-channel">Canal da conversa</label>
      <NativeSelect id="test-channel" aria-label="Canal da nova conversa" density="compact" defaultValue="" onChange={update}>
        <option value="">Interno</option>
        <option value="web-1">WhatsApp</option>
        <option value="disabled" disabled>Canal indisponível</option>
      </NativeSelect>
    </div>);
    const channel = screen.getByRole('combobox', { name: 'Canal da nova conversa' });
    expect(channel).toHaveAttribute('data-slot', 'shadcn-native-select');
    expect(channel).toHaveAttribute('data-density', 'compact');
    expect(channel).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Canal indisponível' })).toBeDisabled();
    fireEvent.change(channel, { target: { value: 'web-1' } });
    expect(update).toHaveBeenCalledOnce();
    expect(channel).toHaveValue('web-1');
  });

  it('keeps busy and blocked selections disabled for user input', () => {
    render(<NativeSelect aria-label="Canal da nova conversa" disabled value="" onChange={vi.fn()}>
      <option value="">Interno</option>
    </NativeSelect>);
    expect(screen.getByRole('combobox', { name: 'Canal da nova conversa' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Interno' })).toBeInTheDocument();
  });
});
