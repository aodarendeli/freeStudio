import { createContext, useContext, type ReactNode } from 'react';
import { darken, lighten, type Theme } from '@mui/material/styles';
import { grey } from '@mui/material/colors';
import type { SxProps } from '@mui/material';
import type { GridColumn } from './columns';
import type { GridState } from './hooks/useGridState';
import type { GridSelection } from './hooks/useGridSelection';
import type { GridEditing } from './hooks/useGridEditing';
import type { GridRowDragging } from './hooks/useGridRowDragging';
import type { GridTable } from './table';
import type { GroupingTypes, SelectionTypes, VKGridSorting } from './VKDataGrid.types';

export const SYSTEM_COLUMN = {
  drag: '__drag',
  select: '__select',
  radio: '__radio',
  actions: '__actions',
  command: '__command',
} as const;

export type DisplayColumnKind = 'drag' | 'select' | 'radio' | 'actions' | 'command' | 'data';

export type DisplayColumn = {
  id: string;
  kind: DisplayColumnKind;
  column?: GridColumn;
  /** colgroup genişliği */
  width?: number | string;
  pinned: false | 'left' | 'right';
  /** Sabit sütunlar için sticky ofset (px) */
  offset?: number;
  isLastLeftPinned?: boolean;
  isFirstRightPinned?: boolean;
};

export type GridContextValue = {
  table: GridTable;
  displayColumns: DisplayColumn[];
  gridState: GridState;
  selection: GridSelection;
  selectionConfig: SelectionTypes;
  editing: GridEditing;
  dragging: GridRowDragging;
  isRowDraggingEnabled: boolean;
  showDragIcons: boolean;
  showRowLines: boolean;
  showColumnLines: boolean;
  rowAlternationEnabled: boolean;
  isHeaderBold: boolean;
  noDataText: string;
  filterRowVisible: boolean;
  showAllText?: string;
  resetOperationText: string;
  headerFilter: boolean;
  headerFilterData: any;
  sortingConfig: VKGridSorting;
  allowColumnResizing: boolean;
  allowColumnReordering: boolean;
  grouping?: GroupingTypes;
  highlight: { enabled: boolean; caseSensitive: boolean };
  pageData: any[];
  singleRowRadioSelection: boolean;
  selectedRadioRowKey: unknown;
  /** Mevcut kod: `rowKeyExpr ? data[rowKeyExpr] : data` */
  getRadioKey: (row: any) => unknown;
  /** Gizli / gruplanmış olanlar dahil tüm veri sütunları */
  allColumns: GridColumn[];
  actionMenuRender?: (rowData: any) => ReactNode;
  onRowClick: (row: any, event: React.MouseEvent) => void;
  registerHeaderCell: (id: string, element: HTMLElement | null) => void;
  startColumnResize: (id: string, event: React.PointerEvent) => void;
  /** `height` verildiyse başlık + filtre satırı kaydırmada üstte kalır */
  stickyHeader: boolean;
};

export const GridContext = createContext<GridContextValue | null>(null);

export const useGridContext = () => {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error('VKDataGrid parçaları GridContext dışında kullanılamaz');
  return ctx;
};

export const getZebraColor = (theme: Theme) => (theme.palette.mode === 'light' ? grey[50] : grey[900]);

export const getSelectedRowColor = (theme: Theme) =>
  theme.palette.mode === 'light'
    ? lighten(theme.palette.primary.main, 0.88)
    : darken(theme.palette.primary.main, 0.7);

/** Hücre kenarlıkları + sabit sütun (sticky) stilleri */
type SxFunction = Extract<SxProps<Theme>, (theme: Theme) => unknown>;

export const getCellSx = (
  displayColumn: DisplayColumn,
  options: { showRowLines: boolean; showColumnLines: boolean; isHeader?: boolean }
): SxFunction => (theme: Theme) => ({
  borderBottom: options.showRowLines || options.isHeader ? `1px solid ${theme.palette.divider}` : 'none',
  borderRight: options.showColumnLines ? `1px solid ${theme.palette.divider}` : 'none',
  '&:last-of-type': { borderRight: 'none' },
  ...(options.isHeader && { backgroundColor: theme.palette.background.paper }),
  ...(displayColumn.pinned && {
    position: 'sticky',
    [displayColumn.pinned]: displayColumn.offset ?? 0,
    zIndex: options.isHeader ? 4 : 1,
    backgroundColor: options.isHeader ? theme.palette.background.paper : 'inherit',
  }),
  ...(displayColumn.isLastLeftPinned && { boxShadow: `4px 0 4px -2px ${theme.palette.divider}` }),
  ...(displayColumn.isFirstRightPinned && { boxShadow: `-4px 0 4px -2px ${theme.palette.divider}` }),
});
