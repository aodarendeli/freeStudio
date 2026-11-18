/**
 * Sayfa / filtre / sıralama / arama durumu ve `onFilterChange` kuralları.
 * DevExtreme karşılığı: eski `handleOptionChange` + `latestOptionsRef` + `isClearingRef`, ref API'deki
 * `getFilters` / `resetFilters` / `applyFilters`. Kurallar için README.md > Server mod.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FiltersChangesTypes,
  FilterTypes,
  PagingTypes,
  ResetFilterOptions,
  SortingTypes,
} from '../VKDataGrid.types';
import type { GridColumn } from '../columns';
import type { FilterGroup } from '../../VKFilterBuilder/VKFilterBuilder.types';
import {
  buildRowFilterTree,
  combineFilterTrees,
  isColumnFilterActive,
  isFilterValueEmpty,
  isHalfRange,
  normalizeOperation,
  type ColumnFilterState,
  type FiltersState,
  type SortRule,
} from '../filtering';
import { isDeepEqual } from '../utils';

type LatestOptions = {
  /** Filtre satırı + gelişmiş filtre (react-querybuilder biçimi) */
  filter: FilterGroup;
  searchText: string;
  sort: SortingTypes | null;
  pageSize: number;
};

/**
 * - `server`: `onFilterChange` verilmiş; sayfa, filtre, arama, sıralama backend'de.
 * - `paging`: basit mod; sadece sayfa backend'de (`handlePagingChanged`), filtre / sıralama o sayfada.
 * - `client`: `remoteOperations={false}`; `dataSource` verinin tamamı, her şey grid içinde.
 */
export type GridDataMode = 'server' | 'paging' | 'client';

export const resolveDataMode = (
  remoteOperations: boolean | undefined,
  onFilterChange: unknown
): GridDataMode => {
  if (remoteOperations === false) return 'client';
  return typeof onFilterChange === 'function' ? 'server' : 'paging';
};

type UseGridStateArgs = {
  mode: GridDataMode;
  onFilterChange?: (options: FiltersChangesTypes) => void;
  handlePagingChanged?: (data: { size: number; page: number }) => void;
  paging?: PagingTypes;
  columns: GridColumn[];
  /** Filtre payload'u sadece görünür sütunlardan üretilir (DevExtreme `getVisibleColumns`) */
  getVisibleColumns: () => GridColumn[];
};

const toSortPayload = (column: GridColumn | undefined, rule: SortRule | undefined): SortingTypes | null =>
  column && rule
    ? {
        dataField: column.dataField as string,
        dataType: column.dataType ?? 'string',
        sortOrder: rule.desc ? 'desc' : 'asc',
        name: column.name ?? undefined,
      }
    : null;

/**
 * Sayfa / filtre / sıralama / arama durumunu tutar ve `onFilterChange` kurallarını uygular.
 *
 * - Filtre, arama, sıralama, sayfa boyutu değişince sayfa 0'a döner.
 * - Sadece sayfa değişince filtreler korunur.
 * - Operatör değişimi, boş -> boş filtre değeri, yarım `between` aralığı çağrı üretmez.
 */
