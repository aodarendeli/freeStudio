import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  InternalSelectedDataType,
  RowSelectionChangeCallback,
  RowsKeysType,
} from '../VKDataGrid.types';
import { isDeepEqual } from '../utils';

type UseGridSelectionArgs = {
  rowKeyExpr?: string;
  selectedRowKeys: any[];
  multipleSelection: boolean;
  /** Şu an grid'de görünen satırlar (yerel filtre / arama sonrası) */
  pageData: any[];
  /** Grid'e verilen sayfa verisi (tekli seçim temizliği bunun üzerinden yapılır) */
  sourceData: any[];
  rowSelectionChange?: RowSelectionChangeCallback;
};

const toInitialSelection = (selectedRowKeys: any[], rowKeyExpr?: string): InternalSelectedDataType[] =>
  Array.isArray(selectedRowKeys)
    ? selectedRowKeys
        .map((item): InternalSelectedDataType | null => {
          if (item && typeof item === 'object') return item as InternalSelectedDataType;
          if ((typeof item === 'string' || typeof item === 'number') && rowKeyExpr) {
            return { [rowKeyExpr]: item };
          }
          return null;
        })
        .filter((x): x is InternalSelectedDataType => x !== null)
    : [];

/**
 * Sunucu tarafı sayfalamada sayfa değişince seçimin kaybolmaması için
 * seçili satır nesnelerini (`internalSelectedData`) tutar.
 */
export const useGridSelection = ({
  rowKeyExpr,
  selectedRowKeys,
  multipleSelection,
  pageData,
  sourceData,
  rowSelectionChange,
}: UseGridSelectionArgs) => {
  const [internalSelectedData, setInternalSelectedData] = useState<InternalSelectedDataType[]>(() =>
    toInitialSelection(selectedRowKeys, rowKeyExpr)
  );
  const selectedRef = useRef(internalSelectedData);
  selectedRef.current = internalSelectedData;

  /** `rowKeyExpr` veride yoksa DevExtreme satırın kendisini anahtar olarak kullanıyordu */
  const isKeyExistsInData = useMemo(
    () => (pageData && pageData[0] ? Object.keys(pageData[0]).some((s) => s === rowKeyExpr) : false),
    [pageData, rowKeyExpr]
  );

  /** Grid'in satır anahtarı (DevExtreme `keyExpr`) */
  const getGridKey = useCallback(
    (row: any): RowsKeysType => (isKeyExistsInData && rowKeyExpr ? row?.[rowKeyExpr] : row),
    [isKeyExistsInData, rowKeyExpr]
  );

  const getStoredKey = useCallback(
    (row: InternalSelectedDataType): RowsKeysType => (rowKeyExpr ? (row?.[rowKeyExpr] as RowsKeysType) : row),
    [rowKeyExpr]
  );

  // Tekli seçimde, veride artık bulunmayan seçimler temizlenir
  useEffect(() => {
    if (!rowKeyExpr || multipleSelection) return;
    const availableKeys = new Set(sourceData.map((row) => row?.[rowKeyExpr]));
    setInternalSelectedData((prev) => {
      const next = prev.filter((selectedRow) => availableKeys.has(selectedRow?.[rowKeyExpr]));
      return next.length === prev.length ? prev : next;
    });
  }, [sourceData, rowKeyExpr, multipleSelection]);

  /** Sayfada görünen ve `internalSelectedData` içinde olan satırların anahtarları */
  const selectedPageKeys = useMemo(() => {
    const keys = internalSelectedData.map(getStoredKey);
    return pageData
      .map(getGridKey)
      .filter((pageKey) => keys.some((selectedKey) => isDeepEqual(selectedKey, pageKey)));
  }, [internalSelectedData, pageData, getGridKey, getStoredKey]);

  const isRowSelected = useCallback(
    (row: any) => {
      const key = getGridKey(row);
      return selectedPageKeys.some((selectedKey) => isDeepEqual(selectedKey, key));
    },
    [selectedPageKeys, getGridKey]
  );

  /**
   * Sayfadaki seçim değişti. `selectedPageRows`: bu sayfada artık seçili olan satırlar.
   * Mevcut `handleSelectionChange` algoritması.
   */
  const applyPageSelection = useCallback(
    (selectedPageRows: any[]) => {
      const selectedKeys = selectedPageRows.map(getGridKey);
      const discardKeys = pageData
        .map(getGridKey)
        .filter((key) => !selectedKeys.some((selectedKey) => isDeepEqual(selectedKey, key)));

      let selectedObjectDatas: InternalSelectedDataType[] = selectedRef.current.filter(
        (s): s is InternalSelectedDataType => typeof s === 'object' && s !== null
      );
      if (discardKeys.length > 0) {
        selectedObjectDatas = selectedObjectDatas.filter((row) => {
          const rowKey = getStoredKey(row);
          return !discardKeys.some((discardKey) => isDeepEqual(rowKey, discardKey));
        });
      }
      selectedPageRows.forEach((row: any) => {
        if (!rowKeyExpr) {
          if (!selectedObjectDatas.some((r) => isDeepEqual(r, row))) selectedObjectDatas.push(row);
          return;
        }
        const key = row?.[rowKeyExpr] as RowsKeysType;
        if (key === undefined || key === null) return;
        const existingIndex = selectedObjectDatas.findIndex((r) =>
          isDeepEqual(r?.[rowKeyExpr] as RowsKeysType, key)
        );
        if (existingIndex > -1) {
          selectedObjectDatas[existingIndex] = { ...selectedObjectDatas[existingIndex], ...row };
        } else {
          selectedObjectDatas.push(row);
        }
      });

      selectedRef.current = selectedObjectDatas;
      setInternalSelectedData(selectedObjectDatas);
      rowSelectionChange?.({
        selectedRowKeys: rowKeyExpr
          ? selectedObjectDatas.map((item) => item?.[rowKeyExpr] as RowsKeysType)
          : selectedObjectDatas,
        selectedRowsData: selectedObjectDatas,
      });
    },
    [pageData, getGridKey, getStoredKey, rowKeyExpr, rowSelectionChange]
  );

  return {
    internalSelectedData,
    selectedPageKeys,
    isRowSelected,
    applyPageSelection,
    getGridKey,
    isKeyExistsInData,
  };
};

export type GridSelection = ReturnType<typeof useGridSelection>;
