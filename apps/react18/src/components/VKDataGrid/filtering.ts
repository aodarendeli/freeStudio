/**
 * Filtre / arama / sıralama kuralları (saf fonksiyonlar).
 * - `buildRowFilterTree` / `combineFilterTrees`: payload'daki `filter` ağacı (react-querybuilder biçimi)
 * - `applyLocal*`, `applyFilterTree`: basit / client modda yerel işlemler
 * DevExtreme karşılığı: `<FilterRow>`, `filterOperations`, `<SearchPanel>`, `<Sorting>`.
 */
import type { FilterGroup, FilterNode, FilterRule, VKFilterField } from '../VKFilterBuilder/VKFilterBuilder.types';
import { getCellValue, getDisplayText, getLookupText, type GridColumn } from './columns';
import dayjs from 'dayjs';
import { isNil, toDate } from './utils';

/** Bir sütunun filtre satırı / header filter durumu */
export type ColumnFilterState = {
  /** Kullanıcının menüden seçtiği operatör. Seçilmediyse `undefined` (DevExtreme `selectedFilterOperation`) */
  operator?: string;
  value?: any;
  /** Header filter ile seçilen değerler */
  values?: any[];
  /** `applyFilters` ile gelen `name` değeri */
  name?: string;
};

export type FiltersState = Record<string, ColumnFilterState>;

export type SortRule = { id: string; desc: boolean };

export const OPERATION_LABELS: Record<string, string> = {
  contains: 'İçerir',
  notcontains: 'İçermez',
  startswith: 'İle başlar',
  endswith: 'İle biter',
  '=': 'Eşittir',
  '<>': 'Eşit değildir',
  '<': 'Küçüktür',
  '>': 'Büyüktür',
  '<=': 'Küçük veya eşit',
  '>=': 'Büyük veya eşit',
  between: 'Arasında',
};

/** `FilterTypes` içindeki alternatif isimleri DevExtreme isimlerine çevirir */
const OPERATION_ALIASES: Record<string, string> = {
  startWith: 'startswith',
  endWith: 'endswith',
  equals: '=',
  notEquals: '<>',
  notContains: 'notcontains',
};

export const normalizeOperation = (operation?: string | null) =>
  operation ? (OPERATION_ALIASES[operation] ?? operation) : undefined;

/** Filtre satırında operatör seçmeden uygulanan operatör (yerel filtreleme için) */
export const getEffectiveOperation = (column: GridColumn, state?: ColumnFilterState) => {
  const selected = normalizeOperation(state?.operator);
  if (selected) return selected;
  if (column.lookupOptions || column.dataType !== 'string') return '=';
  return 'contains';
};

export const isFilterValueEmpty = (value: unknown) => isNil(value) || value === '';

/** `between` için iki uçtan biri boşsa yarım aralıktır */
export const isHalfRange = (value: unknown) =>
  Array.isArray(value) && value.some((v) => v === null || v === undefined);

export const isColumnFilterActive = (state?: ColumnFilterState) =>
  !!state && (!isFilterValueEmpty(state.value) || (!!state.values && state.values.length > 0));

/**
 * Tarih filtresi DevExtreme'deki gibi yerel saatle metin olarak gönderilir:
 * `date` -> "2026-11-11", `datetime` -> "2026-11-11T14:30:00".
 * Date nesnesi gönderilirse JSON'da UTC'ye çevrilip bir gün kayıyordu ("2026-11-10T21:00:00.000Z").
 */
