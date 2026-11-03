import { describe, expect, it } from 'vitest';
import { formatValue } from '../format';

describe('formatValue (tr-TR)', () => {
  it('para birimini TRY ve iki ondalıkla yazar', () => {
    expect(formatValue(1234.5, { type: 'currency', precision: 2 }, 'number')).toMatch(/1\.234,50/);
    expect(formatValue(1234.5, { type: 'currency', precision: 2 }, 'number')).toContain('₺');
  });

  it('tarihi verilen kalıpla yazar', () => {
    expect(formatValue('2024-03-05T14:07:00', 'dd.MM.yyyy HH:mm', 'date')).toBe('05.03.2024 14:07');
  });

  it('boş değerde boş metin döner', () => {
    expect(formatValue(null, undefined, 'string')).toBe('');
  });
});
