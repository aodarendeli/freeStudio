import { describe, expect, it } from 'vitest';
import { getByPath, isDeepEqual, parseNumber, toDate, toPixelWidth } from '../utils';

describe('isDeepEqual (deep-equal paketinin yerine)', () => {
  it('primitive, dizi, nesne ve tarihleri karşılaştırır', () => {
    expect(isDeepEqual(1, 1)).toBe(true);
    expect(isDeepEqual('a', 'b')).toBe(false);
    expect(isDeepEqual([1, { a: 2 }], [1, { a: 2 }])).toBe(true);
    expect(isDeepEqual({ a: 1, b: [1] }, { b: [1], a: 1 })).toBe(true);
    expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isDeepEqual(new Date(2024, 0, 1), new Date(2024, 0, 1))).toBe(true);
    expect(isDeepEqual(null, {})).toBe(false);
    expect(isDeepEqual([], {})).toBe(false);
  });
});

describe('yardımcılar', () => {
  it('getByPath iç içe alanı okur', () => {
    expect(getByPath({ a: { b: { c: 5 } } }, 'a.b.c')).toBe(5);
    expect(getByPath({ 'a.b': 1 }, 'a.b')).toBe(1);
    expect(getByPath(null, 'a')).toBeUndefined();
  });

  it('parseNumber virgüllü ondalığı kabul eder, boşu null döner', () => {
    expect(parseNumber('12,5')).toBe(12.5);
    expect(parseNumber(' ')).toBeNull();
    expect(parseNumber('-')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });

  it('toDate geçersiz değerde null döner', () => {
    expect(toDate('2024-01-02')?.getFullYear()).toBe(2024);
    expect(toDate('x')).toBeNull();
    expect(toDate('')).toBeNull();
  });

  it('toPixelWidth sadece piksel değerleri sayıya çevirir', () => {
    expect(toPixelWidth(120)).toBe(120);
    expect(toPixelWidth('120px')).toBe(120);
    expect(toPixelWidth('20%')).toBeUndefined();
    expect(toPixelWidth('auto')).toBeUndefined();
  });
});