const serializeFilterValue = (column: GridColumn, value: any): any => {
  if (Array.isArray(value)) return value.map((v) => serializeFilterValue(column, v));
  if (column.dataType !== 'date' && column.dataType !== 'datetime') return value;
  const date = toDate(value);
  if (!date) return value;
  return dayjs(date).format(column.dataType === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm:ss');
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const compareValues = (column: GridColumn, a: any, b: any): number => {
  if (isNil(a) && isNil(b)) return 0;
  if (isNil(a)) return -1;
  if (isNil(b)) return 1;
  if (column.lookupOptions) {
    return String(getLookupText(column, a)).localeCompare(String(getLookupText(column, b)), 'tr');
  }
  if (column.dataType === 'number') return Number(a) - Number(b);
  if (column.dataType === 'date' || column.dataType === 'datetime') {
    return (toDate(a)?.getTime() ?? 0) - (toDate(b)?.getTime() ?? 0);
  }
  if (column.dataType === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'tr', { sensitivity: 'base' });
};

const comparableForFilter = (column: GridColumn, value: any) => {
  if (column.dataType === 'date') {
    const date = toDate(value);
    return date ? startOfDay(date) : null;
  }
  if (column.dataType === 'datetime') return toDate(value)?.getTime() ?? null;
  if (column.dataType === 'number') return isNil(value) || value === '' ? null : Number(value);
  return value;
};

const matchesOperation = (column: GridColumn, cellValue: any, operation: string, filterValue: any) => {
  const isTextOperation = ['contains', 'notcontains', 'startswith', 'endswith'].includes(operation);
  if (isTextOperation || (column.dataType === 'string' && !column.lookupOptions)) {
    const text = getDisplayText(column, cellValue).toLocaleLowerCase('tr');
    const search = String(filterValue ?? '').toLocaleLowerCase('tr');
    switch (operation) {
      case 'contains':
        return text.includes(search);
      case 'notcontains':
        return !text.includes(search);
      case 'startswith':
        return text.startsWith(search);
      case 'endswith':
        return text.endsWith(search);
      case '<>':
        return text !== search;
      default:
        return text === search;
    }
  }

  if (operation === 'between') {
    if (!Array.isArray(filterValue)) return true;
    const value = comparableForFilter(column, cellValue);
    if (value === null) return false;
    const [from, to] = filterValue.map((v) => comparableForFilter(column, v));
    return (from === null || value >= from) && (to === null || value <= to);
  }

  const value = comparableForFilter(column, cellValue);
  const target = comparableForFilter(column, filterValue);
  switch (operation) {
    case '<>':
      return value !== target;
    case '<':
      return value !== null && value < target;
    case '>':
      return value !== null && value > target;
    case '<=':
      return value !== null && value <= target;
    case '>=':
      return value !== null && value >= target;
    default:
      return value === target;
  }
};

const valueKey = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value));

/** Basit modda (onFilterChange yok) DevExtreme filtreyi sayfadaki veride yerel uyguluyordu */
export const applyLocalFilters = (rows: any[], columns: GridColumn[], filters: FiltersState) => {
  const active = columns.filter((column) => isColumnFilterActive(filters[column.id]));
  if (!active.length) return rows;
  return rows.filter((row) =>
    active.every((column) => {
      const state = filters[column.id];
      const cellValue = getCellValue(column, row);
      if (state.values && state.values.length > 0) {
        const keys = new Set(state.values.map(valueKey));
        if (!keys.has(valueKey(cellValue))) return false;
      }
      if (isFilterValueEmpty(state.value) || isHalfRange(state.value)) return true;
      return matchesOperation(column, cellValue, getEffectiveOperation(column, state), state.value);
    })
  );
};

export const applyLocalSearch = (rows: any[], columns: GridColumn[], searchText: string) => {
  const search = searchText.trim().toLocaleLowerCase('tr');
  if (!search) return rows;
  return rows.filter((row) =>
    columns.some((column) =>
      getDisplayText(column, getCellValue(column, row)).toLocaleLowerCase('tr').includes(search)
    )
  );
};

export const applyLocalSort = (rows: any[], columnsById: Map<string, GridColumn>, rules: SortRule[]) => {
  const validRules = rules.filter((rule) => columnsById.has(rule.id));
  if (!validRules.length) return rows;
  return [...rows].sort((rowA, rowB) => {
    for (const rule of validRules) {
      const column = columnsById.get(rule.id)!;
      const result = compareValues(column, getCellValue(column, rowA), getCellValue(column, rowB));
      if (result !== 0) return rule.desc ? -result : result;
    }
    return 0;
  });
};

// --- Filtre ağacı (react-querybuilder biçimi) ---

/** Grid (DevExtreme) operatörü -> react-querybuilder operatörü */
const GRID_TO_TREE_OPERATOR: Record<string, string> = {
  '=': '=',
  '<>': '!=',
  '<': '<',
  '>': '>',
  '<=': '<=',
  '>=': '>=',
  contains: 'contains',
  notcontains: 'doesNotContain',
  startswith: 'beginsWith',
  endswith: 'endsWith',
  between: 'between',
};

const TREE_TO_GRID_OPERATOR: Record<string, string> = Object.fromEntries(
  Object.entries(GRID_TO_TREE_OPERATOR).map(([grid, tree]) => [tree, grid])
);

