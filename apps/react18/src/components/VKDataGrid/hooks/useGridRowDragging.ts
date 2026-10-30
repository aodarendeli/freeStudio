import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { VKDataGridProps } from '../VKDataGrid.types';
import { isDeepEqual } from '../utils';

type UseGridRowDraggingArgs = {
  rowDragging: VKDataGridProps['rowDragging'];
  rowKeyExpr?: string;
  /** Görünen satırlar (sıra ile), `id` = TanStack satır id'si */
  visibleRows: { id: string; data: any }[];
  setInternalData: Dispatch<SetStateAction<any[]>>;
};

export const useGridRowDragging = ({
  rowDragging,
  rowKeyExpr,
  visibleRows,
  setInternalData,
}: UseGridRowDraggingArgs) => {
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [isDropAllowed, setIsDropAllowed] = useState(true);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isRowDraggable = useCallback(
    (item: any) =>
      typeof rowDragging?.isRowDraggable === 'function'
        ? rowDragging.isRowDraggable(item)
        : item?.isNonDraggable !== true,
    [rowDragging]
  );

  const checkDropAllowed = useCallback(
    (fromIndex: number, toIndex: number, item: any) => {
      const toData = visibleRows[toIndex]?.data;
      if (typeof rowDragging?.isDropAllowed === 'function') {
        return rowDragging.isDropAllowed(
          fromIndex,
          toIndex,
          item,
          visibleRows.map((r) => r.data)
        );
      }
      if (!toData) return false;
      return item?.isNonDraggable !== true && toData?.isNonDraggable !== true;
    },
    [rowDragging, visibleRows]
  );

  const getIndexes = (activeId: unknown, overId: unknown) => ({
    fromIndex: visibleRows.findIndex((r) => r.id === activeId),
    toIndex: visibleRows.findIndex((r) => r.id === overId),
  });

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveRowId(String(event.active.id));
    setIsDropAllowed(true);
  }, []);

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!event.over) return;
      const { fromIndex, toIndex } = getIndexes(event.active.id, event.over.id);
      if (fromIndex < 0 || toIndex < 0) return;
      setIsDropAllowed(checkDropAllowed(fromIndex, toIndex, visibleRows[fromIndex].data));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkDropAllowed, visibleRows]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveRowId(null);
      setIsDropAllowed(true);
      if (!event.over || event.active.id === event.over.id) return;
      const { fromIndex, toIndex } = getIndexes(event.active.id, event.over.id);
      if (fromIndex < 0 || toIndex < 0) return;
      const item = visibleRows[fromIndex].data;
      if (!checkDropAllowed(fromIndex, toIndex, item)) return;

      const toRow = visibleRows[toIndex].data;
      setInternalData((prev) => {
        const newData = [...prev];
        const getKey = (row: any) => (rowKeyExpr ? row?.[rowKeyExpr] : row);
        const to = newData.findIndex((itm) =>
          rowKeyExpr ? isDeepEqual(getKey(itm), getKey(toRow)) : itm === toRow
        );
        const from = newData.findIndex((itm) =>
          rowKeyExpr ? isDeepEqual(getKey(itm), getKey(item)) : itm === item
        );
        if (from === -1 || to === -1) return prev;
        const [movedItem] = newData.splice(from, 1);
        newData.splice(to, 0, movedItem);
        return newData;
      });
      rowDragging?.onReorder?.(fromIndex, toIndex);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkDropAllowed, visibleRows, rowKeyExpr, rowDragging, setInternalData]
  );

  const onDragCancel = useCallback(() => {
    setActiveRowId(null);
    setIsDropAllowed(true);
  }, []);

  return {
    sensors,
    activeRowId,
    isDropAllowed,
    isRowDraggable,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  };
};

export type GridRowDragging = ReturnType<typeof useGridRowDragging>;
