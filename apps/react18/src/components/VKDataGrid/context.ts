import { createContext, useContext, type ReactNode } from 'react';
import { darken, lighten, type Theme } from '@mui/material/styles';
import { grey } from '@mui/material/colors';
import type { SxProps } from '@mui/material';
import type { GridColumn } from './columns';
import type { GridState } from './hooks/useGridState';
import type { GridSelection } from './hooks/useGridSelection';
import type { GridRowDragging } from './hooks/useGridRowDragging';
import type { GridTable } from './table';
import type { GroupingTypes, SelectionTypes, VKGridSorting } from './VKDataGrid.types';

export const SYSTEM_COLUMN = {
  drag: '__drag',
  select: '__select',
  radio: '__radio',
  actions: '__actions',
} as const;

export type DisplayColumnKind = 'drag' | 'select' | 'radio' | 'actions' | 'data';

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

export const getZebraColor = (theme: Theme) => (theme.palette.mode === 'light' ? '#fafbfc' : grey[900]);

export const getHeaderColor = (theme: Theme) => (theme.palette.mode === 'light' ? grey[50] : grey[900]);

export const getHoverRowColor = (theme: Theme) => (theme.palette.mode === 'light' ? grey[100] : grey[800]);

export const getSelectedRowColor = (theme: Theme) =>
  theme.palette.mode === 'light'
    ? lighten(theme.palette.primary.main, 0.92)
    : darken(theme.palette.primary.main, 0.7);

/** Satır çizgileri divider, sütun çizgileri daha silik */
export const getColumnLineColor = (theme: Theme) =>
  theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';

/** Hücre kenarlıkları + sabit sütun (sticky) stilleri */
type SxFunction = Extract<SxProps<Theme>, (theme: Theme) => unknown>;

export const getCellSx = (
  displayColumn: DisplayColumn,
  options: { showRowLines: boolean; showColumnLines: boolean; isHeader?: boolean }
): SxFunction => (theme: Theme) => ({
  borderBottom: options.showRowLines || options.isHeader ? `1px solid ${theme.palette.divider}` : 'none',
  borderRight: options.showColumnLines ? `1px solid ${getColumnLineColor(theme)}` : 'none',
  '&:last-of-type': { borderRight: 'none' },
  ...(options.isHeader && { backgroundColor: getHeaderColor(theme) }),
  ...(displayColumn.pinned && {
    position: 'sticky',
    [displayColumn.pinned]: displayColumn.offset ?? 0,
    zIndex: options.isHeader ? 4 : 1,
    backgroundColor: options.isHeader ? getHeaderColor(theme) : 'inherit',
  }),
  ...(displayColumn.isLastLeftPinned && {
    borderRight: `1px solid ${theme.palette.divider}`,
    boxShadow: '6px 0 6px -6px rgba(0, 0, 0, 0.12)',
  }),
  ...(displayColumn.isFirstRightPinned && {
    borderLeft: `1px solid ${theme.palette.divider}`,
    boxShadow: '-6px 0 6px -6px rgba(0, 0, 0, 0.12)',
  }),
});
