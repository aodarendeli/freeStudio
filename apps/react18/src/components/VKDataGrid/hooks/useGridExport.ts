/**
 * Dışa aktarma butonları ve uyarı bildirimi.
 * DevExtreme karşılığı: `<Export>` + `onExporting` (e.cancel), özel "Seçili Satırları Dışa Aktar" /
 * "Tüm Veriyi Dışa Aktar" butonları ve `notify` uyarısı (MUI Snackbar ile).
 */
import { useCallback, useState, type RefObject } from 'react';
import type { ExportingEvent, FiltersChangesTypes, VKDataGridProps } from '../VKDataGrid.types';
import type { GridColumn } from '../columns';
import { exportToExcel } from '../export/exportExcel';

export type GridNotification = { message: string; severity: 'warning' | 'error' };

type UseGridExportArgs = {
  rootRef: RefObject<HTMLDivElement | null>;
  exportColumns: GridColumn[];
  selectedRows: any[];
  getRowKey: (row: any) => unknown;
  getFilters: () => FiltersChangesTypes;
  totalCount: number;
  isSelected: boolean;
  onExporting?: VKDataGridProps['onExporting'];
  exportDataAllMethod?: VKDataGridProps['exportDataAllMethod'];
};

export const useGridExport = ({
  rootRef,
  exportColumns,
  selectedRows,
  getRowKey,
  getFilters,
  totalCount,
  isSelected,
  onExporting,
  exportDataAllMethod,
}: UseGridExportArgs) => {
  const [notification, setNotification] = useState<GridNotification | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const notifyError = useCallback((message: string) => setNotification({ message, severity: 'error' }), []);

  /** Önce `onExporting` çağrılır; `e.cancel = true` ise varsayılan Excel aktarımı yapılmaz */
  const runExport = useCallback(
    (rows: any[], selectedRowsOnly: boolean) => {
      const { pageIndex, pageSize } = getFilters();
      const event: ExportingEvent = {
        component: {
          getSelectedRowsData: () => selectedRows,
          getSelectedRowKeys: () => selectedRows.map(getRowKey),
          getVisibleColumns: () => exportColumns.map((c) => c.raw),
          getVisibleRows: () => rows.map((data) => ({ data, rowType: 'data' })),
          pageIndex: () => pageIndex,
          pageSize: () => pageSize,
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
    [getFilters, selectedRows, getRowKey, exportColumns, totalCount, rootRef, onExporting, notifyError]
  );

  /** Sayfalar arası seçili tüm satırlar; `isSelected` iken seçim yoksa uyarı */
  const exportSelected = useCallback(() => {
    if (!selectedRows.length && isSelected) {
      setNotification({ message: 'Lütfen önce en az 1 satır seçin.', severity: 'warning' });
      return;
    }
    runExport(selectedRows, true);
  }, [selectedRows, isSelected, runExport]);

  /**
   * Grid veri çekmez: projenin `exportDataAllMethod`'u güncel filtrelerle çağrılır.
   * Promise dönerse bitene kadar buton kilitli kalır, hata olursa uyarı gösterilir.
   */
  const exportAll = useCallback(async () => {
    if (!exportDataAllMethod) return;
    const result = exportDataAllMethod(getFilters());
    if (!result || typeof (result as Promise<unknown>).then !== 'function') return;
    setIsExportingAll(true);
    try {
      await result;
    } catch (error) {
      notifyError(error instanceof Error && error.message ? error.message : 'Dışa aktarma başarısız oldu.');
    } finally {
      setIsExportingAll(false);
    }
  }, [exportDataAllMethod, getFilters, notifyError]);

  return {
    runExport,
    exportSelected,
    exportAll,
    isExportingAll,
    notification,
    closeNotification: () => setNotification(null),
  };
};
