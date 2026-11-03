/**
 * VKDataGrid: TanStack Table v9 + MUI v6 tabanlı veri tablosu.
 * Props ve ref arayüzü DevExtreme `DataGrid` tabanlı önceki sürümle aynıdır (bkz. README.md).
 *
 * Bu dosya sadece parçaları birbirine bağlar:
 * - hooks/useGridOptions       prop varsayılanları
 * - hooks/useGridState         sayfa / filtre / sıralama / arama + onFilterChange kuralları
 * - hooks/useGridSelection     sayfalar arası seçim (internalSelectedData)
 * - hooks/useRowClickSelection satır tıklama ve radio seçimi
 * - hooks/useColumnLayout      sabit sütunlar, genişlik ölçme ve genişletme
 * - hooks/useGridRowDragging   satır sürükleme
 * - hooks/useGridExport        dışa aktarma ve uyarılar
 * - parts/*                    araç çubuğu, başlık, filtre satırı, gövde, özet, sayfalayıcı
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  functionalUpdate,
  useTable,
  type ColumnOrderState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type ExpandedState,
  type GroupingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import type { FilterTypes, ResetFilterOptions, SortingTypes, VKDataGridProps, VKDataGridRef } from './VKDataGrid.types';
import { normalizeColumns, type GridColumn } from './columns';
import { GridContext, type GridContextValue } from './context';
import { applyLocalFilters, applyLocalSearch, applyLocalSort } from './filtering';
import { buildColumnDefs, gridFeatures } from './table';
import { resolvePageSizes, useGridOptions } from './hooks/useGridOptions';
import { useGridState } from './hooks/useGridState';
import { useGridSelection } from './hooks/useGridSelection';
import { useRowClickSelection } from './hooks/useRowClickSelection';
import { buildColumnPinning, useColumnLayout } from './hooks/useColumnLayout';
import { useGridRowDragging } from './hooks/useGridRowDragging';
import { useGridExport } from './hooks/useGridExport';
import { GridToolbar } from './parts/GridToolbar';
import { GridHeader } from './parts/GridHeader';
import { GridBody } from './parts/GridBody';
import { GridFooter } from './parts/GridFooter';
import { GridPager } from './parts/GridPager';

const rowIdFromKey = (key: unknown) => (typeof key === 'object' && key !== null ? JSON.stringify(key) : String(key));

const visibilityFromColumns = (columns: GridColumn[]): ColumnVisibilityState =>
  Object.fromEntries(columns.map((c) => [c.id, c.visible]));

/** `groupIndex` verilen sütunlar başlangıç gruplamasıdır */
const groupingFromColumns = (columns: GridColumn[]): GroupingState =>
  columns
    .filter((c) => typeof c.groupIndex === 'number')
    .sort((a, b) => (a.groupIndex as number) - (b.groupIndex as number))
    .map((c) => c.id);

const toColWidth = (width: unknown) =>
  typeof width === 'number' ? width : typeof width === 'string' && width !== 'auto' ? width : undefined;

/**
 * @component
 * @example
 * ```tsx
 * <VKDataGrid dataSource={rows} totalCount={total} rowKeyExpr="id" onFilterChange={load} />
 * ```
 */
