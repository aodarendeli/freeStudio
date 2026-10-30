import { useCallback, useRef, useState } from 'react';
import type { VKDataGridProps } from '../VKDataGrid.types';
import { isDeepEqual } from '../utils';

export const NEW_ROW_ID = '__new__';

type UseGridEditingArgs = {
  onCreate?: VKDataGridProps['onCreate'];
  onUpdate?: VKDataGridProps['onUpdate'];
  onDelete?: VKDataGridProps['onDelete'];
  /** DevExtreme store anahtarı: `rowKeyExpr` veride varsa alan değeri, yoksa satırın kendisi */
  getRowKey: (row: any) => any;
  onError: (message: string) => void;
};

type EditingState = {
  rowId: string;
  original: any;
  values: Record<string, any>;
} | null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'İşlem başarısız oldu.';

/** `isCrud` satır içi düzenleme (DevExtreme `Editing mode="row"`) */
export const useGridEditing = ({ onCreate, onUpdate, onDelete, getRowKey, onError }: UseGridEditingArgs) => {
  const [editingRow, setEditingRow] = useState<EditingState>(null);
  const [isPending, setIsPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const editingRef = useRef(editingRow);
  editingRef.current = editingRow;

  const startEdit = useCallback((rowId: string, row: any) => {
    setEditingRow({ rowId, original: row, values: { ...row } });
  }, []);

  const startAdd = useCallback(() => {
    setEditingRow({ rowId: NEW_ROW_ID, original: {}, values: {} });
  }, []);

  const cancel = useCallback(() => setEditingRow(null), []);

  const setValue = useCallback((dataField: string, value: any) => {
    setEditingRow((prev) => (prev ? { ...prev, values: { ...prev.values, [dataField]: value } } : prev));
  }, []);

  const save = useCallback(async () => {
    const current = editingRef.current;
    if (!current) return;
    setIsPending(true);
    try {
      if (current.rowId === NEW_ROW_ID) {
        await onCreate?.(current.values);
      } else {
        // DevExtreme `update` sadece değişen alanları gönderir
        const changed = Object.fromEntries(
          Object.entries(current.values).filter(([field, value]) => !isDeepEqual(current.original?.[field], value))
        );
        if (Object.keys(changed).length > 0) {
          await onUpdate?.(getRowKey(current.original), changed);
        }
      }
      setEditingRow(null);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }, [onCreate, onUpdate, getRowKey, onError]);

  const requestDelete = useCallback((row: any) => setDeleteTarget(row), []);
  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

  const confirmDelete = useCallback(async () => {
    const target = deleteTarget;
    if (!target) return;
    setIsPending(true);
    try {
      await onDelete?.(getRowKey(target));
      setDeleteTarget(null);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }, [deleteTarget, onDelete, getRowKey, onError]);

  return {
    editingRow,
    isPending,
    deleteTarget,
    startEdit,
    startAdd,
    cancel,
    setValue,
    save,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
};

export type GridEditing = ReturnType<typeof useGridEditing>;
