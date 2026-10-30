import { useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { getDndAccessibility, restrictToHorizontalAxis } from '../dndModifiers';
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCellSx, SYSTEM_COLUMN, useGridContext, type DisplayColumn } from '../context';
import { getHeaderFilterItems } from '../columns';
import type { SortRule } from '../filtering';
import { GridFilterRow } from './GridFilterRow';
import { HeaderFilterMenu } from './HeaderFilterMenu';

const SORT_TEXTS = {
  ascendingText: 'Artan Sırala',
  descendingText: 'Azalan Sırala',
  clearText: 'Sıralamayı Temizle',
};

type SortableHeaderCellProps = {
  displayColumn: DisplayColumn;
  enabled: boolean;
  children: (args: { style?: CSSProperties; dragProps?: Record<string, any>; setRef: (el: HTMLElement | null) => void }) => ReactNode;
};

const SortableHeaderCell = ({ displayColumn, enabled, children }: SortableHeaderCellProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: displayColumn.id,
    disabled: !enabled,
  });
  return (
    <>
      {children({
        setRef: setNodeRef,
        style: enabled
          ? {
              transform: CSS.Translate.toString(transform),
              transition,
              opacity: isDragging ? 0.7 : 1,
              zIndex: isDragging ? 5 : undefined,
              cursor: 'grab',
            }
          : undefined,
        dragProps: enabled ? { ...attributes, ...listeners } : undefined,
      })}
    </>
  );
};

