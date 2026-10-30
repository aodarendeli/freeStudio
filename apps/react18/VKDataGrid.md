import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  ResetFilterOptions,
  VKDataGridProps,
  VKDataGridRef,
  RowsKeysType,
  InternalSelectedDataType,
  FilterTypes,
  SortingTypes,
} from '../VKDataGrid/VKDataGrid.types';
import './dx.material.blue.light.css';
import {
  DataGrid,
  Paging,
  Export,
  Pager,
  SearchPanel,
  Selection,
  FilterRow,
  HeaderFilter,
  Column,
  Editing,
  ColumnChooser,
  Scrolling,
  RowDragging,
  Summary,
  TotalItem,
  Grouping,
  LoadPanel,
  ColumnFixing,
} from 'devextreme-react/data-grid';
import type { SelectionChangedEvent } from 'devextreme/ui/data_grid';
import CustomStore from 'devextreme/data/custom_store';
import styles from './VKDataGrid.module.css';
import notify from 'devextreme/ui/notify';
import { VKErrorBoundry } from '../../error/vkerror';
import { isDeepEqual } from './utils';
/**
* Form component that provides form management and validation capabilities.
* Built on top of react-hook-form with additional features for validation and error handling.
*
* @component
* @example
* ```tsx
*  <DataGrid dataSource={dataSource} showBorders={showBorders}>
*    <Paging pageSize={paging.pageSize} enabled={paging.enabled} pageIndex={paging.pageIndex} />
*    <Export enabled={export.enabled} />
* </DataGrid>
* ```
*
* @returns {JSX.Element} A form component with validation and error handling
*/
const VKDataGrid = forwardRef<VKDataGridRef, VKDataGridProps>(
  (props: VKDataGridProps, ref: any) => {
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
      actionMenuRender = false,
      columnChooserOption,
      pager,
      handlePrint,
      isExportAllButtonVisible = false,
      exportDataAllMethod,
      isSelected = false,
      /*  disableSelection = false, */
    } = props;
    // Stabil default option objeleri (her render’da yeni obje yaratıp grid’i re-init etmemek için)
    const memoExportOptions = useMemo(
      () => exportOptions ?? { enabled: true, allowExportSelectedData: true },
      [exportOptions]
    );
    const memoScrolling = useMemo(
      () =>
        scrollingOption ?? {
          mode: 'standard',
          columnRenderingMode: 'standard',
          scrollByContent: false,
        },
      [scrollingOption]
    );
    const memoSearchPanel = useMemo(
      () =>
        searchPanel ?? {
          highlightSearchText: true,
          highlightCaseSensitive: true,
          visible: true,
        },
      [searchPanel]
    );
    const memoSelection = useMemo(
      () =>
        selection ?? {
          mode: multipleSelection ? 'multiple' : 'single',
          selectAllMode: multipleSelection ? 'page' : 'none',
          showCheckBoxesMode: multipleSelection ? 'always' : 'none',
        },
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
    const memoFilterRow = useMemo(
      () => ({
        visible: true,
        ...filterRow,
      }),
      [filterRow]
    );
    const memoColumnChooser = useMemo(
      () => columnChooserOption ?? { enabled: true, allowSearch: true, title: 'Sütun Seçici' },
      [columnChooserOption]
    );
    const memoRemoteOps = useMemo(() => {
      const hasOnFilterChange = typeof onFilterChange === 'function';
      return hasOnFilterChange
        ? {
            paging: true,
            filtering: true,
            sorting: true,
            summary: true,
            groupPaging: false,
          }
        : { paging: true, filtering: false, sorting: false, summary: true, groupPaging: false };
    }, [onFilterChange]);
    const [internalData, setInternalData] = useState<any[]>(dataSource);
    const [internalSelectedData, setInternalSelectedData] = useState<InternalSelectedDataType[]>(
      () =>
        Array.isArray(selectedRowKeys)
          ? selectedRowKeys
              .map((item): InternalSelectedDataType | null => {
                if (item && typeof item === 'object') {
                  return item as InternalSelectedDataType;
                }
                if ((typeof item === 'string' || typeof item === 'number') && rowKeyExpr) {
                  return { [rowKeyExpr]: item };
                }
                return null;
              })
              .filter((x): x is InternalSelectedDataType => x !== null)
          : []
    );
    const [selectedRadioRowKey, setSelectedRadioRowKey] = useState<number | string | null>(null);
    const [pageIndex, setPageIndex] = useState(paging?.pageIndex ?? 0);
    const [pageSize, setPageSize] = useState(paging?.pageSize ?? 10);
    const dataGridRef = useRef<DataGrid>(null);
    let latestOptionsRef: any = useRef({
      filters: [],
      searchText: '',
      sort: null,
      pageSize: pageSize,
    });
    const isClearingRef = useRef<any>(false);
    const actualData = useMemo(
      () => (props.rowDragging?.allowReordering ? internalData : dataSource),
      [internalData, dataSource, props.rowDragging?.allowReordering]
    );
    const source = useMemo(() => {
      const isKeyExistsInData =
        actualData && actualData[0]
          ? Object.keys(actualData[0]).some((s) => s === rowKeyExpr)
          : false;
      const key = isKeyExistsInData ? rowKeyExpr : undefined;
      return new CustomStore({
        key,
        load: async () => ({
          data: actualData,
          totalCount,
          summary: summary?.count || [],
        }),
        ...(isCrud
          ? {
              insert: async (values) => await onCreate?.(values),
              update: async (key, values) => await onUpdate?.(key, values),
              remove: async (key) => await onDelete?.(key),
            }
          : {}),
      });
    }, [actualData, summary, totalCount, isCrud]);
    useEffect(() => {
      setInternalData(dataSource);
    }, [dataSource]);
    useEffect(() => {
      const handlePointer = (event: PointerEvent) => {
        const target = event.target as HTMLElement;
        const isInsideColumnChooser = target.closest('.dx-datagrid-column-chooser');
        if (!isInsideColumnChooser) {
          dataGridRef.current?.instance?.hideColumnChooser();
        }
      };
      document.addEventListener('pointerdown', handlePointer, true);
      return () => {
        document.removeEventListener('pointerdown', handlePointer, true);
      };
    }, []);
    useEffect(() => {
      if (!rowKeyExpr || multipleSelection) return;
      const availableKeys = new Set(actualData.map((row) => row?.[rowKeyExpr]));
      setInternalSelectedData((prev) =>
        prev.filter((selectedRow) => availableKeys.has(selectedRow?.[rowKeyExpr]))
      );
    }, [actualData, rowKeyExpr, multipleSelection]);
    const internalSelectedKeys = useMemo(
      () => internalSelectedData.map((item) => (rowKeyExpr ? item?.[rowKeyExpr] : item)),
      [internalSelectedData, rowKeyExpr]
    );
    const getFilters = () => {
      const payload = {
        filter: latestOptionsRef?.current?.filters,
        searchText: latestOptionsRef?.current?.searchText,
        sort: latestOptionsRef?.current?.sort,
        pageIndex: pageIndex,
        pageSize: latestOptionsRef?.current?.pageSize,
      };
      return payload;
    };
    useImperativeHandle(ref, () => ({
      resetFilters: (resetFilterOptions?: ResetFilterOptions) => {
        if (dataGridRef?.current && dataGridRef?.current?.instance) {
          const {
            resetSort = true,
            resetFilter = true,
            resetSearch = true,
            triggerOnFilterChange = false,
          } = resetFilterOptions || {};
          const instance = dataGridRef.current.instance;
          isClearingRef.current = true;
          setPageIndex(0);
          resetFilter ?? instance.clearFilter();
          resetSort ?? instance.clearSorting();
          resetSearch ?? instance.searchByText('');
          latestOptionsRef.current = {
            ...latestOptionsRef.current,
            ...(resetFilter && { filters: [] }),
            ...(resetSort && { searchText: '' }),
            ...(resetSearch && { sort: null }),
            pageSize: pageSize,
          };
          isClearingRef.current = false;
          if (triggerOnFilterChange)
            onFilterChange?.({
              ...latestOptionsRef.current,
              pageIndex: 0,
            });
        }
      },
      getFilters: () => {
        return getFilters();
      },
      applyFilters: (filters: FilterTypes[], sort: SortingTypes | null = null) => {
        const instance = dataGridRef.current?.instance;
        if (!instance) return;
        isClearingRef.current = true;
        filters.forEach((filter) => {
          instance.columnOption(
            filter.dataField,
            'selectedFilterOperation',
            filter.filterOperator ?? 'contains'
          );
          instance.columnOption(filter.dataField, 'filterValue', filter.filterValue);
          if (filter.name !== undefined) {
            instance.columnOption(filter.dataField, 'name', filter.name);
          }
        });
        if (sort) {
          instance.columnOption(sort.dataField, 'sortOrder', sort.sortOrder);
        }
        latestOptionsRef.current = {
          ...latestOptionsRef.current,
          filters,
          sort,
        };
        setPageIndex(0);
        isClearingRef.current = false;
        onFilterChange?.({
          filter: filters,
          searchText: latestOptionsRef.current.searchText,
          sort,
          pageIndex: 0,
          pageSize: latestOptionsRef.current.pageSize,
        });
      },
    }));
    const dataGridColumns = useMemo(() => {
      if (columns) return columns;
      if (dataSource && dataSource.length > 0) {
        // Eğer seçim kapalıysa hiçbir şey yapma
        return Object.keys(dataSource[0]).map((key) => {
          return { dataField: key, caption: key };
        });
      }
      return [];
    }, [dataSource, columns]);
    const handleSelectionChange = (e: SelectionChangedEvent) => {
      const { selectedRowKeys, selectedRowsData } = e;
      const existingPageKeys: RowsKeysType[] =
        dataGridRef.current?.instance
          .getVisibleRows()
          .map((row: any) => row?.key as RowsKeysType) || [];
      const discardKeys = existingPageKeys.filter(
        (key) =>
          !selectedRowKeys.some((selectedKey) => {
            return isDeepEqual(selectedKey as RowsKeysType, key);
          })
      );
      setInternalSelectedData((prevKeys) => {
        let selectedObjectDatas: InternalSelectedDataType[] = [
          ...prevKeys.filter(
            (s): s is InternalSelectedDataType => typeof s === 'object' && s !== null
          ),
        ];
        if (discardKeys.length > 0) {
          selectedObjectDatas = selectedObjectDatas.filter((row) => {
            const rowKey = rowKeyExpr ? (row?.[rowKeyExpr] as RowsKeysType) : row;
            return !discardKeys.some((discardKey) => isDeepEqual(rowKey, discardKey));
          });
        }
        selectedRowsData.forEach((row: any) => {
          if (!rowKeyExpr) {
            selectedObjectDatas.push(row as InternalSelectedDataType);
            return;
          }
          const key = row?.[rowKeyExpr] as RowsKeysType;
          if (key === undefined || key === null) return;
          const existingIndex = selectedObjectDatas.findIndex((r) =>
            isDeepEqual(r?.[rowKeyExpr] as RowsKeysType, key)
          );
          if (existingIndex > -1) {
            selectedObjectDatas[existingIndex] = {
              ...selectedObjectDatas[existingIndex],
              ...row,
            };
          } else {
            selectedObjectDatas.push(row as InternalSelectedDataType);
          }
        });
        rowSelectionChange?.({
          selectedRowKeys: rowKeyExpr
            ? selectedObjectDatas.map((item) => item?.[rowKeyExpr] as RowsKeysType)
            : selectedObjectDatas,
          selectedRowsData: selectedObjectDatas,
        });
        return selectedObjectDatas;
      });
    };
    const handleToolbarPreparing = (e: any) => {
      if (isPrintButtonVisible) {
        e.toolbarOptions.items.push({
          location: 'after',
          widget: 'dxButton',
          options: {
            icon: 'print',
            hint: 'Yazdır',
            onClick: handlePrint,
          },
        });
      }
      if (isExportAllButtonVisible) {
        e.toolbarOptions.items.push({
          location: 'after',
          widget: 'dxButton',
          options: {
            icon: 'export',
            hint: 'Tüm Veriyi Dışa Aktar',
            onClick: exportDataAllMethod,
          },
        });
      }
      if (memoExportOptions.allowExportSelectedData) {
        e.toolbarOptions.items.push({
          location: 'after',
          widget: 'dxButton',
          options: {
            icon: 'exportselected',
            hint: 'Seçili Satırları Dışa Aktar',
            onClick: () => {
              const selectedKeys = dataGridRef.current?.instance.getSelectedRowKeys?.() ?? [];
              if (!selectedKeys.length && isSelected) {
                notify('Lütfen önce en az 1 satır seçin.', 'warning', 2500);
                return;
              }
              // selected export
              dataGridRef.current?.instance.exportToExcel(true);
            },
          },
        });
      }
    };
    const handleReorder = (e: any) => {
      const visibleRows = e.component.getVisibleRows();
      const item = e.itemData;
      const defaultDropAllowed = () => {
        const toData = visibleRows[e.toIndex]?.data;
        if (!toData) return false;
        const sourceIsUser = item?.isNonDraggable !== true;
        const targetIsUser = toData?.isNonDraggable !== true;
        return sourceIsUser && targetIsUser;
      };
      const allowed =
        typeof props.rowDragging?.isDropAllowed === 'function'
          ? props.rowDragging.isDropAllowed(
              e.fromIndex,
              e.toIndex,
              item,
              visibleRows.map((r: any) => r.data)
            )
          : defaultDropAllowed();
      if (!allowed) return;
      setInternalData((prev: any) => {
        const newData = [...prev];
        const getKey = (row: any) => (rowKeyExpr ? row?.[rowKeyExpr] : row);
        const toKey = getKey(visibleRows[e.toIndex]?.data);
        const fromKey = getKey(item);
        const toIndex = newData.findIndex((itm) =>
          rowKeyExpr ? isDeepEqual(getKey(itm), toKey) : itm === visibleRows[e.toIndex]?.data
        );
        const fromIndex = newData.findIndex((itm) =>
          rowKeyExpr ? isDeepEqual(getKey(itm), fromKey) : itm === item
        );
        if (fromIndex === -1 || toIndex === -1) return prev;
        const [movedItem] = newData.splice(fromIndex, 1);
        newData.splice(toIndex, 0, movedItem);
        return newData;
      });
      props.rowDragging?.onReorder?.(e.fromIndex, e.toIndex);
    };
    const handleOptionChange = async (e: any) => {
      if (isClearingRef?.current) return;
      const dataEvents = ['paging', 'searchPanel', 'columns'];
      if (dataEvents.includes(e?.name)) {
        let willJumpToZero = false;
        let nextPageIndex;
        let nextSort: any = latestOptionsRef?.current?.sort;
        if (
          e?.name === 'columns' &&
          (e?.fullName?.includes('width') ||
            e?.fullName?.includes('selectedFilterOperation') ||
            (e?.fullName?.includes('filterValue') &&
              (e?.value === null || e?.value === undefined) &&
              (e?.previousValue === null || e?.previousValue === undefined)))
        ) {
          return;
        } else {
          if (e?.fullName?.includes('sortOrder')) {
            const match = e?.fullName?.match(/columns\[(\d+)\]\.sortOrder/);
            if (match) {
              const columnIndex = Number(match[1]);
              const column = e?.component?.option('columns')[columnIndex];
              if (e.value) {
                nextSort = {
                  dataField: column?.dataField,
                  dataType: column?.dataType ?? 'string',
                  sortOrder: e?.value,
                  name: column?.name ?? undefined,
                };
              } else {
                nextSort = null;
              }
              latestOptionsRef.current.sort = nextSort;
            }
          }
          if (e.fullName === 'paging.pageSize') {
            latestOptionsRef.current.pageSize = e?.value;
          }
          if (e.fullName === 'paging.pageIndex') {
            nextPageIndex = e?.value;
          }
          if (
            nextPageIndex >= 0 ||
            e?.fullName === 'searchPanel.text' ||
            e?.fullName === 'paging.pageSize' ||
            (e?.fullName && e?.fullName?.includes('filterValue')) ||
            (e?.fullName && e?.fullName?.includes('sortOrder'))
          ) {
            if (
              e?.fullName === 'searchPanel.text' ||
              e?.fullName === 'paging.pageSize' ||
              (e?.fullName && e?.fullName.includes('filterValue')) ||
              (e?.fullName && e?.fullName?.includes('sortOrder'))
            ) {
              latestOptionsRef.current.searchText = e?.component?.option('searchPanel.text');
              latestOptionsRef.current.filters = e?.component?.option('filterValue');
              latestOptionsRef.current.filters = getCleanFilters(e);
              const isNullValue = latestOptionsRef?.current?.filters
                ?.find((filter: any) => Array.isArray(filter?.filterValue))
                ?.filterValue?.some((x: any) => x === null || x === undefined);
              if (isNullValue) {
                return;
              }
              latestOptionsRef.current.pageSize = e?.component?.pageSize();
              willJumpToZero = true;
            }
            const options = {
              filter: latestOptionsRef?.current?.filters,
              searchText: latestOptionsRef?.current?.searchText,
              sort: nextSort,
              pageIndex: willJumpToZero ? 0 : (nextPageIndex ?? pageIndex),
              pageSize: latestOptionsRef?.current?.pageSize,
            };
            setPageIndex(options?.pageIndex);
            setPageSize(latestOptionsRef?.current?.pageSize);
            onFilterChange?.(options);
          }
        }
      }
    };
    const getCleanFilters = (e: any) => {
      const columns = e?.component?.getVisibleColumns();
      const activeFilters = columns
        .map((col: any) => ({
          dataField: col?.dataField,
          dataType: col?.dataType || 'string',
          name: col?.name,
          filterOperator: col?.selectedFilterOperation
            ? col?.selectedFilterOperation
            : col?.dataType === 'boolean' || col?.dataType === 'number'
              ? '='
              : 'contains',
          filterValue: col?.filterValue,
          ...(col?.filterValues && { filterValues: col?.filterValues }),
        }))
        .filter(
          (f: any) =>
            (f?.filterValue !== undefined && f?.filterValue !== null) ||
            (f?.filterValues && f?.filterValues.length)
        );
      return activeFilters;
    };
    const hasFixedColumn = useMemo(
      () => dataGridColumns.some((col) => col?.fixed === true),
      [dataGridColumns]
    );
    /*  const triggerResizeAfterRenderRef = useRef(false);
     console.log('triggerWindowResizeForFixedColumnOutsideFunc', triggerResizeAfterRenderRef);
     const triggerWindowResizeForFixedColumn = () => {
       console.log('triggerWindowResizeForFixedColumn', triggerResizeAfterRenderRef);
       if (triggerResizeAfterRenderRef.current) return;
       triggerResizeAfterRenderRef.current = true;
       requestAnimationFrame(() => {
         requestAnimationFrame(() => {
           console.log('requestAnimationFrame', dataGridRef?.current?.instance);
           window.dispatchEvent(new Event('resize'));
           dataGridRef?.current?.instance?.updateDimensions();
           triggerResizeAfterRenderRef.current = false;
         });
       })
     }; */
    return (
<VKErrorBoundry>
<DataGrid
          keyExpr={rowKeyExpr}
          columnResizingMode="widget"
          allowColumnReordering={allowColumnReordering}
          allowColumnResizing={allowColumnResizing}
          remoteOperations={memoRemoteOps}
          dataSource={source}
          showBorders={showBorders}
          showRowLines={showRowLines}
          onSelectionChanged={handleSelectionChange}
          showColumnLines={showColumnLines}
          selectedRowKeys={internalSelectedKeys}
          noDataText={noDataText}
          rowAlternationEnabled={rowAlternationEnabled}
          ref={dataGridRef}
          className={`${styles.dataGrid} ${isHeaderBold ? styles.boldHeader : ''}`}
          columnWidth={columnWidth}
          sorting={sorting}
          onExporting={onExporting}
          height={height}
          onToolbarPreparing={handleToolbarPreparing}
          onContentReady={(e) => {
            const instance = dataGridRef?.current?.instance;
            const existingPageKeys =
              instance?.getVisibleRows().map((row) => row?.key as RowsKeysType) || [];
            const keys =
              internalSelectedData?.map((s) =>
                rowKeyExpr ? (s?.[rowKeyExpr] as RowsKeysType) : (s as RowsKeysType)
              ) || [];
            const filteredKeys = existingPageKeys.filter((pageKey) =>
              keys.some((selectedKey) => isDeepEqual(selectedKey, pageKey))
            );
            e?.component?.option('selectedRowKeys', filteredKeys);
            /*  const hasCellRenderColumn = dataGridColumns.some(
               (col) => typeof col?.cellRender === 'function'
             ); */
            /*   if (hasFixedColumn) {
                console.log("hasFixedColumnRun");
                triggerWindowResizeForFixedColumn();
              } */
          }}
          onRowClick={(e) => {
            if (singleRowRadioSelection) {
              const key = rowKeyExpr ? e.data?.[rowKeyExpr] : e.data;
              if (key !== selectedRadioRowKey) {
                setSelectedRadioRowKey(key);
                rowSelectionChange?.({
                  selectedRowsData: [e.data],
                  selectedRowKeys: [key],
                });
              }
            }
          }}
          /*  
          Group header için style düzenlemesi
          onCellPrepared={(e) => {
              if (e.rowType === 'group' && e.cellElement) {
                const groupColField = e.column?.dataField;
                if (groupColField && groupHeaderStyleByColumn?.[groupColField]) {
                  Object.assign(e.cellElement.style, groupHeaderStyleByColumn[groupColField]);
                }
              }
            }} */
          {...(onFilterChange && { onOptionChanged: handleOptionChange })}
          // filterSyncEnabled={false}
          focusedRowEnabled={false}
          focusStateEnabled={false}
          hoverStateEnabled={false}
          repaintChangesOnly={true}
          columnAutoWidth={false}
          wordWrapEnabled={false}
>
          {props.rowDragging?.allowReordering && (
<RowDragging
              allowReordering={props.rowDragging.allowReordering}
              showDragIcons={props.rowDragging.showDragIcons ?? true}
              onDragStart={(e: any) => {
                const item = e.itemData;
                const isDraggable =
                  typeof props.rowDragging?.isRowDraggable === 'function'
                    ? props.rowDragging.isRowDraggable(item)
                    : item?.isNonDraggable !== true;
                if (!isDraggable) {
                  e.cancel = true;
                }
              }}
              onDragChange={(e: any) => {
                const visibleRows = e.component.getVisibleRows();
                const item = e.itemData;
                const toData = visibleRows[e.toIndex]?.data;
                const defaultDropAllowed = () => {
                  if (!toData) return false;
                  const sourceIsUser = item?.isNonDraggable !== true;
                  const targetIsUser = toData?.isNonDraggable !== true;
                  return sourceIsUser && targetIsUser;
                };
                const allowed =
                  typeof props.rowDragging?.isDropAllowed === 'function'
                    ? props.rowDragging.isDropAllowed(
                        e.fromIndex,
                        e.toIndex,
                        item,
                        visibleRows.map((r: any) => r.data)
                      )
                    : defaultDropAllowed();
                if (!allowed) {
                  e.cancel = true;
                }
              }}
              onReorder={handleReorder}
            />
          )}
<Export enabled={memoExportOptions.enabled} allowExportSelectedData={false} />
<ColumnChooser
            enabled={memoColumnChooser.enabled}
            mode="select"
            title={memoColumnChooser.title}
            allowSearch={memoColumnChooser.allowSearch}
          />
<FilterRow
            visible={memoFilterRow.visible}
            resetOperationText={resetOperationText}
            showAllText={memoFilterRow.showAllText}
          />
<LoadPanel enabled={false} />
<HeaderFilter visible={headerFilter} dataSource={headerFilterData} />
<Pager
            displayMode={memoPager.displayMode}
            showPageSizeSelector={memoPager.showPageSizeSelector}
            visible={memoPager.visible}
            allowedPageSizes={memoPager.allowedPageSizes}
            showInfo={memoPager.showInfo}
            showNavigationButtons={memoPager.showNavigationButtons}
            infoText="Sayfa {0}/{1} ({2} öğeler)"
          />
<Paging
            {...(!onFilterChange
              ? {
                  onPageIndexChange: (value: number) => {
                    if (dataGridRef.current && handlePagingChanged) {
                      const data = {
                        size: dataGridRef.current.instance.pageSize(),
                        page: value,
                      };
                      handlePagingChanged(data);
                    }
                  },
                  onPageSizeChange: (value: number) => {
                    if (dataGridRef.current && handlePagingChanged) {
                      const data = {
                        size: value,
                        page: dataGridRef.current.instance.pageIndex(),
                      };
                      handlePagingChanged(data);
                    }
                  },
                  defaultPageSize: 10,
                  defaultPageIndex: 0,
                  pageIndex: paging?.pageIndex,
                  pageSize: paging?.pageSize,
                }
              : {
                  // defaultPageIndex: paging?.pageIndex || 0,
                  defaultPageSize: paging?.pageSize || 10,
                  pageIndex: pageIndex,
                  pageSize: pageSize,
                })}
            enabled={true}
          />
          {hasFixedColumn && <ColumnFixing enabled={true} />}
<SearchPanel
            highlightCaseSensitive={memoSearchPanel.highlightCaseSensitive}
            visible={memoSearchPanel.visible}
            highlightSearchText={memoSearchPanel.highlightSearchText}
            placeholder="Ara..."
          />
<Selection
            mode={memoSelection.mode}
            selectAllMode={memoSelection.selectAllMode}
            showCheckBoxesMode={memoSelection.showCheckBoxesMode}
          />
<Scrolling
            mode={memoScrolling.mode}
            columnRenderingMode={memoScrolling.columnRenderingMode}
            scrollByContent={memoScrolling.scrollByContent}
          />
          {isCrud && (
<Editing
              mode="row"
              allowAdding={true}
              allowUpdating={true}
              allowDeleting={true}
              useIcons={true}
            />
          )}
          {/*  {groupPanel && <GroupPanel visible={groupPanel.visible} emptyPanelText={groupPanel.emptyPanelText} />} */}
          {grouping && (
<Grouping
              allowCollapsing={grouping.allowCollapsing}
              autoExpandAll={grouping.autoExpandAll}
              expandMode={grouping.expandMode}
            />
          )}
          {singleRowRadioSelection && (
<Column
              key="checkbox"
              width={50}
              allowSorting={false}
              allowFiltering={false}
              cellRender={({ data }) => {
                const rowKey = rowKeyExpr ? data?.[rowKeyExpr] : data;
                const isSelected = isDeepEqual(selectedRadioRowKey, rowKey);
                return (
<div style={{ textAlign: 'center' }}>
<input type="checkbox" checked={isSelected} readOnly />
</div>
                );
              }}
            />
          )}
          {actionMenuRender && (
<Column
              key="actions"
              dataField="actions"
              caption=""
              width={60}
              allowSorting={false}
              allowFiltering={false}
              cellRender={({ data }) => actionMenuRender(data)}
            />
          )}
          {dataGridColumns.map((col: any, index: any) => (
<Column
              key={col?.dataField ?? col.caption ?? index}
              lookup={col.lookup ?? col.lookup ?? undefined}
              width={col?.width}
              name={col?.name}
              dataField={col?.dataField}
              caption={col?.caption || col.dataField}
              dataType={col?.dataType}
              alignment={col?.alignment}
              format={col?.format || ''}
              cellRender={col?.cellRender ?? undefined}
              calculateCellValue={col?.calculateCellValue}
              headerFilter={{ dataSource: col?.headerFilterData }}
              allowHeaderFiltering={col?.allowHeaderFiltering}
              allowFiltering={col?.allowFiltering}
              allowSorting={col?.allowSorting}
              fixed={col?.fixed}
              fixedPosition={col?.fixedPosition}
              filterOperations={col?.filterOperations || []}
              allowGrouping={col?.allowGrouping}
              groupIndex={typeof col?.groupIndex === 'number' ? col.groupIndex : undefined}
              visible={col?.visible ?? true}
              allowEditing={col?.allowEditing ?? true}
              allowHiding={col?.allowHiding ?? true}
              // calculateFilterExpression={function (this: any, filterValue: any, selectedFilterOperation: any) {
              //   console.log('!!!!calculateFilterExpression', filterValue, selectedFilterOperation);
              //   if (selectedFilterOperation === 'between' && Array.isArray(filterValue)) {
              //     if (!filterValue[0] || !filterValue[1]) {
              //       return null;
              //     }
              //   }
              //   return this.defaultCalculateFilterExpression?.apply(this, arguments);
              // }}
            />
          ))}
          {summary && (
<Summary>
              {summary.options.map((summary) => (
<TotalItem
                  column={summary?.column}
                  summaryType="sum"
                  displayFormat={summary?.text ? `${summary?.text}: {0}` : '{0}'}
                />
              ))}
</Summary>
          )}
</DataGrid>
</VKErrorBoundry>
    );
  }
);
export { VKDataGrid };