const VKDataGrid = forwardRef<VKDataGridRef, VKDataGridProps>((props, ref) => {
  const {
    grouping,
    allowColumnReordering = true,
    allowColumnResizing = true,
    dataSource = [],
    noDataText = 'Veri Bulunamadı',
    selectedRowKeys = [],
    exportOptions,
    scrollingOption,
    onExporting,
    height = 'auto',
    filterRow,
    headerFilter = false,
    paging,
    isPrintButtonVisible = false,
    isHeaderBold = false,
    rowAlternationEnabled = true,
    searchPanel,
    // Eskisinden farklı: varsayılan true idi; checkbox'lı çoklu seçim artık açıkça istenir
    multipleSelection = false,
    allowedPageSizes = [5, 10, 20],
    summary,
    selection,
    showBorders = true,
    showRowLines = true,
    showColumnLines = true,
    columnWidth,
    singleRowRadioSelection = false,
    rowKeyExpr = undefined,
    rowSelectionChange,
    handlePagingChanged,
    totalCount = 0,
    columns,
    headerFilterData,
    resetOperationText = null,
    onFilterChange,
    sorting,
    actionMenuRender,
    columnChooserOption,
    pager,
    handlePrint,
    isExportAllButtonVisible = false,
    exportDataAllMethod,
    isSelected = false,
  } = props;

  const options = useGridOptions({
    exportOptions,
    scrollingOption,
    searchPanel,
    selection,
    multipleSelection,
    pager,
    allowedPageSizes,
    filterRow,
    columnChooserOption,
    sorting,
  });

  // --- Veri: sürükleme açıkken yeni sıra iç state'te tutulur ---
  const isRowDraggingEnabled = !!props.rowDragging?.allowReordering;
  const [internalData, setInternalData] = useState<any[]>(dataSource);
  useEffect(() => {
    setInternalData(dataSource);
  }, [dataSource]);
  const actualData = isRowDraggingEnabled ? internalData : dataSource;

  // --- Sütunlar ---
  const gridColumns = useMemo(() => normalizeColumns(columns, dataSource, columnWidth), [columns, dataSource, columnWidth]);
  const columnsById = useMemo(() => new Map(gridColumns.map((c) => [c.id, c])), [gridColumns]);

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(() =>
    visibilityFromColumns(gridColumns)
  );
  const visibilitySignature = gridColumns.map((c) => `${c.id}:${c.visible}`).join('|');
  useEffect(() => {
    setColumnVisibility(visibilityFromColumns(gridColumns));
    // Sadece `visible` ayarları değişince kullanıcının sütun seçici tercihini ezer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilitySignature]);

  const [groupingState, setGroupingState] = useState<GroupingState>(() => groupingFromColumns(gridColumns));
  const groupingSignature = groupingFromColumns(gridColumns).join('|');
  useEffect(() => {
    setGroupingState(groupingFromColumns(gridColumns));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupingSignature]);

  const [expanded, setExpanded] = useState<ExpandedState>(() => (grouping?.autoExpandAll === false ? {} : true));
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  const visibleDataColumns = useMemo(
    () => gridColumns.filter((c) => columnVisibility[c.id] !== false),
    [gridColumns, columnVisibility]
  );
  const visibleDataColumnsRef = useRef(visibleDataColumns);
  visibleDataColumnsRef.current = visibleDataColumns;
  const getVisibleColumns = useCallback(() => visibleDataColumnsRef.current, []);

  // --- Sayfa / filtre / sıralama / arama ---
  const gridState = useGridState({ onFilterChange, handlePagingChanged, paging, columns: gridColumns, getVisibleColumns });
  const { isServerMode } = gridState;

  /** Basit modda (onFilterChange yok) DevExtreme filtre / arama / sıralamayı sayfadaki veride yapıyordu */
  const processedData = useMemo(() => {
    // Sayfa boyutu küçülünce yeni sayfa gelene kadar eski sayfanın fazla satırları görünmesin
    let rows = actualData.length > gridState.pageSize ? actualData.slice(0, gridState.pageSize) : actualData;
    if (!isServerMode) {
      rows = applyLocalFilters(rows, visibleDataColumns, gridState.filters);
      rows = applyLocalSearch(rows, visibleDataColumns, gridState.searchText);
      rows = applyLocalSort(rows, columnsById, gridState.sorting);
    }
    if (groupingState.length) {
      const groupSort = groupingState.map((id) => ({ id, desc: gridState.sorting.find((r) => r.id === id)?.desc ?? false }));
      rows = applyLocalSort(rows, columnsById, groupSort);
    }
    return rows;
  }, [
    actualData,
    gridState.pageSize,
    isServerMode,
    visibleDataColumns,
    gridState.filters,
    gridState.searchText,
    gridState.sorting,
    columnsById,
    groupingState,
  ]);

  // --- Seçim ---
  const gridSelection = useGridSelection({
    rowKeyExpr,
    selectedRowKeys,
    multipleSelection,
    pageData: processedData,
    sourceData: actualData,
    rowSelectionChange,
  });
  const { isKeyExistsInData, isRowSelected, applyPageSelection } = gridSelection;

  const getRowId = useCallback(
    (row: any, index: number) => (isKeyExistsInData && rowKeyExpr ? rowIdFromKey(row?.[rowKeyExpr]) : String(index)),
    [isKeyExistsInData, rowKeyExpr]
  );

  // TanStack'in rowSelection state'i internalSelectedData'dan türetilir; değişiklik ona geri yazılır
  const rowSelectionState = useMemo<RowSelectionState>(() => {
    const state: RowSelectionState = {};
    processedData.forEach((row, index) => {
      if (isRowSelected(row)) state[getRowId(row, index)] = true;
    });
    return state;
  }, [processedData, isRowSelected, getRowId]);

  const handleRowSelectionChange = useCallback(
    (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
      const next = functionalUpdate(updater, rowSelectionState);
      applyPageSelection(processedData.filter((row, index) => next[getRowId(row, index)]));
    },
    [rowSelectionState, processedData, getRowId, applyPageSelection]
  );

  const rowClick = useRowClickSelection({
    rowKeyExpr,
    singleRowRadioSelection,
    selectionConfig: options.selectionConfig,
    pageData: processedData,
    isRowSelected,
    applyPageSelection,
    rowSelectionChange,
  });

  // --- TanStack tablo ---
  const showSelectColumn =
    options.selectionConfig.mode === 'multiple' && options.selectionConfig.showCheckBoxesMode !== 'none';
  const showDragIcons = props.rowDragging?.showDragIcons ?? true;

  const columnDefs = useMemo(
    () =>
      buildColumnDefs({
        columns: gridColumns,
        showDragColumn: isRowDraggingEnabled && showDragIcons,
        showSelectColumn,
        showRadioColumn: singleRowRadioSelection,
        showActionsColumn: !!actionMenuRender,
      }),
    [gridColumns, isRowDraggingEnabled, showDragIcons, showSelectColumn, singleRowRadioSelection, actionMenuRender]
  );

  const columnPinning = useMemo(
    () => buildColumnPinning(columnDefs.map((c) => c.id as string), gridColumns),
    [columnDefs, gridColumns]
  );

  const table = useTable({
    features: gridFeatures,
    columns: columnDefs,
    data: processedData,
    getRowId,
    state: {
      sorting: gridState.sorting,
      columnVisibility,
      columnOrder,
      columnPinning,
      columnSizing,
      rowSelection: rowSelectionState,
      grouping: groupingState,
      expanded,
    },
    onColumnVisibilityChange: (updater) => setColumnVisibility((prev) => functionalUpdate(updater, prev)),
    onColumnOrderChange: (updater) => setColumnOrder((prev) => functionalUpdate(updater, prev)),
    onColumnSizingChange: (updater) => setColumnSizing((prev) => functionalUpdate(updater, prev)),
    onGroupingChange: (updater) => setGroupingState((prev) => functionalUpdate(updater, prev)),
    onExpandedChange: (updater) => setExpanded((prev) => functionalUpdate(updater, prev)),
    onRowSelectionChange: handleRowSelectionChange,
    manualSorting: true,
    enableRowSelection: (row) => !row.getIsGrouped(),
    enableMultiRowSelection: options.selectionConfig.mode === 'multiple',
    enableRowRangeSelection: false,
    groupedColumnMode: 'remove',
    autoResetExpanded: false,
  });

  const layout = useColumnLayout({ table, columnsById, columnSizing, setColumnSizing });

  // --- Satır sürükleme ---
  const visibleDataRows = table
    .getRowModel()
    .rows.filter((row) => !row.getIsGrouped())
    .map((row) => ({ id: row.id, data: row.original }));
  const dragging = useGridRowDragging({ rowDragging: props.rowDragging, rowKeyExpr, visibleRows: visibleDataRows, setInternalData });

  // --- Dışa aktarma ---
  const rootRef = useRef<HTMLDivElement>(null);
  const exporting = useGridExport({
    rootRef,
    exportColumns: layout.displayColumns.filter((c) => c.kind === 'data' && c.column).map((c) => c.column!),
    selectedRows: gridSelection.internalSelectedData,
    getRowKey: rowClick.getRadioKey,
    getFilters: gridState.getFilters,
    totalCount,
    isSelected,
    onExporting,
    exportDataAllMethod,
  });

  // --- Ref API (VKDataGridRef) ---
  useImperativeHandle(
    ref,
    () => ({
      resetFilters: (resetFilterOptions?: ResetFilterOptions) => gridState.resetFilters(resetFilterOptions),
      getFilters: () => gridState.getFilters(),
      applyFilters: (filters: FilterTypes[], sort: SortingTypes | null = null) => gridState.applyFilters(filters, sort),
    }),
    [gridState]
  );

  const { pagerConfig } = options;
  const pageSizes = resolvePageSizes(pagerConfig.allowedPageSizes ?? allowedPageSizes, gridState.pageSize);
  const isHeightFixed = height !== 'auto' && height !== undefined && height !== null;

  const contextValue: GridContextValue = {
    table,
    displayColumns: layout.displayColumns,
    allColumns: gridColumns,
    gridState,
    selection: gridSelection,
    selectionConfig: options.selectionConfig,
    dragging,
    isRowDraggingEnabled,
    showDragIcons,
    showRowLines,
    showColumnLines,
    rowAlternationEnabled,
    isHeaderBold,
    noDataText,
    filterRowVisible: options.filterRowConfig.visible !== false,
    showAllText: options.filterRowConfig.showAllText,
    resetOperationText: resetOperationText ?? 'Sıfırla',
    headerFilter,
    headerFilterData,
    sortingConfig: options.sortingConfig,
    allowColumnResizing,
    allowColumnReordering,
    grouping,
    highlight: {
      enabled: options.searchConfig.highlightSearchText ?? true,
      caseSensitive: options.searchConfig.highlightCaseSensitive ?? false,
    },
    pageData: processedData,
    singleRowRadioSelection,
    selectedRadioRowKey: rowClick.selectedRadioRowKey,
    getRadioKey: rowClick.getRadioKey,
    actionMenuRender,
    onRowClick: rowClick.handleRowClick,
    registerHeaderCell: layout.registerHeaderCell,
    startColumnResize: layout.startColumnResize,
    stickyHeader: isHeightFixed,
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
      <GridContext.Provider value={contextValue}>
        <Box
          ref={rootRef}
          sx={(theme) => ({
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: 0,
            // Eskisinden farklı: `height` sabit yükseklik değil üst sınırdır; az satırda grid küçülür
            maxHeight: isHeightFixed ? height : undefined,
            backgroundColor: theme.palette.background.paper,
            ...(showBorders && {
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.borderRadius}px`,
              overflow: 'hidden',
            }),
          })}
        >
          <GridToolbar
            table={table}
            columns={gridColumns}
            searchVisible={options.searchConfig.visible ?? false}
            searchText={gridState.searchText}
            onSearch={gridState.changeSearch}
            columnChooser={options.columnChooserConfig}
            showExportButton={!!options.exportConfig.enabled}
            onExport={() => exporting.runExport(processedData, false)}
            showPrintButton={isPrintButtonVisible}
            onPrint={handlePrint}
            showExportAllButton={isExportAllButtonVisible}
            onExportAll={exporting.exportAll}
            isExportingAll={exporting.isExportingAll}
            showExportSelectedButton={!!options.exportConfig.allowExportSelectedData}
            onExportSelected={exporting.exportSelected}
          />
          <TableContainer
            sx={(theme) => ({
              flex: '1 1 auto',
              minHeight: 0,
              overflow: 'auto',
              backgroundColor: theme.palette.background.paper,
            })}
          >
            <Table size="small" sx={{ tableLayout: 'fixed', borderCollapse: 'separate', ...layout.tableWidthStyle }}>
              <colgroup>
                {layout.displayColumns.map((col) => (
                  <col key={col.id} style={{ width: toColWidth(col.width) }} />
                ))}
              </colgroup>
              <GridHeader />
              <GridBody />
              {summary && summary.options?.length > 0 && <GridFooter summary={summary} />}
            </Table>
          </TableContainer>
          {pagerConfig.visible !== false && (
            <GridPager
              pageIndex={gridState.pageIndex}
              pageSize={gridState.pageSize}
              totalCount={totalCount}
              allowedPageSizes={pageSizes}
              showPageSizeSelector={pagerConfig.showPageSizeSelector ?? true}
              showInfo={pagerConfig.showInfo ?? true}
              showNavigationButtons={pagerConfig.showNavigationButtons ?? true}
              displayMode={pagerConfig.displayMode}
              onPageChange={gridState.changePage}
              onPageSizeChange={gridState.changePageSize}
            />
          )}
        </Box>

        {/* DevExtreme `notify` yerine: 2500 ms uyarı / hata bildirimi */}
        <Snackbar
          open={!!exporting.notification}
          autoHideDuration={2500}
          onClose={exporting.closeNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          {exporting.notification ? (
            <Alert severity={exporting.notification.severity} variant="filled" onClose={exporting.closeNotification}>
              {exporting.notification.message}
            </Alert>
          ) : undefined}
        </Snackbar>
      </GridContext.Provider>
    </LocalizationProvider>
  );
});

VKDataGrid.displayName = 'VKDataGrid';

export { VKDataGrid };