const HeaderCell = ({
  displayColumn,
  isDraggingRef,
}: {
  displayColumn: DisplayColumn;
  isDraggingRef: RefObject<boolean>;
}) => {
  const ctx = useGridContext();
  const {
    table,
    gridState,
    selection,
    selectionConfig,
    sortingConfig,
    showColumnLines,
    isHeaderBold,
    headerFilter,
    headerFilterData,
    pageData,
    allowColumnResizing,
    allowColumnReordering,
    registerHeaderCell,
    startColumnResize,
  } = ctx;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const column = displayColumn.column;
  const sortMode = sortingConfig.mode ?? 'single';
  const canSort = !!column && column.allowSorting && sortMode !== 'none';
  const sortRule = gridState.sorting.find((rule) => rule.id === displayColumn.id);
  const sortIndex = gridState.sorting.findIndex((rule) => rule.id === displayColumn.id);
  const filterState = gridState.filters[displayColumn.id];
  const canHeaderFilter = !!column && headerFilter && column.allowHeaderFiltering;
  const canReorder = allowColumnReordering && !!column && !displayColumn.pinned;

  const applySorting = (next: SortRule[]) => gridState.changeSorting(next, displayColumn.id);

  const handleSortClick = (event: React.MouseEvent) => {
    if (!canSort || isDraggingRef.current) return;
    const { sorting } = gridState;
    if (event.ctrlKey || event.metaKey) {
      if (sortRule) applySorting(sorting.filter((rule) => rule.id !== displayColumn.id));
      return;
    }
    if (sortMode === 'multiple' && event.shiftKey) {
      applySorting(
        sortRule
          ? sorting.map((rule) => (rule.id === displayColumn.id ? { ...rule, desc: !rule.desc } : rule))
          : [...sorting, { id: displayColumn.id, desc: false }]
      );
      return;
    }
    applySorting([{ id: displayColumn.id, desc: sortRule ? !sortRule.desc : false }]);
  };

  const setSortFromMenu = (desc: boolean | null) => {
    setContextMenu(null);
    const others = sortMode === 'multiple' ? gridState.sorting.filter((r) => r.id !== displayColumn.id) : [];
    applySorting(desc === null ? others : [...others, { id: displayColumn.id, desc }]);
  };

  const pageRows = table.getCoreRowModel().rows;
  const selectableRows = pageRows.filter((row) => !row.getIsGrouped());
  const selectedCount = selectableRows.filter((row) => selection.isRowSelected(row.original)).length;

  let content: ReactNode = null;
  if (displayColumn.id === SYSTEM_COLUMN.select && selectionConfig.selectAllMode !== ('none' as string)) {
    content = (
      <Checkbox
        size="small"
        checked={selectableRows.length > 0 && selectedCount === selectableRows.length}
        indeterminate={selectedCount > 0 && selectedCount < selectableRows.length}
        onChange={(event) => table.toggleAllPageRowsSelected(event.target.checked)}
        inputProps={{ 'aria-label': 'Sayfadaki tüm satırları seç' }}
        sx={{ p: 0.5 }}
      />
    );
  } else if (column) {
    content = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        <Box
          component="span"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: isHeaderBold ? 700 : 500,
            flex: column.alignment === 'right' ? '1 1 auto' : '0 1 auto',
            textAlign: column.alignment,
          }}
          title={column.caption}
        >
          {column.caption}
        </Box>
        {sortRule &&
          (sortRule.desc ? (
            <ArrowDownwardIcon sx={{ fontSize: 16 }} color="action" />
          ) : (
            <ArrowUpwardIcon sx={{ fontSize: 16 }} color="action" />
          ))}
        {sortRule && gridState.sorting.length > 1 && (
          <Box component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>
            {sortIndex + 1}
          </Box>
        )}
        {canHeaderFilter && (
          <Tooltip title="Filtrele">
            <IconButton
              size="small"
              aria-label={`${column.caption} değer filtresi`}
              onClick={(event) => {
                event.stopPropagation();
                setFilterAnchor(event.currentTarget);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              sx={{ p: 0.25, ml: 'auto' }}
            >
              {filterState?.values?.length ? (
                <FilterAltIcon sx={{ fontSize: 16 }} color="primary" />
              ) : (
                <FilterAltOutlinedIcon sx={{ fontSize: 16 }} color="action" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  const ariaSort = sortRule ? (sortRule.desc ? 'descending' : 'ascending') : canSort ? 'none' : undefined;

  return (
    <SortableHeaderCell displayColumn={displayColumn} enabled={canReorder}>
      {({ style, dragProps, setRef }) => (
        <TableCell
          ref={(element: HTMLTableCellElement | null) => {
            setRef(element);
            registerHeaderCell(displayColumn.id, element);
          }}
          aria-sort={ariaSort}
          align={column?.alignment ?? 'center'}
          padding={column ? 'normal' : 'checkbox'}
          onClick={handleSortClick}
          onContextMenu={(event) => {
            if (!canSort) return;
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY });
          }}
          {...dragProps}
          style={style}
          sx={[
            getCellSx(displayColumn, { showRowLines: true, showColumnLines, isHeader: true }),
            (theme) => ({
              position: displayColumn.pinned ? 'sticky' : 'relative',
              px: column ? 1 : 0,
              py: 1,
              color: theme.palette.text.secondary,
              fontSize: '0.8125rem',
              userSelect: 'none',
              cursor: canSort ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }),
          ]}
        >
          {content}
          {allowColumnResizing && column && (
            <Box
              role="separator"
              aria-orientation="vertical"
              aria-label={`${column.caption} genişliğini değiştir`}
              onPointerDown={(event) => {
                event.stopPropagation();
                startColumnResize(displayColumn.id, event);
              }}
              onClick={(event) => event.stopPropagation()}
              sx={(theme) => ({
                position: 'absolute',
                top: 0,
                right: 0,
                width: 6,
                height: '100%',
                cursor: 'col-resize',
                zIndex: 2,
                '&:hover': { backgroundColor: theme.palette.action.hover },
              })}
            />
          )}
          {canSort && (
            <Menu
              open={!!contextMenu}
              onClose={() => setContextMenu(null)}
              anchorReference="anchorPosition"
              anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
              onClick={(event) => event.stopPropagation()}
            >
              <MenuItem dense onClick={() => setSortFromMenu(false)}>
                {sortingConfig.ascendingText ?? SORT_TEXTS.ascendingText}
              </MenuItem>
              <MenuItem dense onClick={() => setSortFromMenu(true)}>
                {sortingConfig.descendingText ?? SORT_TEXTS.descendingText}
              </MenuItem>
              <MenuItem dense disabled={!sortRule} onClick={() => setSortFromMenu(null)}>
                {sortingConfig.clearText ?? SORT_TEXTS.clearText}
              </MenuItem>
            </Menu>
          )}
          {filterAnchor && column && (
            <HeaderFilterMenu
              anchorEl={filterAnchor}
              items={getHeaderFilterItems(column, headerFilterData, pageData)}
              selectedValues={filterState?.values ?? []}
              onApply={(values) => gridState.changeHeaderFilter(column.id, values)}
              onClose={() => setFilterAnchor(null)}
            />
          )}
        </TableCell>
      )}
    </SortableHeaderCell>
  );
};

export const GridHeader = () => {
  const { displayColumns, table, filterRowVisible, allowColumnReordering, stickyHeader } = useGridContext();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const isDraggingRef = useRef(false);
  const reorderableIds = useMemo(
    () => displayColumns.filter((c) => c.kind === 'data' && !c.pinned).map((c) => c.id),
    [displayColumns]
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    // Bırakma sonrası gelen click sıralamayı tetiklemesin
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
    if (!over || active.id === over.id) return;
    const currentOrder = table.getAllLeafColumns().map((c) => c.id);
    const order = table.state.columnOrder?.length ? [...table.state.columnOrder] : currentOrder;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    table.setColumnOrder(arrayMove(order, from, to));
  };

  return (
    <TableHead sx={stickyHeader ? { position: 'sticky', top: 0, zIndex: 3 } : undefined}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        accessibility={getDndAccessibility()}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          isDraggingRef.current = false;
        }}
      >
        <SortableContext
          items={allowColumnReordering ? reorderableIds : []}
          strategy={horizontalListSortingStrategy}
        >
          <TableRow>
            {displayColumns.map((displayColumn) => (
              <HeaderCell key={displayColumn.id} displayColumn={displayColumn} isDraggingRef={isDraggingRef} />
            ))}
          </TableRow>
        </SortableContext>
      </DndContext>
      {filterRowVisible && <GridFilterRow />}
    </TableHead>
  );
};
