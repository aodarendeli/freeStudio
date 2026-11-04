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

describe('tarih filtresi payload biçimi (DevExtreme ile aynı)', () => {
  const dateColumns = normalizeColumns(
    [
      { dataField: 'day', caption: 'Gün', dataType: 'date' },
      { dataField: 'at', caption: 'Zaman', dataType: 'datetime' },
    ],
    [],
    undefined
  );
  const [day, at] = dateColumns;

  it('date: yerel gün "yyyy-MM-dd" olarak gider, UTC ye kaymaz', () => {
    const [filter] = buildActiveFilters(dateColumns, { [day.id]: { value: new Date(2026, 10, 11) } });
    expect(filter.filterValue).toBe('2026-11-11');
  });

  it('date between: iki uç da "yyyy-MM-dd"', () => {
    const [filter] = buildActiveFilters(dateColumns, {
      [day.id]: { operator: 'between', value: [new Date(2026, 10, 1), new Date(2026, 10, 30)] },
    });
    expect(filter.filterValue).toEqual(['2026-11-01', '2026-11-30']);
  });

  it('datetime: yerel saatle "yyyy-MM-ddTHH:mm:ss"', () => {
    const [filter] = buildActiveFilters(dateColumns, { [at.id]: { value: new Date(2026, 10, 11, 14, 30) } });
    expect(filter.filterValue).toBe('2026-11-11T14:30:00');
  });

  it('applyFilters ile gelen "yyyy-MM-dd" metni aynen geri gider', () => {
    const [filter] = buildActiveFilters(dateColumns, { [day.id]: { value: '2026-11-11' } });
    expect(filter.filterValue).toBe('2026-11-11');
  });

  it('basit modda "yyyy-MM-dd" filtresi o günün kayıtlarını bulur', () => {
    const rows = [{ day: '2026-11-11T09:00:00' }, { day: '2026-11-12T09:00:00' }];
    expect(applyLocalFilters(rows, dateColumns, { [day.id]: { value: '2026-11-11' } })).toEqual([rows[0]]);
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
