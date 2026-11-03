import { describe, expect, it } from 'vitest';
import { normalizeColumns } from '../columns';
import {
  applyLocalFilters,
  applyLocalSearch,
  applyLocalSort,
  buildActiveFilters,
  isHalfRange,
  normalizeOperation,
} from '../filtering';

const columns = normalizeColumns(
  [
    { dataField: 'name', caption: 'Ad' },
    { dataField: 'price', caption: 'Fiyat', dataType: 'number' },
    { dataField: 'active', caption: 'Aktif', dataType: 'boolean' },
    {
      dataField: 'categoryId',
      caption: 'Kategori',
      lookup: { dataSource: [{ id: 'c1', name: 'Kırtasiye' }, { id: 'c2', name: 'Oyuncak' }], valueExpr: 'id', displayExpr: 'name' },
    },
  ],
  [],
  undefined
);
const byId = new Map(columns.map((c) => [c.id, c]));
const id = (field: string) => columns.find((c) => c.dataField === field)!.id;

const rows = [
  { name: 'Kalem', price: 10, active: true, categoryId: 'c1' },
  { name: 'Silgi', price: 5, active: false, categoryId: 'c1' },
  { name: 'Top', price: 50, active: true, categoryId: 'c2' },
];

describe('buildActiveFilters (onFilterChange payload kuralı)', () => {
  it('operatör seçilmediyse string için contains, number/boolean için = gönderir', () => {
    const result = buildActiveFilters(columns, {
      [id('name')]: { value: 'ka' },
      [id('price')]: { value: 10 },
      [id('active')]: { value: true },
    });
    expect(result).toEqual([
      expect.objectContaining({ dataField: 'name', dataType: 'string', filterOperator: 'contains', filterValue: 'ka' }),
      expect.objectContaining({ dataField: 'price', dataType: 'number', filterOperator: '=', filterValue: 10 }),
      expect.objectContaining({ dataField: 'active', dataType: 'boolean', filterOperator: '=', filterValue: true }),
    ]);
  });

  it('boş değerli filtreleri göndermez, header filter değerlerini filterValues olarak ekler', () => {
    const result = buildActiveFilters(columns, {
      [id('name')]: { value: '' },
      [id('categoryId')]: { values: ['c1'] },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ dataField: 'categoryId', filterValues: ['c1'] });
  });

  it('seçilen operatörü aynen gönderir', () => {
    const [filter] = buildActiveFilters(columns, { [id('price')]: { operator: '>=', value: 5 } });
    expect(filter.filterOperator).toBe('>=');
  });
});

describe('operatör yardımcıları', () => {
  it('alternatif isimleri DevExtreme isimlerine çevirir', () => {
    expect(normalizeOperation('startWith')).toBe('startswith');
    expect(normalizeOperation('equals')).toBe('=');
    expect(normalizeOperation('notEquals')).toBe('<>');
    expect(normalizeOperation(null)).toBeUndefined();
  });

  it('between için tek uç boşsa yarım aralıktır', () => {
    expect(isHalfRange([1, null])).toBe(true);
    expect(isHalfRange([1, 5])).toBe(false);
    expect(isHalfRange(3)).toBe(false);
  });
});

describe('basit mod yerel işlemleri', () => {
  it('metin, sayı, between ve lookup filtrelerini uygular', () => {
    expect(applyLocalFilters(rows, columns, { [id('name')]: { value: 'ka' } }).map((r) => r.name)).toEqual(['Kalem']);
    expect(applyLocalFilters(rows, columns, { [id('price')]: { operator: '>', value: 5 } })).toHaveLength(2);
    expect(applyLocalFilters(rows, columns, { [id('price')]: { operator: 'between', value: [5, 10] } })).toHaveLength(2);
    expect(applyLocalFilters(rows, columns, { [id('price')]: { operator: 'between', value: [5, null] } })).toHaveLength(3);
    expect(applyLocalFilters(rows, columns, { [id('categoryId')]: { value: 'c2' } }).map((r) => r.name)).toEqual(['Top']);
  });

  it('arama lookup metninde de arar (Türkçe büyük/küçük harf duyarsız)', () => {
    expect(applyLocalSearch(rows, columns, 'OYUNCAK').map((r) => r.name)).toEqual(['Top']);
    expect(applyLocalSearch(rows, columns, '')).toBe(rows);
  });

  it('artan / azalan ve çoklu sıralama yapar', () => {
    expect(applyLocalSort(rows, byId, [{ id: id('price'), desc: false }]).map((r) => r.price)).toEqual([5, 10, 50]);
    expect(applyLocalSort(rows, byId, [{ id: id('price'), desc: true }]).map((r) => r.price)).toEqual([50, 10, 5]);
    expect(
      applyLocalSort(rows, byId, [
        { id: id('categoryId'), desc: false },
        { id: id('name'), desc: true },
      ]).map((r) => r.name)
    ).toEqual(['Silgi', 'Kalem', 'Top']);
  });
});