/**
 * Filtre satırı + header filter durumu -> tek VE grubu (sadece verilen, yani görünür sütunlar).
 * Operatör seçilmemişse lookup, tarih, sayı, boolean için `=`; metin için `contains`.
 * Header filter değerleri `in` kuralı olur. Yarım `between` aralığı ağaca girmez.
 */
export const buildRowFilterTree = (visibleColumns: GridColumn[], filters: FiltersState): FilterGroup => ({
  combinator: 'and',
  rules: visibleColumns.flatMap((column): FilterRule[] => {
    const state = filters[column.id];
    if (!column.dataField || !isColumnFilterActive(state)) return [];
    const rules: FilterRule[] = [];
    if (state.values && state.values.length > 0) {
      rules.push({ field: column.dataField, operator: 'in', value: serializeFilterValue(column, state.values) });
    }
    if (!isFilterValueEmpty(state.value) && !isHalfRange(state.value)) {
      const operation = getEffectiveOperation(column, state);
      rules.push({
        field: column.dataField,
        operator: GRID_TO_TREE_OPERATOR[operation] ?? operation,
        value: serializeFilterValue(column, state.value),
      });
    }
    return rules;
  }),
});

const isGroup = (node: FilterNode): node is FilterGroup => 'rules' in node && Array.isArray(node.rules);

/**
 * Gelişmiş filtre VE filtre satırı. Gelişmiş filtre düz bir VE grubuysa kuralları aynı gruba açılır,
 * değilse (VEYA / DEĞİL) alt grup olarak kalır. Boş taraf sonuca girmez.
 */
export const combineFilterTrees = (advanced: FilterGroup | null | undefined, row: FilterGroup): FilterGroup => {
  if (!advanced || advanced.rules.length === 0) return row;
  if (row.rules.length === 0) return advanced;
  const advancedRules = advanced.combinator === 'and' && !advanced.not ? advanced.rules : [advanced];
  return { combinator: 'and', rules: [...advancedRules, ...row.rules] };
};

/** Ağaçtaki tek kural, filtre satırıyla aynı karşılaştırma kurallarıyla (`matchesOperation`) değerlendirilir */
const matchesRule = (column: GridColumn, row: any, rule: FilterRule): boolean => {
  const cellValue = getCellValue(column, row);
  switch (rule.operator) {
    case 'null':
      return isFilterValueEmpty(cellValue);
    case 'notNull':
      return !isFilterValueEmpty(cellValue);
    case 'in':
      return (Array.isArray(rule.value) ? rule.value : [rule.value]).some((value) =>
        matchesOperation(column, cellValue, '=', value)
      );
    default: {
      const operation = TREE_TO_GRID_OPERATOR[rule.operator];
      return operation ? matchesOperation(column, cellValue, operation, rule.value) : true;
    }
  }
};

/** Client / basit modda ağacı yerelde uygular. Grid'de olmayan alan ya da bilinmeyen operatör kısıt sayılmaz */
export const applyFilterTree = (rows: any[], columns: GridColumn[], tree: FilterGroup | null | undefined) => {
  if (!tree || tree.rules.length === 0) return rows;
  const columnsByField = new Map(columns.filter((c) => c.dataField).map((c) => [c.dataField as string, c]));

  const matchesNode = (row: any, node: FilterNode): boolean => {
    if (isGroup(node)) {
      if (node.rules.length === 0) return true;
      const result =
        node.combinator === 'or'
          ? node.rules.some((child) => matchesNode(row, child))
          : node.rules.every((child) => matchesNode(row, child));
      return node.not ? !result : result;
    }
    const column = columnsByField.get(node.field);
    return column ? matchesRule(column, row, node) : true;
  };

  return rows.filter((row) => matchesNode(row, tree));
};

/** Gelişmiş filtre alanları: filtrelenebilir tüm sütunlar (gizliler dahil), lookup seçenekleriyle */
export const columnsToFilterFields = (columns: GridColumn[]): VKFilterField[] =>
  columns
    .filter((column) => column.dataField && column.allowFiltering && column.dataType !== 'object')
    .map((column) => ({
      name: column.dataField as string,
      label: column.caption,
      dataType: column.dataType as VKFilterField['dataType'],
      ...(column.lookupOptions && {
        options: column.lookupOptions.map((option) => ({ value: option.value, label: option.text })),
      }),
    }));
