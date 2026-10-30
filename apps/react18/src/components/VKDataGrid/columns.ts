import type { ReactNode } from 'react';
import { formatValue, type GridFormat } from './format';
import { getByPath, isNil } from './utils';

export type GridDataType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'object';

export type LookupOption = { value: any; text: string };

export type HeaderFilterItem = { value: any; text: string };

/** `columns` prop'undaki her sütunun varsayılanları uygulanmış hali */
export type GridColumn = {
  id: string;
  dataField?: string;
  caption: string;
  name?: string;
  width?: number | string;
  dataType: GridDataType;
  alignment: 'left' | 'center' | 'right';
  format: GridFormat;
  cellRender?: (cellInfo: any) => ReactNode;
  calculateCellValue?: (rowData: any) => any;
  lookupOptions?: LookupOption[];
  headerFilterData?: any;
  allowHeaderFiltering: boolean;
  allowFiltering: boolean;
  allowSorting: boolean;
  allowGrouping: boolean;
  allowEditing: boolean;
  allowHiding: boolean;
  fixed: boolean;
  fixedPosition: 'left' | 'right';
  filterOperations: string[];
  groupIndex?: number;
  visible: boolean;
  /** Kullanıcının verdiği ham sütun nesnesi (cellRender bilgisinde `column` olarak da verilir) */
  raw: Record<string, any>;
};

const inferDataType = (value: unknown): GridDataType => {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  return 'string';
};

const normalizeDataType = (dataType: unknown, sample: unknown): GridDataType => {
  if (dataType === 'time') return 'datetime';
  if (
    dataType === 'string' ||
    dataType === 'number' ||
    dataType === 'date' ||
    dataType === 'datetime' ||
    dataType === 'boolean' ||
    dataType === 'object'
  ) {
    return dataType;
  }
  return inferDataType(sample);
};

const readExpr = (item: any, expr: unknown) => {
  if (typeof expr === 'function') return expr(item);
  if (typeof expr === 'string') return getByPath(item, expr);
  return item;
};

const resolveLookup = (lookup: any): LookupOption[] | undefined => {
  if (!lookup) return undefined;
  const source = Array.isArray(lookup.dataSource)
    ? lookup.dataSource
    : Array.isArray(lookup.dataSource?.store)
      ? lookup.dataSource.store
      : typeof lookup.dataSource === 'function'
        ? lookup.dataSource()
        : [];
  if (!Array.isArray(source)) return [];
  return source.map((item: any) => {
    const value = lookup.valueExpr ? readExpr(item, lookup.valueExpr) : item;
    const text = lookup.displayExpr ? readExpr(item, lookup.displayExpr) : value;
    return { value, text: isNil(text) ? '' : String(text) };
  });
};

const defaultAlignment = (dataType: GridDataType): 'left' | 'center' | 'right' => {
  if (dataType === 'number') return 'right';
  if (dataType === 'boolean') return 'center';
  return 'left';
};

export const normalizeColumns = (
  columns: any[] | undefined,
  dataSource: any[],
  columnWidth: number | 'auto' | undefined
): GridColumn[] => {
  const source =
    columns ??
    (dataSource && dataSource.length > 0
      ? Object.keys(dataSource[0]).map((key) => ({ dataField: key, caption: key }))
      : []);
  const firstRow = dataSource?.[0];
  const usedIds = new Set<string>();

  return source.map((col: any, index: number) => {
    let id = String(col?.dataField ?? col?.name ?? col?.caption ?? `column_${index}`);
    while (usedIds.has(id)) id = `${id}_${index}`;
    usedIds.add(id);

    const sample =
      firstRow === undefined
        ? undefined
        : typeof col?.calculateCellValue === 'function'
          ? safeCalculate(col, firstRow)
          : getByPath(firstRow, col?.dataField);
    const dataType = normalizeDataType(col?.dataType, sample);
    const lookupOptions = resolveLookup(col?.lookup);

    return {
      id,
      dataField: col?.dataField,
      caption: col?.caption || col?.dataField || '',
      name: col?.name,
      width: col?.width ?? (typeof columnWidth === 'number' ? columnWidth : undefined),
      dataType,
      // Lookup sütunu gösterilen metne göre hizalanır
      alignment: col?.alignment ?? (lookupOptions ? 'left' : defaultAlignment(dataType)),
      format: col?.format || undefined,
      cellRender: col?.cellRender ?? undefined,
      calculateCellValue: col?.calculateCellValue,
      lookupOptions,
      headerFilterData: col?.headerFilterData,
      allowHeaderFiltering: col?.allowHeaderFiltering ?? true,
      allowFiltering: col?.allowFiltering ?? true,
      allowSorting: col?.allowSorting ?? true,
      allowGrouping: col?.allowGrouping ?? true,
      allowEditing: col?.allowEditing ?? true,
      allowHiding: col?.allowHiding ?? true,
      fixed: col?.fixed === true,
      fixedPosition: col?.fixedPosition === 'right' ? 'right' : 'left',
      filterOperations: Array.isArray(col?.filterOperations) ? col.filterOperations : [],
      groupIndex: typeof col?.groupIndex === 'number' ? col.groupIndex : undefined,
      visible: col?.visible ?? true,
      raw: col ?? {},
    };
  });
};

const safeCalculate = (col: any, row: any) => {
  try {
    return col.calculateCellValue.call(col, row);
  } catch {
    return undefined;
  }
};

export const getCellValue = (column: GridColumn, row: any) =>
  column.calculateCellValue
    ? column.calculateCellValue.call(column.raw, row)
    : getByPath(row, column.dataField);

export const getLookupText = (column: GridColumn, value: any) => {
  const option = column.lookupOptions?.find((o) => o.value === value);
  return option ? option.text : value;
};

/** Hücrede gösterilen metin (lookup + format uygulanmış) */
export const getDisplayText = (column: GridColumn, value: any): string => {
  if (isNil(value)) return '';
  if (column.lookupOptions) return String(getLookupText(column, value) ?? '');
  if (column.dataType === 'boolean' && typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  return formatValue(value, column.format, column.dataType);
};

/** Header filter seçenekleri: sütun verisi > global veri > sayfadaki benzersiz değerler */
export const getHeaderFilterItems = (
  column: GridColumn,
  globalData: any,
  rows: any[]
): HeaderFilterItem[] => {
  const source = column.headerFilterData ?? globalData;
  if (Array.isArray(source)) {
    return source.map((item: any) =>
      item && typeof item === 'object' && 'value' in item
        ? { value: item.value, text: String(item.text ?? item.value ?? '') }
        : { value: item, text: String(item ?? '') }
    );
  }
  if (column.lookupOptions) return column.lookupOptions;
  const seen = new Map<string, HeaderFilterItem>();
  rows.forEach((row) => {
    const value = getCellValue(column, row);
    if (isNil(value) || value === '') return;
    const key = value instanceof Date ? value.toISOString() : String(value);
    if (!seen.has(key)) seen.set(key, { value, text: getDisplayText(column, value) });
  });
  return [...seen.values()].sort((a, b) => a.text.localeCompare(b.text, 'tr'));
};
