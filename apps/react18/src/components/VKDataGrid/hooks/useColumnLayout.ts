/**
 * Sütunların ekrandaki yerleşimi: sıra (sol sabit / orta / sağ sabit), sabit sütun ofsetleri,
 * ölçülen genişlikler ve fareyle genişletme.
 * DevExtreme karşılığı: `<ColumnFixing>` + `allowColumnResizing` (`columnResizingMode="widget"`).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ColumnSizingState } from '@tanstack/react-table';
import type { GridColumn } from '../columns';
import { SYSTEM_COLUMN, type DisplayColumn, type DisplayColumnKind } from '../context';
import type { GridTable } from '../table';
import { isDeepEqual, toPixelWidth } from '../utils';

export const SYSTEM_COLUMN_WIDTHS: Record<string, number> = {
  [SYSTEM_COLUMN.drag]: 36,
  [SYSTEM_COLUMN.select]: 48,
  [SYSTEM_COLUMN.radio]: 50,
  // Eskisinden farklı: 60px idi; düzenle + sil iki ikon sığsın diye 88px
  [SYSTEM_COLUMN.actions]: 88,
};

export const SYSTEM_KINDS: Record<string, DisplayColumnKind> = {
  [SYSTEM_COLUMN.drag]: 'drag',
  [SYSTEM_COLUMN.select]: 'select',
  [SYSTEM_COLUMN.radio]: 'radio',
  [SYSTEM_COLUMN.actions]: 'actions',
};

const MIN_COLUMN_WIDTH = 40;
const FALLBACK_COLUMN_WIDTH = 120;

/**
 * Eski `ColumnFixing` davranışı: sadece `fixed` verilen sütunlar sabitlenir.
 * Seçim / radio / sürükleme sütunları ancak en az bir `fixed` sütun varsa sola sabitlenir;
 * aksiyon sütunu her zaman normal sütundur.
 */
export const buildColumnPinning = (columnIds: string[], columns: GridColumn[]) => {
  const hasFixedColumn = columns.some((col) => col.fixed);
  const systemStart = hasFixedColumn
    ? columnIds.filter((id) => SYSTEM_KINDS[id] && id !== SYSTEM_COLUMN.actions)
    : [];
  return {
    start: [...systemStart, ...columns.filter((c) => c.fixed && c.fixedPosition === 'left').map((c) => c.id)],
    end: columns.filter((c) => c.fixed && c.fixedPosition === 'right').map((c) => c.id),
  };
};

type UseColumnLayoutArgs = {
  table: GridTable;
  columnsById: Map<string, GridColumn>;
  columnSizing: ColumnSizingState;
  setColumnSizing: Dispatch<SetStateAction<ColumnSizingState>>;
};

export const useColumnLayout = ({ table, columnsById, columnSizing, setColumnSizing }: UseColumnLayoutArgs) => {
  const [isWidthFrozen, setIsWidthFrozen] = useState(false);
  const headerCellsRef = useRef<Record<string, HTMLElement | null>>({});
  const [measuredWidths, setMeasuredWidths] = useState<Record<string, number>>({});

  const registerHeaderCell = useCallback((id: string, element: HTMLElement | null) => {
    headerCellsRef.current[id] = element;
  }, []);

  /** Sabit sütun ofsetleri için başlık hücrelerinin gerçek genişlikleri */
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
  const orderSignature = orderedColumns.map((c) => `${c.id}:${c.pinned}`).join('|');

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
  }, [orderSignature, columnsById, columnSizing, measuredWidths]);

  const tableWidthStyle = useMemo(() => {
    const widths = displayColumns.map((c) => toPixelWidth(c.width));
    const known = widths.reduce<number>((sum, w) => sum + (w ?? 0), 0);
    const unknownCount = widths.filter((w) => w === undefined).length;
    if (isWidthFrozen && unknownCount === 0) return { width: known, minWidth: known };
    return { width: '100%', minWidth: known + unknownCount * FALLBACK_COLUMN_WIDTH * 0.5 };
  }, [displayColumns, isWidthFrozen]);

  /**
   * DevExtreme `columnResizingMode="widget"`: diğer sütunlar sabit kalır, tablo genişliği değişir.
   * Genişlik değişimi `onFilterChange` tetiklemez.
   */
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
    [displayColumns, columnSizing, measuredWidths, setColumnSizing]
  );

  return { displayColumns, tableWidthStyle, registerHeaderCell, startColumnResize };
};