export const useGridState = ({
  mode,
  onFilterChange,
  handlePagingChanged,
  paging,
  columns,
  getVisibleColumns,
}: UseGridStateArgs) => {
  const isServerMode = mode === 'server';
  const isClientMode = mode === 'client';

  const [filters, setFilters] = useState<FiltersState>({});
  const [searchText, setSearchText] = useState('');
  const [sorting, setSorting] = useState<SortRule[]>([]);
  const [pageIndex, setPageIndex] = useState(paging?.pageIndex ?? 0);
  const [pageSize, setPageSize] = useState(paging?.pageSize ?? 10);
  const [advancedFilter, setAdvancedFilter] = useState<FilterGroup | null>(null);

  const latestOptionsRef = useRef<LatestOptions>({
    filter: { combinator: 'and', rules: [] },
    searchText: '',
    sort: null,
    pageSize,
  });
  // Render'dan bağımsız güncel değerler (ref API ve olay işleyicileri için)
  const stateRef = useRef({ filters, searchText, sorting, pageIndex, pageSize, advancedFilter });
  stateRef.current = { filters, searchText, sorting, pageIndex, pageSize, advancedFilter };
  const callbacksRef = useRef({ onFilterChange, handlePagingChanged, getVisibleColumns, columns });
  callbacksRef.current = { onFilterChange, handlePagingChanged, getVisibleColumns, columns };

  // Basit / client modda sayfa durumu `paging` prop'undan başlar, prop değişince eşitlenir
  useEffect(() => {
    if (isServerMode) return;
    if (paging?.pageIndex !== undefined) setPageIndex(paging.pageIndex);
  }, [isServerMode, paging?.pageIndex]);
  useEffect(() => {
    if (isServerMode) return;
    if (paging?.pageSize !== undefined) setPageSize(paging.pageSize);
  }, [isServerMode, paging?.pageSize]);

  /** `onFilterChange` / `getFilters` payload'u: son seçenekler + verilen sayfa */
  const toPayload = useCallback((nextPageIndex: number): FiltersChangesTypes => {
    const latest = latestOptionsRef.current;
    return {
      filter: latest.filter,
      searchText: latest.searchText,
      sort: latest.sort,
      pageIndex: nextPageIndex,
      pageSize: latest.pageSize,
    };
  }, []);

  /** Payload ağacı: gelişmiş filtre VE filtre satırı (sadece görünür sütunlar, düz listeyle aynı kural) */
  const refreshFilterTree = useCallback((nextFilters: FiltersState) => {
    latestOptionsRef.current.filter = combineFilterTrees(
      stateRef.current.advancedFilter,
      buildRowFilterTree(callbacksRef.current.getVisibleColumns(), nextFilters)
    );
  }, []);

  /** Filtre / arama / sıralama / sayfa boyutu / gelişmiş filtre değişimi: sayfa 0'a döner ve bildirilir */
  const emitDataChange = useCallback(
    (next: { filters?: FiltersState; searchText?: string; sort?: SortingTypes | null; pageSize?: number }) => {
      const latest = latestOptionsRef.current;
      const nextFilters = next.filters ?? stateRef.current.filters;
      latest.searchText = next.searchText ?? stateRef.current.searchText;
      refreshFilterTree(nextFilters);
      if ('sort' in next) latest.sort = next.sort ?? null;
      if (next.pageSize !== undefined) latest.pageSize = next.pageSize;

      if (isClientMode) {
        setPageIndex(0);
        return;
      }
      if (!isServerMode) return;
      // Görünür bir sütunda yarım `between` aralığı varsa istek atılmaz
      const hasHalfRange = callbacksRef.current
        .getVisibleColumns()
        .some((column) => isColumnFilterActive(nextFilters[column.id]) && isHalfRange(nextFilters[column.id].value));
      if (hasHalfRange) return;

      setPageIndex(0);
      callbacksRef.current.onFilterChange?.(toPayload(0));
    },
    [isServerMode, isClientMode, toPayload, refreshFilterTree]
  );

  /** "Gelişmiş filtre" uygulandı / kaldırıldı. Boş ağaç filtre yok demektir */
  const changeAdvancedFilter = useCallback(
    (tree: FilterGroup | null) => {
      const next = tree && tree.rules.length > 0 ? tree : null;
      if (isDeepEqual(next, stateRef.current.advancedFilter)) return;
      stateRef.current.advancedFilter = next;
      setAdvancedFilter(next);
      emitDataChange({});
    },
    [emitDataChange]
  );

  const updateColumnFilter = useCallback(
    (columnId: string, patch: Partial<ColumnFilterState>, shouldEmit: boolean) => {
      const nextFilters = {
        ...stateRef.current.filters,
        [columnId]: { ...stateRef.current.filters[columnId], ...patch },
      };
      stateRef.current.filters = nextFilters;
      setFilters(nextFilters);
      if (shouldEmit) emitDataChange({ filters: nextFilters });
    },
    [emitDataChange]
  );

  const changeFilterValue = useCallback(
    (columnId: string, value: any) => {
      const normalized = isFilterValueEmpty(value) ? undefined : value;
      const previous = stateRef.current.filters[columnId]?.value;
      if (isDeepEqual(previous, normalized)) return;
      const shouldEmit = !(isFilterValueEmpty(previous) && normalized === undefined);
      updateColumnFilter(columnId, { value: normalized }, shouldEmit);
    },
    [updateColumnFilter]
  );

  const changeFilterOperator = useCallback(
    (columnId: string, operator: string | undefined) => {
      const current = stateRef.current.filters[columnId];
      const wasBetween = normalizeOperation(current?.operator) === 'between';
      const isBetween = normalizeOperation(operator) === 'between';
      // between <-> tekil değer arasında geçişte değerin şekli değişir, değer temizlenir
      if (wasBetween !== isBetween && !isFilterValueEmpty(current?.value)) {
        updateColumnFilter(columnId, { operator, value: undefined }, true);
        return;
      }
      updateColumnFilter(columnId, { operator }, false);
    },
    [updateColumnFilter]
  );

  /** Operatör menüsündeki "sıfırla": operatör ve değer temizlenir */
  const resetFilterOperator = useCallback(
    (columnId: string) => {
      const hadValue = !isFilterValueEmpty(stateRef.current.filters[columnId]?.value);
      updateColumnFilter(columnId, { operator: undefined, value: undefined }, hadValue);
    },
    [updateColumnFilter]
  );

  const changeHeaderFilter = useCallback(
    (columnId: string, values: any[]) => {
      updateColumnFilter(columnId, { values: values.length ? values : undefined }, true);
    },
    [updateColumnFilter]
  );

  const changeSearch = useCallback(
    (text: string) => {
      if (text === stateRef.current.searchText) return;
      stateRef.current.searchText = text;
      setSearchText(text);
      emitDataChange({ searchText: text });
    },
    [emitDataChange]
  );

  const changeSorting = useCallback(
    (nextSorting: SortRule[], changedColumnId: string) => {
      stateRef.current.sorting = nextSorting;
      setSorting(nextSorting);
      const column = callbacksRef.current.columns.find((c) => c.id === changedColumnId);
      const rule = nextSorting.find((r) => r.id === changedColumnId);
      emitDataChange({ sort: toSortPayload(column, rule) });
    },
    [emitDataChange]
  );

  const changePage = useCallback(
    (nextPageIndex: number) => {
      setPageIndex(nextPageIndex);
      if (isServerMode) {
        callbacksRef.current.onFilterChange?.(toPayload(nextPageIndex));
        return;
      }
      if (isClientMode) return;
      callbacksRef.current.handlePagingChanged?.({ size: stateRef.current.pageSize, page: nextPageIndex });
    },
    [isServerMode, isClientMode, toPayload]
  );

  const changePageSize = useCallback(
    (nextPageSize: number) => {
      setPageSize(nextPageSize);
      if (isServerMode) {
        emitDataChange({ pageSize: nextPageSize });
        return;
      }
      // Eskisinden farklı: basit modda sayfa numarası DevExtreme'den okunuyordu.
      // Artık server mod ile aynı kural: sayfa boyutu değişince 1. sayfaya dönülür.
      setPageIndex(0);
      latestOptionsRef.current.pageSize = nextPageSize;
      if (isClientMode) return;
      callbacksRef.current.handlePagingChanged?.({ size: nextPageSize, page: 0 });
    },
    [isServerMode, isClientMode, emitDataChange]
  );

  const getFilters = useCallback((): FiltersChangesTypes => toPayload(stateRef.current.pageIndex), [toPayload]);

  const resetFilters = useCallback(
    (options?: ResetFilterOptions) => {
      const {
        resetSort = true,
        resetFilter = true,
        resetSearch = true,
        triggerOnFilterChange = false,
      } = options || {};
      // Basit modda sayfa dışarıdan yönetilir; server ve client modda 1. sayfaya dönülür
      const resetsPage = isServerMode || isClientMode;
      if (resetsPage) setPageIndex(0);
      stateRef.current.pageIndex = resetsPage ? 0 : stateRef.current.pageIndex;
      // Eskisinden farklı (hata düzeltmesi): eski kod `resetFilter ?? clearFilter()` yazıyordu ve
      // varsayılanlar true olduğu için hiçbir şey temizlenmiyordu. Aynısı resetSort / resetSearch için.
      if (resetFilter) {
        stateRef.current.filters = {};
        setFilters({});
        // Gelişmiş filtre de filtredir, birlikte temizlenir
        stateRef.current.advancedFilter = null;
        setAdvancedFilter(null);
      }
      if (resetSort) {
        stateRef.current.sorting = [];
        setSorting([]);
      }
      if (resetSearch) {
        stateRef.current.searchText = '';
        setSearchText('');
      }
      latestOptionsRef.current = {
        ...latestOptionsRef.current,
        // Hata düzeltmesi: eski kodda resetSort -> searchText, resetSearch -> sort olarak ters bağlıydı
        ...(resetSearch && { searchText: '' }),
        ...(resetSort && { sort: null }),
        pageSize: stateRef.current.pageSize,
      };
      refreshFilterTree(stateRef.current.filters);
      if (triggerOnFilterChange && !isClientMode) {
        callbacksRef.current.onFilterChange?.(toPayload(0));
      }
    },
    [isServerMode, isClientMode, toPayload, refreshFilterTree]
  );

  const applyFilters = useCallback(
    (nextFilters: FilterTypes[], sort: SortingTypes | null = null) => {
      const allColumns = callbacksRef.current.columns;
      const updated: FiltersState = { ...stateRef.current.filters };
      nextFilters.forEach((filter) => {
        const column = allColumns.find((c) => c.dataField === filter.dataField);
        if (!column) return;
        updated[column.id] = {
          ...updated[column.id],
          operator: filter.filterOperator ?? 'contains',
          value: filter.filterValue,
          ...(filter.filterValues && { values: filter.filterValues as any[] }),
          ...(filter.name !== undefined && { name: filter.name }),
        };
      });
      stateRef.current.filters = updated;
      setFilters(updated);
      if (sort) {
        const column = allColumns.find((c) => c.dataField === sort.dataField);
        if (column) {
          const nextSorting = [{ id: column.id, desc: sort.sortOrder === 'desc' }];
          stateRef.current.sorting = nextSorting;
          setSorting(nextSorting);
        }
      }
      latestOptionsRef.current = { ...latestOptionsRef.current, sort };
      refreshFilterTree(updated);
      setPageIndex(0);
      stateRef.current.pageIndex = 0;
      // Client modda veri zaten elde; `onFilterChange` bir yükleme isteği sayılmaz
      if (isClientMode) return;
      callbacksRef.current.onFilterChange?.(toPayload(0));
    },
    [isClientMode, toPayload, refreshFilterTree]
  );

  return {
    mode,
    isServerMode,
    filters,
    searchText,
    sorting,
    pageIndex,
    pageSize,
    advancedFilter,
    changeAdvancedFilter,
    changeFilterValue,
    changeFilterOperator,
    resetFilterOperator,
    changeHeaderFilter,
    changeSearch,
    changeSorting,
    changePage,
    changePageSize,
    getFilters,
    resetFilters,
    applyFilters,
  };
};

export type GridState = ReturnType<typeof useGridState>;
