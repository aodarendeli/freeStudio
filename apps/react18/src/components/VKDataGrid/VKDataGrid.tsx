import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
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
import type {
  ExportingEvent,
  FilterTypes,
  ResetFilterOptions,
  SelectionTypes,
  SortingTypes,
  VKDataGridProps,
  VKDataGridRef,
} from './VKDataGrid.types';
import { normalizeColumns, type GridColumn } from './columns';
import { GridContext, SYSTEM_COLUMN, type DisplayColumn, type DisplayColumnKind, type GridContextValue } from './context';
import { applyLocalFilters, applyLocalSearch, applyLocalSort } from './filtering';
import { buildColumnDefs, gridFeatures } from './table';
import { useGridState } from './hooks/useGridState';
import { useGridSelection } from './hooks/useGridSelection';
import { useGridEditing } from './hooks/useGridEditing';
import { useGridRowDragging } from './hooks/useGridRowDragging';
import { GridToolbar } from './parts/GridToolbar';
import { GridHeader } from './parts/GridHeader';
import { GridBody } from './parts/GridBody';
import { GridFooter } from './parts/GridFooter';
import { GridPager } from './parts/GridPager';
import { exportToExcel } from './export/exportExcel';
import { isDeepEqual, toPixelWidth } from './utils';

const SYSTEM_COLUMN_WIDTHS: Record<string, number> = {
  [SYSTEM_COLUMN.drag]: 36,
  [SYSTEM_COLUMN.select]: 48,
  [SYSTEM_COLUMN.radio]: 50,
  [SYSTEM_COLUMN.actions]: 60,
  [SYSTEM_COLUMN.command]: 96,
};

const SYSTEM_KINDS: Record<string, DisplayColumnKind> = {
  [SYSTEM_COLUMN.drag]: 'drag',
  [SYSTEM_COLUMN.select]: 'select',
  [SYSTEM_COLUMN.radio]: 'radio',
  [SYSTEM_COLUMN.actions]: 'actions',
  [SYSTEM_COLUMN.command]: 'command',
};

const MIN_COLUMN_WIDTH = 40;
const FALLBACK_COLUMN_WIDTH = 120;

const rowIdFromKey = (key: unknown) => (typeof key === 'object' && key !== null ? JSON.stringify(key) : String(key));

/** DevExtreme `allowedPageSizes: 'auto'` davranışı */
const resolvePageSizes = (sizes: unknown, pageSize: number): number[] => {
  if (Array.isArray(sizes) && sizes.length) return sizes.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return [Math.max(1, Math.floor(pageSize / 2)), pageSize, pageSize * 2];
};

const visibilityFromColumns = (columns: GridColumn[]): ColumnVisibilityState =>
  Object.fromEntries(columns.map((c) => [c.id, c.visible]));

const groupingFromColumns = (columns: GridColumn[]): GroupingState =>
  columns
    .filter((c) => typeof c.groupIndex === 'number')
    .sort((a, b) => (a.groupIndex as number) - (b.groupIndex as number))
    .map((c) => c.id);

