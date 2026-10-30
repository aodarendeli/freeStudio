import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FiltersChangesTypes,
  FilterTypes,
  PagingTypes,
  ResetFilterOptions,
  SortingTypes,
} from '../VKDataGrid.types';
import type { GridColumn } from '../columns';
import {
  buildActiveFilters,
  isFilterValueEmpty,
  isHalfRange,
  normalizeOperation,
  type ColumnFilterState,
  type FiltersState,
  type SortRule,
} from '../filtering';
import { isDeepEqual } from '../utils';

type LatestOptions = {
  filters: FilterTypes[];
  searchText: string;
  sort: SortingTypes | null;
  pageSize: number;
};

type UseGridStateArgs = {
  onFilterChange?: (options: FiltersChangesTypes) => void;
  handlePagingChanged?: (data: { size: number; page: number }) => void;
  paging?: PagingTypes;
  totalCount: number;
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
  onFilterChange,
  handlePagingChanged,
  paging,
  totalCount,
  columns,
  getVisibleColumns,
}: UseGridStateArgs) => {
  const isServerMode = typeof onFilterChange === 'function';

  const [filters, setFilters] = useState<FiltersState>({});
  const [searchText, setSearchText] = useState('');
  const [sorting, setSorting] = useState<SortRule[]>([]);
  const [pageIndex, setPageIndex] = useState(paging?.pageIndex ?? 0);
  const [pageSize, setPageSize] = useState(paging?.pageSize ?? 10);

  const latestOptionsRef = useRef<LatestOptions>({
    filters: [],
    searchText: '',
    sort: null,
    pageSize,
  });
  // Render'dan bağımsız güncel değerler (ref API ve olay işleyicileri için)
  const stateRef = useRef({ filters, searchText, sorting, pageIndex, pageSize });
  stateRef.current = { filters, searchText, sorting, pageIndex, pageSize };
  const callbacksRef = useRef({ onFilterChange, handlePagingChanged, getVisibleColumns, columns });
  callbacksRef.current = { onFilterChange, handlePagingChanged, getVisibleColumns, columns };

  // Basit modda sayfa durumu `paging` prop'undan gelir, prop değişince eşitlenir
  useEffect(() => {
    if (isServerMode) return;
    if (paging?.pageIndex !== undefined) setPageIndex(paging.pageIndex);
  }, [isServerMode, paging?.pageIndex]);
  useEffect(() => {
    if (isServerMode) return;
    if (paging?.pageSize !== undefined) setPageSize(paging.pageSize);
  }, [isServerMode, paging?.pageSize]);

  /** Filtre / arama / sıralama / sayfa boyutu değişimi: sayfa 0'a döner ve bildirilir */
  const emitDataChange = useCallback(
    (next: { filters?: FiltersState; searchText?: string; sort?: SortingTypes | null; pageSize?: number }) => {
      const latest = latestOptionsRef.current;
      const nextFilters = next.filters ?? stateRef.current.filters;
      latest.searchText = next.searchText ?? stateRef.current.searchText;
      latest.filters = buildActiveFilters(callbacksRef.current.getVisibleColumns(), nextFilters);
      if ('sort' in next) latest.sort = next.sort ?? null;
      if (next.pageSize !== undefined) latest.pageSize = next.pageSize;

      if (!isServerMode) return;
      if (latest.filters.some((filter) => isHalfRange(filter.filterValue))) return;

      setPageIndex(0);
      callbacksRef.current.onFilterChange?.({
        filter: latest.filters,
        searchText: latest.searchText,
        sort: latest.sort,
        pageIndex: 0,
        pageSize: latest.pageSize,
      });
    },
    [isServerMode]
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
        const latest = latestOptionsRef.current;
        callbacksRef.current.onFilterChange?.({
          filter: latest.filters,
          searchText: latest.searchText,
          sort: latest.sort,
          pageIndex: nextPageIndex,
          pageSize: latest.pageSize,
        });
        return;
      }
      callbacksRef.current.handlePagingChanged?.({ size: stateRef.current.pageSize, page: nextPageIndex });
    },
    [isServerMode]
  );

  const changePageSize = useCallback(
    (nextPageSize: number) => {
      setPageSize(nextPageSize);
      if (isServerMode) {
        emitDataChange({ pageSize: nextPageSize });
        return;
      }
      const lastPage = Math.max(0, Math.ceil(totalCount / nextPageSize) - 1);
      const page = Math.min(stateRef.current.pageIndex, lastPage);
      setPageIndex(page);
      latestOptionsRef.current.pageSize = nextPageSize;
      callbacksRef.current.handlePagingChanged?.({ size: nextPageSize, page });
    },
    [isServerMode, emitDataChange, totalCount]
  );

  const getFilters = useCallback(
    (): FiltersChangesTypes => ({
      filter: latestOptionsRef.current.filters,
      searchText: latestOptionsRef.current.searchText,
      sort: latestOptionsRef.current.sort,
      pageIndex: stateRef.current.pageIndex,
      pageSize: latestOptionsRef.current.pageSize,
    }),
    []
  );

  const resetFilters = useCallback(
    (options?: ResetFilterOptions) => {
      const {
        resetSort = true,
        resetFilter = true,
        resetSearch = true,
        triggerOnFilterChange = false,
      } = options || {};
      if (isServerMode) setPageIndex(0);
      stateRef.current.pageIndex = isServerMode ? 0 : stateRef.current.pageIndex;
      if (resetFilter) {
        stateRef.current.filters = {};
        setFilters({});
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
        ...(resetFilter && { filters: [] }),
        ...(resetSearch && { searchText: '' }),
        ...(resetSort && { sort: null }),
        pageSize: stateRef.current.pageSize,
      };
      if (triggerOnFilterChange) {
        const latest = latestOptionsRef.current;
        callbacksRef.current.onFilterChange?.({
          filter: latest.filters,
          searchText: latest.searchText,
          sort: latest.sort,
          pageIndex: 0,
          pageSize: latest.pageSize,
        });
      }
    },
    [isServerMode]
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
      latestOptionsRef.current = { ...latestOptionsRef.current, filters: nextFilters, sort };
      setPageIndex(0);
      stateRef.current.pageIndex = 0;
      callbacksRef.current.onFilterChange?.({
        filter: nextFilters,
        searchText: latestOptionsRef.current.searchText,
        sort,
        pageIndex: 0,
        pageSize: latestOptionsRef.current.pageSize,
      });
    },
    []
  );

  return {
    isServerMode,
    filters,
    searchText,
    sorting,
    pageIndex,
    pageSize,
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
