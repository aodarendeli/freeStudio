import { describe, expect, it } from 'vitest';
import { normalizeColumns } from '../columns';
import {
  applyFilterTree,
  applyLocalFilters,
  applyLocalSearch,
  applyLocalSort,
  buildRowFilterTree,
  columnsToFilterFields,
  combineFilterTrees,
  isHalfRange,
  normalizeOperation,
  type FiltersState,
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

describe('tarih filtresi payload biçimi (DevExtreme ile aynı)', () => {
  /** Ağaçtaki tek kuralın değeri */
  const valueOf = (cols: typeof columns, state: FiltersState) => (buildRowFilterTree(cols, state).rules[0] as { value: unknown }).value;

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
    expect(valueOf(dateColumns, { [day.id]: { value: new Date(2026, 10, 11) } })).toBe('2026-11-11');
  });

  it('date between: iki uç da "yyyy-MM-dd"', () => {
    expect(
      valueOf(dateColumns, { [day.id]: { operator: 'between', value: [new Date(2026, 10, 1), new Date(2026, 10, 30)] } })
    ).toEqual(['2026-11-01', '2026-11-30']);
  });

  it('datetime: yerel saatle "yyyy-MM-ddTHH:mm:ss"', () => {
    expect(valueOf(dateColumns, { [at.id]: { value: new Date(2026, 10, 11, 14, 30) } })).toBe('2026-11-11T14:30:00');
  });

  it('applyFilters ile gelen "yyyy-MM-dd" metni aynen geri gider', () => {
    expect(valueOf(dateColumns, { [day.id]: { value: '2026-11-11' } })).toBe('2026-11-11');
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

describe('filtre ağacı (react-querybuilder biçimi)', () => {
  it('filtre satırını RQB operatörleriyle tek VE grubuna çevirir; seçilmemiş operatörde anlamlı varsayılan', () => {
    expect(
      buildRowFilterTree(columns, {
        [id('name')]: { operator: 'startswith', value: 'ka' },
        [id('price')]: { value: 10 },
        [id('categoryId')]: { value: 'c1' },
        [id('active')]: { operator: '<>', value: true, values: [false] },
      })
    ).toEqual({
      combinator: 'and',
      rules: [
        { field: 'name', operator: 'beginsWith', value: 'ka' },
        { field: 'price', operator: '=', value: 10 },
        { field: 'active', operator: 'in', value: [false] },
        { field: 'active', operator: '!=', value: true },
        // Düz listede lookup için 'contains' gidiyordu; ağaçta id eşitliği
        { field: 'categoryId', operator: '=', value: 'c1' },
      ],
    });
  });

  it('boş değer ve yarım between aralığı ağaca girmez', () => {
    expect(
      buildRowFilterTree(columns, {
        [id('name')]: { value: '' },
        [id('price')]: { operator: 'between', value: [10, null] },
      }).rules
    ).toEqual([]);
  });

  it('gelişmiş filtre ile birleştirir: düz VE grubu açılır, VEYA / DEĞİL alt grup kalır', () => {
    const row = { combinator: 'and' as const, rules: [{ field: 'price', operator: '>', value: 5 }] };
    const flat = { combinator: 'and' as const, rules: [{ field: 'name', operator: 'contains', value: 'a' }] };
    const or = { combinator: 'or' as const, rules: [flat.rules[0], row.rules[0]] };

    expect(combineFilterTrees(flat, row).rules).toEqual([flat.rules[0], row.rules[0]]);
    expect(combineFilterTrees(or, row)).toEqual({ combinator: 'and', rules: [or, row.rules[0]] });
    expect(combineFilterTrees({ ...flat, not: true }, row).rules[0]).toEqual({ ...flat, not: true });
    expect(combineFilterTrees(null, row)).toBe(row);
    expect(combineFilterTrees(or, { combinator: 'and', rules: [] })).toBe(or);
  });

  // Client senkronu: filtre satırının yerel sonucu, aynı durumun ağaca çevrilip değerlendirilmesiyle aynı olmalı
  const rowStates: [string, FiltersState][] = [
    ['metin içerir', { [id('name')]: { value: 'kal' } }],
    ['metin ile başlar / eşit değil', { [id('name')]: { operator: 'startswith', value: 'k' }, [id('price')]: { operator: '<>', value: 10 } }],
    ['sayı aralığı', { [id('price')]: { operator: 'between', value: [10, 40] } }],
    ['lookup + boolean', { [id('categoryId')]: { value: 'c2' }, [id('active')]: { value: true } }],
    ['header filter değerleri', { [id('categoryId')]: { values: ['c1'] }, [id('price')]: { operator: '>=', value: 20 } }],
  ];
  it.each(rowStates)('filtre satırı ve ağacı aynı satırları verir: %s', (_, state) => {
    expect(applyFilterTree(rows, columns, buildRowFilterTree(columns, state))).toEqual(applyLocalFilters(rows, columns, state));
  });

  it('VEYA, DEĞİL ve in ile yerelde değerlendirir', () => {
    const tree = {
      combinator: 'or' as const,
      rules: [
        { field: 'name', operator: 'endsWith', value: 'gi' },
        { combinator: 'and' as const, not: true, rules: [{ field: 'categoryId', operator: 'in', value: ['c1'] }] },
      ],
    };
    const expected = rows.filter((r) => r.name.toLowerCase().endsWith('gi') || r.categoryId !== 'c1');
    expect(applyFilterTree(rows, columns, tree)).toEqual(expected);
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(rows.length);
  });

  it('gelişmiş filtre alanları: filtrelenebilir sütunlar, lookup seçenekleriyle', () => {
    expect(columnsToFilterFields(columns)).toEqual([
      { name: 'name', label: 'Ad', dataType: 'string' },
      { name: 'price', label: 'Fiyat', dataType: 'number' },
      { name: 'active', label: 'Aktif', dataType: 'boolean' },
      {
        name: 'categoryId',
        label: 'Kategori',
        dataType: 'string',
        options: [
          { value: 'c1', label: 'Kırtasiye' },
          { value: 'c2', label: 'Oyuncak' },
        ],
      },
    ]);
  });
});
