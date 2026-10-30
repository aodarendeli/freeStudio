import type { FilterTypes } from './VKDataGrid.types';
import { getCellValue, getDisplayText, getLookupText, type GridColumn } from './columns';
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

/** `onFilterChange` payload'undaki operatör: mevcut `getCleanFilters` kuralı birebir */
const getPayloadOperation = (column: GridColumn, state: ColumnFilterState) => {
  if (state.operator) return state.operator;
  return column.dataType === 'boolean' || column.dataType === 'number' ? '=' : 'contains';
};

export const isFilterValueEmpty = (value: unknown) => isNil(value) || value === '';

/** `between` için iki uçtan biri boşsa yarım aralıktır */
export const isHalfRange = (value: unknown) =>
  Array.isArray(value) && value.some((v) => v === null || v === undefined);

export const isColumnFilterActive = (state?: ColumnFilterState) =>
  !!state && (!isFilterValueEmpty(state.value) || (!!state.values && state.values.length > 0));

/** Görünür sütunlardan aktif filtre listesini üretir (mevcut `getCleanFilters`) */
export const buildActiveFilters = (visibleColumns: GridColumn[], filters: FiltersState): FilterTypes[] =>
  visibleColumns
    .filter((column) => isColumnFilterActive(filters[column.id]))
    .map((column) => {
      const state = filters[column.id];
      return {
        dataField: column.dataField as string,
        dataType: column.dataType || 'string',
        name: state.name ?? column.name,
        filterOperator: getPayloadOperation(column, state) as FilterTypes['filterOperator'],
        filterValue: isFilterValueEmpty(state.value) ? undefined : state.value,
        ...(state.values && state.values.length > 0 && { filterValues: state.values }),
      };
    });

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
