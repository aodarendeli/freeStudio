/**
 * TanStack Table v9 feature seti ve sütun tanımları (sistem sütunları: sürükleme, seçim, radio, aksiyon).
 */
import {
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createGroupedRowModel,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type ReactTable,
} from '@tanstack/react-table';
import { getCellValue, type GridColumn } from './columns';
import { SYSTEM_COLUMN } from './context';

/**
 * Grid'in kullandığı TanStack feature'ları. Stabil referans için component dışında.
 * Sayfalama / filtre / sıralama sunucuda (ya da `useGridState` içinde) yapıldığından
 * filtered / sorted / paginated row model kayıtlı değil.
 */
export const gridFeatures = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  rowSortingFeature,
  rowSelectionFeature,
  columnGroupingFeature,
  groupedRowModel: createGroupedRowModel(),
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
});

export type GridFeatures = typeof gridFeatures;
export type GridTable = ReactTable<GridFeatures, any, any>;
export type GridColumnDef = ColumnDef<GridFeatures, any>;

const systemColumn = (id: string): GridColumnDef => ({
  id,
  header: '',
  enableSorting: false,
  enableHiding: false,
  enableGrouping: false,
});

type BuildColumnDefsArgs = {
  columns: GridColumn[];
  showDragColumn: boolean;
  showSelectColumn: boolean;
  showRadioColumn: boolean;
  showActionsColumn: boolean;
};

/** Sütun sırası: sürükle, seçim, radio, veri sütunları, aksiyon menüsü */
export const buildColumnDefs = ({
  columns,
  showDragColumn,
  showSelectColumn,
  showRadioColumn,
  showActionsColumn,
}: BuildColumnDefsArgs): GridColumnDef[] => [
  ...(showDragColumn ? [systemColumn(SYSTEM_COLUMN.drag)] : []),
  ...(showSelectColumn ? [systemColumn(SYSTEM_COLUMN.select)] : []),
  ...(showRadioColumn ? [systemColumn(SYSTEM_COLUMN.radio)] : []),
  ...columns.map(
    (column): GridColumnDef => ({
      id: column.id,
      header: column.caption,
      accessorFn: (row: any) => getCellValue(column, row),
      enableSorting: column.allowSorting,
      enableHiding: column.allowHiding,
      enableGrouping: column.allowGrouping,
    })
  ),
  ...(showActionsColumn ? [systemColumn(SYSTEM_COLUMN.actions)] : []),
];
