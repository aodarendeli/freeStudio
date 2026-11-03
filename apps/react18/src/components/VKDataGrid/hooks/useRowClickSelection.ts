/**
 * Satıra tıklayarak seçim ve `singleRowRadioSelection`.
 * DevExtreme karşılığı: `onRowClick` (radio seçimi) + `<Selection mode>` satır tıklama davranışı.
 */
import { useCallback, useState } from 'react';
import type { RowSelectionChangeCallback, SelectionTypes } from '../VKDataGrid.types';
import { isDeepEqual } from '../utils';

type UseRowClickSelectionArgs = {
  rowKeyExpr?: string;
  singleRowRadioSelection: boolean;
  selectionConfig: SelectionTypes;
  pageData: any[];
  isRowSelected: (row: any) => boolean;
  applyPageSelection: (selectedPageRows: any[]) => void;
  rowSelectionChange?: RowSelectionChangeCallback;
};

export const useRowClickSelection = ({
  rowKeyExpr,
  singleRowRadioSelection,
  selectionConfig,
  pageData,
  isRowSelected,
  applyPageSelection,
  rowSelectionChange,
}: UseRowClickSelectionArgs) => {
  const [selectedRadioRowKey, setSelectedRadioRowKey] = useState<unknown>(null);
  const getRadioKey = useCallback((row: any) => (rowKeyExpr ? row?.[rowKeyExpr] : row), [rowKeyExpr]);

  const handleRowClick = useCallback(
    (row: any, event: React.MouseEvent) => {
      // Eski onRowClick: radio seçimi ayrı bildirilir
      if (singleRowRadioSelection) {
        const key = getRadioKey(row);
        if (!isDeepEqual(key, selectedRadioRowKey)) {
          setSelectedRadioRowKey(key);
          rowSelectionChange?.({ selectedRowsData: [row], selectedRowKeys: [key] });
        }
      }
      const isCtrl = event.ctrlKey || event.metaKey;
      const selected = isRowSelected(row);
      const pageSelected = pageData.filter((r) => isRowSelected(r));
      // Tekli: tıklanan satır seçilir; seçiliyse Ctrl+tıklama kaldırır
      if (selectionConfig.mode === 'single') {
        if (isCtrl && selected) applyPageSelection([]);
        else if (!selected) applyPageSelection([row]);
        return;
      }
      // Çoklu + checkbox (ya da Ctrl): seçime ekler / çıkarır
      if (selectionConfig.showCheckBoxesMode === 'always' || isCtrl) {
        applyPageSelection(selected ? pageSelected.filter((r) => r !== row) : [...pageSelected, row]);
        return;
      }
      // Çoklu, checkbox yok: sadece tıklanan satır seçili kalır
      if (!(selected && pageSelected.length === 1)) applyPageSelection([row]);
    },
    [
      singleRowRadioSelection,
      getRadioKey,
      selectedRadioRowKey,
      rowSelectionChange,
      isRowSelected,
      pageData,
      selectionConfig,
      applyPageSelection,
    ]
  );

  return { selectedRadioRowKey, getRadioKey, handleRowClick };
};