/**
 * TanStack Table v9 + MUI tabanlı veri tablosu.
 * Props ve ref arayüzü DevExtreme tabanlı önceki sürümle birebir aynıdır.
 *
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
    multipleSelection = true,
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
    isCrud = false,
    onCreate,
    onUpdate,
    onDelete,
    actionMenuRender,
    columnChooserOption,
    pager,
    handlePrint,
    isExportAllButtonVisible = false,
    exportDataAllMethod,
    isSelected = false,
  } = props;

  // Stabil default option objeleri (her render'da yeni obje yaratmamak için)
  const memoExportOptions = useMemo(
    () => exportOptions ?? { enabled: true, allowExportSelectedData: true },
    [exportOptions]
  );
  const memoScrolling = useMemo(
    () => scrollingOption ?? { mode: 'standard', columnRenderingMode: 'standard', scrollByContent: false },
    [scrollingOption]
  );
  const memoSearchPanel = useMemo(
    () => searchPanel ?? { highlightSearchText: true, highlightCaseSensitive: true, visible: true },
    [searchPanel]
  );
  const memoSelection = useMemo(
    (): SelectionTypes =>
      selection ??
      ({
        mode: multipleSelection ? 'multiple' : 'single',
        selectAllMode: multipleSelection ? 'page' : 'none',
        showCheckBoxesMode: multipleSelection ? 'always' : 'none',
      } as SelectionTypes),
    [selection, multipleSelection]
  );
  const memoPager = useMemo(
    () =>
      pager ?? {
        showPageSizeSelector: true,
        showInfo: true,
        showNavigationButtons: true,
        visible: true,
        allowedPageSizes: allowedPageSizes,
        displayMode: 'full',
      },
    [pager, allowedPageSizes]
  );
  const memoFilterRow = useMemo(() => ({ visible: true, ...filterRow }), [filterRow]);
  const memoColumnChooser = useMemo(
    () => columnChooserOption ?? { enabled: true, allowSearch: true, title: 'Sütun Seçici' },
    [columnChooserOption]
  );
  const memoSorting = useMemo(() => sorting ?? {}, [sorting]);

  useEffect(() => {
    if (memoScrolling.mode === 'virtual' || memoScrolling.mode === 'infinite') {
      console.warn(`VKDataGrid: scrolling.mode="${memoScrolling.mode}" desteklenmiyor, standart kaydırma kullanılıyor.`);
    }
  }, [memoScrolling.mode]);

  // --- Veri ---
  const isRowDraggingEnabled = !!props.rowDragging?.allowReordering;
  const [internalData, setInternalData] = useState<any[]>(dataSource);
  useEffect(() => {
    setInternalData(dataSource);
  }, [dataSource]);
  const actualData = useMemo(
    () => (isRowDraggingEnabled ? internalData : dataSource),
    [internalData, dataSource, isRowDraggingEnabled]
  );

  // --- Sütunlar ---
  const gridColumns = useMemo(
    () => normalizeColumns(columns, dataSource, columnWidth),
    [columns, dataSource, columnWidth]
  );
  const columnsById = useMemo(() => new Map(gridColumns.map((c) => [c.id, c])), [gridColumns]);

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(() =>
    visibilityFromColumns(gridColumns)
  );
  const visibilitySignature = gridColumns.map((c) => `${c.id}:${c.visible}`).join('|');
  useEffect(() => {
    setColumnVisibility(visibilityFromColumns(gridColumns));
    // Sadece `visible` ayarları değişince kullanıcı seçimini ezer
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
  const [isWidthFrozen, setIsWidthFrozen] = useState(false);

  const visibleDataColumns = useMemo(
    () => gridColumns.filter((c) => columnVisibility[c.id] !== false),
    [gridColumns, columnVisibility]
  );
  const visibleDataColumnsRef = useRef(visibleDataColumns);
  visibleDataColumnsRef.current = visibleDataColumns;
  const getVisibleColumns = useCallback(() => visibleDataColumnsRef.current, []);

  // --- Sayfa / filtre / sıralama / arama ---
  const gridState = useGridState({
    onFilterChange,
    handlePagingChanged,
    paging,
    totalCount,
    columns: gridColumns,
    getVisibleColumns,
  });
  const { isServerMode } = gridState;

  /** Basit modda DevExtreme filtre/arama/sıralamayı sayfadaki veride yerel yapıyordu */
  const processedData = useMemo(() => {
    let rows = actualData;
    if (!isServerMode) {
      rows = applyLocalFilters(rows, visibleDataColumns, gridState.filters);
      rows = applyLocalSearch(rows, visibleDataColumns, gridState.searchText);
      rows = applyLocalSort(rows, columnsById, gridState.sorting);
    }
    if (groupingState.length) {
      rows = applyLocalSort(
        rows,
        columnsById,
        groupingState.map((id) => ({ id, desc: gridState.sorting.find((r) => r.id === id)?.desc ?? false }))
      );
    }
    return rows;
  }, [
    actualData,
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
  const { isKeyExistsInData, isRowSelected, applyPageSelection, getGridKey } = gridSelection;
  const [selectedRadioRowKey, setSelectedRadioRowKey] = useState<unknown>(null);

  const getRowId = useCallback(
    (row: any, index: number) =>
      isKeyExistsInData && rowKeyExpr ? rowIdFromKey(row?.[rowKeyExpr]) : String(index),
    [isKeyExistsInData, rowKeyExpr]
  );

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

  // --- TanStack tablo ---
  const hasFixedColumn = useMemo(() => gridColumns.some((col) => col.fixed), [gridColumns]);
  const showSelectColumn =
    memoSelection.mode === 'multiple' && memoSelection.showCheckBoxesMode !== 'none';

  const columnDefs = useMemo(
    () =>
      buildColumnDefs({
        columns: gridColumns,
        showDragColumn: isRowDraggingEnabled && (props.rowDragging?.showDragIcons ?? true),
        showSelectColumn,
        showRadioColumn: singleRowRadioSelection,
        showActionsColumn: !!actionMenuRender,
        showCommandColumn: isCrud,
      }),
    [
      gridColumns,
      isRowDraggingEnabled,
      props.rowDragging?.showDragIcons,
      showSelectColumn,
      singleRowRadioSelection,
      actionMenuRender,
      isCrud,
    ]
  );

  const columnPinning = useMemo(() => {
    const systemStart = hasFixedColumn
      ? columnDefs.map((c) => c.id as string).filter((id) => id !== SYSTEM_COLUMN.command && SYSTEM_KINDS[id])
      : [];
    return {
      start: [
        ...systemStart,
        ...gridColumns.filter((c) => c.fixed && c.fixedPosition === 'left').map((c) => c.id),
      ],
      end: [
        ...gridColumns.filter((c) => c.fixed && c.fixedPosition === 'right').map((c) => c.id),
        ...(hasFixedColumn && isCrud ? [SYSTEM_COLUMN.command] : []),
      ],
    };
  }, [columnDefs, gridColumns, hasFixedColumn, isCrud]);

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
    enableMultiRowSelection: memoSelection.mode === 'multiple',
    enableRowRangeSelection: false,
    groupedColumnMode: 'remove',
    autoResetExpanded: false,
  });

  // --- Sütun genişlikleri ve sabit sütun ofsetleri ---
  const headerCellsRef = useRef<Record<string, HTMLElement | null>>({});
  const [measuredWidths, setMeasuredWidths] = useState<Record<string, number>>({});
  const registerHeaderCell = useCallback((id: string, element: HTMLElement | null) => {
    headerCellsRef.current[id] = element;
  }, []);

  const measureColumns = useCallback(() => {
    const next: Record<string, number> = {};
    Object.entries(headerCellsRef.current).forEach(([id, element]) => {
      if (element) next[id] = Math.round(element.getBoundingClientRect().width);
    });
    setMeasuredWidths((prev) => (isDeepEqual(prev, next) ? prev : next));
  }, []);

  useLayoutEffect(() => {
    measureColumns();
  });
  useEffect(() => {
    window.addEventListener('resize', measureColumns);
    return () => window.removeEventListener('resize', measureColumns);
  }, [measureColumns]);

  const orderedColumns = [
    ...table.getStartVisibleLeafColumns().map((c) => ({ id: c.id, pinned: 'left' as const })),
    ...table.getCenterVisibleLeafColumns().map((c) => ({ id: c.id, pinned: false as const })),
    ...table.getEndVisibleLeafColumns().map((c) => ({ id: c.id, pinned: 'right' as const })),
  ];

  const displayColumns: DisplayColumn[] = useMemo(() => {
    const result: DisplayColumn[] = orderedColumns.map(({ id, pinned }) => {
      const column = columnsById.get(id);
      return {
        id,
        kind: SYSTEM_KINDS[id] ?? 'data',
        column,
        width: SYSTEM_COLUMN_WIDTHS[id] ?? columnSizing[id] ?? column?.width,
        pinned,
      };
    });
    let left = 0;
    result.forEach((col) => {
      if (col.pinned !== 'left') return;
      col.offset = left;
      left += measuredWidths[col.id] ?? toPixelWidth(col.width) ?? 0;
    });
    let right = 0;
    [...result].reverse().forEach((col) => {
      if (col.pinned !== 'right') return;
      col.offset = right;
      right += measuredWidths[col.id] ?? toPixelWidth(col.width) ?? 0;
    });
    const lastLeft = result.filter((c) => c.pinned === 'left').at(-1);
    const firstRight = result.find((c) => c.pinned === 'right');
    if (lastLeft) lastLeft.isLastLeftPinned = true;
    if (firstRight) firstRight.isFirstRightPinned = true;
    return result;
    // orderedColumns her render yeni dizi, imzası ile karşılaştırılıyor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedColumns.map((c) => `${c.id}:${c.pinned}`).join('|'), columnsById, columnSizing, measuredWidths]);

  const tableWidthStyle = useMemo(() => {
    const widths = displayColumns.map((c) => toPixelWidth(c.width));
    const known = widths.reduce<number>((sum, w) => sum + (w ?? 0), 0);
    const unknownCount = widths.filter((w) => w === undefined).length;
    if (isWidthFrozen && unknownCount === 0) return { width: known, minWidth: known };
    return { width: '100%', minWidth: known + unknownCount * FALLBACK_COLUMN_WIDTH * 0.5 };
  }, [displayColumns, isWidthFrozen]);

  /** DevExtreme `columnResizingMode="widget"`: diğer sütunlar sabit kalır, tablo genişliği değişir */
  const startColumnResize = useCallback(
    (id: string, event: React.PointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const frozen: ColumnSizingState = {};
      displayColumns.forEach((col) => {
        if (col.kind !== 'data') return;
        frozen[col.id] = columnSizing[col.id] ?? measuredWidths[col.id] ?? toPixelWidth(col.width) ?? FALLBACK_COLUMN_WIDTH;
      });
      const startWidth = frozen[id] ?? FALLBACK_COLUMN_WIDTH;
      setColumnSizing(frozen);
      setIsWidthFrozen(true);

      const onMove = (moveEvent: PointerEvent) => {
        const width = Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + moveEvent.clientX - startX));
        setColumnSizing((prev) => ({ ...prev, [id]: width }));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        // Bırakma sonrası gelen click başlıkta sıralamayı tetiklemesin
        const suppressClick = (clickEvent: MouseEvent) => clickEvent.stopPropagation();
        window.addEventListener('click', suppressClick, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', suppressClick, { capture: true }), 0);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [displayColumns, columnSizing, measuredWidths]
  );

  // --- CRUD ---
  const [notification, setNotification] = useState<{ message: string; severity: 'warning' | 'error' } | null>(
    null
  );
  const notifyError = useCallback((message: string) => setNotification({ message, severity: 'error' }), []);
  const editing = useGridEditing({ onCreate, onUpdate, onDelete, getRowKey: getGridKey, onError: notifyError });

  // --- Satır sürükleme ---
  const visibleDataRows = table
    .getRowModel()
    .rows.filter((row) => !row.getIsGrouped())
    .map((row) => ({ id: row.id, data: row.original }));
  const dragging = useGridRowDragging({
    rowDragging: props.rowDragging,
    rowKeyExpr,
    visibleRows: visibleDataRows,
    setInternalData,
  });

  // --- Satır tıklama: radio seçimi ve satıra tıklayarak seçim ---
  const getRadioKey = useCallback((row: any) => (rowKeyExpr ? row?.[rowKeyExpr] : row), [rowKeyExpr]);

  const handleRowClick = useCallback(
    (row: any, event: React.MouseEvent) => {
      if (singleRowRadioSelection) {
        const key = getRadioKey(row);
        if (!isDeepEqual(key, selectedRadioRowKey)) {
          setSelectedRadioRowKey(key);
          rowSelectionChange?.({ selectedRowsData: [row], selectedRowKeys: [key] });
        }
      }
      const isCtrl = event.ctrlKey || event.metaKey;
      const selected = isRowSelected(row);
      const pageSelected = processedData.filter((r) => isRowSelected(r));
      if (memoSelection.mode === 'single') {
        if (isCtrl && selected) applyPageSelection([]);
        else if (!selected) applyPageSelection([row]);
        return;
      }
      if (memoSelection.showCheckBoxesMode === 'always' || isCtrl) {
        applyPageSelection(selected ? pageSelected.filter((r) => r !== row) : [...pageSelected, row]);
        return;
      }
      if (!(selected && pageSelected.length === 1)) applyPageSelection([row]);
    },
    [
      singleRowRadioSelection,
      getRadioKey,
      selectedRadioRowKey,
      rowSelectionChange,
      isRowSelected,
      processedData,
      memoSelection,
      applyPageSelection,
    ]
  );

  // --- Dışa aktarma ---
  const rootRef = useRef<HTMLDivElement>(null);
  const exportColumns = displayColumns.filter((c) => c.kind === 'data' && c.column).map((c) => c.column!);

  const runExport = useCallback(
    (rows: any[], selectedRowsOnly: boolean) => {
      const event: ExportingEvent = {
        component: {
          getSelectedRowsData: () => gridSelection.internalSelectedData,
          getSelectedRowKeys: () => gridSelection.internalSelectedData.map((row) => getRadioKey(row)),
          getVisibleColumns: () => exportColumns.map((c) => c.raw),
          getVisibleRows: () => rows.map((data) => ({ data, rowType: 'data' })),
          pageIndex: () => gridState.pageIndex,
          pageSize: () => gridState.pageSize,
          totalCount: () => totalCount,
        },
        element: rootRef.current,
        fileName: 'DataGrid',
        format: 'xlsx',
        selectedRowsOnly,
        cancel: false,
      };
      onExporting?.(event);
      if (event.cancel) return;
      exportToExcel(rows, exportColumns, event.fileName).catch((error) => {
        notifyError(error instanceof Error ? error.message : 'Dışa aktarma başarısız oldu.');
      });
    },
    [gridSelection.internalSelectedData, getRadioKey, exportColumns, gridState.pageIndex, gridState.pageSize, totalCount, onExporting, notifyError]
  );

  const handleExportSelected = () => {
    if (!gridSelection.internalSelectedData.length && isSelected) {
      setNotification({ message: 'Lütfen önce en az 1 satır seçin.', severity: 'warning' });
      return;
    }
    runExport(gridSelection.internalSelectedData, true);
  };

  // --- Ref API ---
  useImperativeHandle(
    ref,
    () => ({
      resetFilters: (resetFilterOptions?: ResetFilterOptions) => gridState.resetFilters(resetFilterOptions),
      getFilters: () => gridState.getFilters(),
      applyFilters: (filters: FilterTypes[], sort: SortingTypes | null = null) =>
        gridState.applyFilters(filters, sort),
    }),
    [gridState]
  );

  // --- Sayfalayıcı ---
  const pageSizes = resolvePageSizes(memoPager.allowedPageSizes ?? allowedPageSizes, gridState.pageSize);
  const isHeightFixed = height !== 'auto' && height !== undefined && height !== null;

  const contextValue: GridContextValue = {
    table,
    displayColumns,
    allColumns: gridColumns,
    gridState,
    selection: gridSelection,
    selectionConfig: memoSelection,
    editing,
    dragging,
    isRowDraggingEnabled,
    showDragIcons: props.rowDragging?.showDragIcons ?? true,
    showRowLines,
    showColumnLines,
    rowAlternationEnabled,
    isHeaderBold,
    noDataText,
    filterRowVisible: memoFilterRow.visible !== false,
    showAllText: memoFilterRow.showAllText,
    resetOperationText: resetOperationText ?? 'Sıfırla',
    headerFilter,
    headerFilterData,
    sortingConfig: memoSorting,
    allowColumnResizing,
    allowColumnReordering,
    grouping,
    highlight: {
      enabled: memoSearchPanel.highlightSearchText ?? true,
      caseSensitive: memoSearchPanel.highlightCaseSensitive ?? false,
    },
    pageData: processedData,
    singleRowRadioSelection,
    selectedRadioRowKey,
    getRadioKey,
    actionMenuRender,
    onRowClick: handleRowClick,
    registerHeaderCell,
    startColumnResize,
    stickyHeader: isHeightFixed,
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
      <GridContext.Provider value={contextValue}>
        <Box
          ref={rootRef}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: 0,
            height: isHeightFixed ? height : undefined,
          }}
        >
          <GridToolbar
            table={table}
            columns={gridColumns}
            searchVisible={memoSearchPanel.visible ?? false}
            searchText={gridState.searchText}
            onSearch={gridState.changeSearch}
            columnChooser={memoColumnChooser}
            showAddButton={isCrud}
            isAddDisabled={!!editing.editingRow || editing.isPending}
            onAdd={editing.startAdd}
            showExportButton={!!memoExportOptions.enabled}
            onExport={() => runExport(processedData, false)}
            showPrintButton={isPrintButtonVisible}
            onPrint={handlePrint}
            showExportAllButton={isExportAllButtonVisible}
            onExportAll={exportDataAllMethod}
            showExportSelectedButton={!!memoExportOptions.allowExportSelectedData}
            onExportSelected={handleExportSelected}
          />
          <TableContainer
            sx={(theme) => ({
              flex: '1 1 auto',
              minHeight: 0,
              overflow: 'auto',
              border: showBorders ? `1px solid ${theme.palette.divider}` : 'none',
              backgroundColor: theme.palette.background.paper,
            })}
          >
            <Table size="small" sx={{ tableLayout: 'fixed', borderCollapse: 'separate', ...tableWidthStyle }}>
              <colgroup>
                {displayColumns.map((col) => (
                  <col
                    key={col.id}
                    style={{
                      width:
                        typeof col.width === 'number'
                          ? col.width
                          : typeof col.width === 'string' && col.width !== 'auto'
                            ? col.width
                            : undefined,
                    }}
                  />
                ))}
              </colgroup>
              <GridHeader />
              <GridBody />
              {summary && summary.options?.length > 0 && <GridFooter summary={summary} />}
            </Table>
          </TableContainer>
          {memoPager.visible !== false && (
            <GridPager
              pageIndex={gridState.pageIndex}
              pageSize={gridState.pageSize}
              totalCount={totalCount}
              allowedPageSizes={pageSizes}
              showPageSizeSelector={memoPager.showPageSizeSelector ?? true}
              showInfo={memoPager.showInfo ?? true}
              showNavigationButtons={memoPager.showNavigationButtons ?? true}
              displayMode={memoPager.displayMode}
              onPageChange={gridState.changePage}
              onPageSizeChange={gridState.changePageSize}
            />
          )}
        </Box>

        <Snackbar
          open={!!notification}
          autoHideDuration={2500}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          {notification ? (
            <Alert severity={notification.severity} variant="filled" onClose={() => setNotification(null)}>
              {notification.message}
            </Alert>
          ) : undefined}
        </Snackbar>

        {isCrud && (
          <Dialog open={!!editing.deleteTarget} onClose={editing.cancelDelete}>
            <DialogContent>
              <DialogContentText>Bu kaydı silmek istediğinizden emin misiniz?</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={editing.cancelDelete} disabled={editing.isPending}>
                Hayır
              </Button>
              <Button onClick={editing.confirmDelete} disabled={editing.isPending} variant="contained" color="error">
                Evet
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </GridContext.Provider>
    </LocalizationProvider>
  );
});

VKDataGrid.displayName = 'VKDataGrid';

export { VKDataGrid };
