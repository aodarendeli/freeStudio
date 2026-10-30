import type { CSSProperties, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { closestCenter, DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Row } from '@tanstack/react-table';
import {
  getCellSx,
  getSelectedRowColor,
  getZebraColor,
  SYSTEM_COLUMN,
  useGridContext,
  type DisplayColumn,
} from '../context';
import { getCellValue, getDisplayText } from '../columns';
import { getDndAccessibility, restrictToVerticalAxis } from '../dndModifiers';
import { NEW_ROW_ID } from '../hooks/useGridEditing';
import type { GridFeatures } from '../table';
import { isDeepEqual } from '../utils';
import { CellContent } from './CellContent';
import { CellEditor } from './CellEditor';

type GridRow = Row<GridFeatures, any>;

type SortableBindings = {
  setNodeRef: (element: HTMLElement | null) => void;
  style: CSSProperties;
  handleProps: Record<string, any>;
};

const cellTextSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

const CommandCell = ({ row, rowId }: { row: any; rowId: string }) => {
  const { editing } = useGridContext();
  const isEditingThis = editing.editingRow?.rowId === rowId;
  const isLocked = editing.isPending || (!!editing.editingRow && !isEditingThis);
  if (isEditingThis) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Tooltip title="Kaydet">
          <span>
            <IconButton size="small" aria-label="Kaydet" disabled={editing.isPending} onClick={editing.save}>
              <CheckIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="İptal">
          <span>
            <IconButton size="small" aria-label="İptal" disabled={editing.isPending} onClick={editing.cancel}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Tooltip title="Düzenle">
        <span>
          <IconButton
            size="small"
            aria-label="Düzenle"
            disabled={isLocked}
            onClick={() => editing.startEdit(rowId, row)}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Sil">
        <span>
          <IconButton size="small" aria-label="Sil" disabled={isLocked} onClick={() => editing.requestDelete(row)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

type RowViewProps = {
  rowId: string;
  data: any;
  dataIndex: number;
  isSelected: boolean;
  onToggleSelected?: (checked: boolean) => void;
  sortable?: SortableBindings;
};

const RowView = ({ rowId, data, dataIndex, isSelected, onToggleSelected, sortable }: RowViewProps) => {
  const ctx = useGridContext();
  const {
    displayColumns,
    showRowLines,
    showColumnLines,
    rowAlternationEnabled,
    editing,
    gridState,
    highlight,
    selection,
    actionMenuRender,
    selectedRadioRowKey,
    showDragIcons,
    dragging,
  } = ctx;
  const isNew = rowId === NEW_ROW_ID;
  const isEditing = editing.editingRow?.rowId === rowId;
  const rowKey = isNew ? undefined : selection.getGridKey(data);
  const isActiveDrag = dragging.activeRowId === rowId;

  const renderCell = (displayColumn: DisplayColumn, columnIndex: number): ReactNode => {
    switch (displayColumn.id) {
      case SYSTEM_COLUMN.drag:
        if (isNew || !showDragIcons) return null;
        return (
          <Box
            {...sortable?.handleProps}
            aria-label="Satırı sürükle"
            sx={{ display: 'flex', justifyContent: 'center', cursor: sortable ? 'grab' : 'not-allowed' }}
          >
            <DragIndicatorIcon fontSize="small" color={sortable ? 'action' : 'disabled'} />
          </Box>
        );
      case SYSTEM_COLUMN.select:
        if (isNew) return null;
        return (
          <Checkbox
            size="small"
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onToggleSelected?.(event.target.checked)}
            inputProps={{ 'aria-label': 'Satırı seç' }}
            sx={{ p: 0.5 }}
          />
        );
      case SYSTEM_COLUMN.radio: {
        if (isNew) return null;
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Checkbox
              size="small"
              checked={isDeepEqual(selectedRadioRowKey, ctx.getRadioKey(data))}
              readOnly
              inputProps={{ 'aria-label': 'Satırı seç' }}
              sx={{ p: 0.5 }}
            />
          </Box>
        );
      }
      case SYSTEM_COLUMN.actions:
        return isNew ? null : actionMenuRender?.(data);
      case SYSTEM_COLUMN.command:
        return <CommandCell row={data} rowId={rowId} />;
      default: {
        const column = displayColumn.column;
        if (!column) return null;
        if (isEditing && column.allowEditing && column.dataField) {
          return (
            <CellEditor
              column={column}
              value={editing.editingRow?.values[column.dataField]}
              onChange={(value) => editing.setValue(column.dataField as string, value)}
              autoFocus={columnIndex === displayColumns.findIndex((c) => c.kind === 'data')}
            />
          );
        }
        return (
          <CellContent
            column={column}
            value={isNew ? undefined : getCellValue(column, data)}
            row={data}
            rowKey={rowKey}
            rowIndex={dataIndex}
            columnIndex={columnIndex}
            isSelected={isSelected}
            isEditing={isEditing}
            searchText={gridState.searchText}
            highlight={highlight}
          />
        );
      }
    }
  };

  return (
    <TableRow
      ref={sortable?.setNodeRef}
      style={sortable?.style}
      aria-selected={isSelected}
      onClick={(event) => {
        if (!isNew && !isEditing) ctx.onRowClick(data, event);
      }}
      {...(!showDragIcons && sortable ? sortable.handleProps : {})}
      sx={(theme) => ({
        backgroundColor: isSelected
          ? getSelectedRowColor(theme)
          : rowAlternationEnabled && dataIndex % 2 === 1
            ? getZebraColor(theme)
            : theme.palette.background.paper,
        ...(isActiveDrag && {
          outline: `2px solid ${dragging.isDropAllowed ? theme.palette.primary.main : theme.palette.error.main}`,
          position: 'relative',
          zIndex: 6,
        }),
      })}
    >
      {displayColumns.map((displayColumn, columnIndex) => (
        <TableCell
          key={displayColumn.id}
          align={displayColumn.column?.alignment ?? 'center'}
          padding={displayColumn.kind === 'data' ? 'normal' : 'none'}
          sx={[
            getCellSx(displayColumn, { showRowLines, showColumnLines }),
            { px: displayColumn.kind === 'data' ? 1 : 0, py: isEditing ? 0.25 : 0.75, fontSize: '0.8125rem' },
            cellTextSx,
          ]}
        >
          {renderCell(displayColumn, columnIndex)}
        </TableCell>
      ))}
    </TableRow>
  );
};

const SortableRow = (props: Omit<RowViewProps, 'sortable'> & { disabled: boolean }) => {
  const { disabled, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.rowId,
    disabled,
  });
  return (
    <RowView
      {...rest}
      sortable={
        disabled
          ? undefined
          : {
              setNodeRef,
              style: { transform: CSS.Translate.toString(transform), transition },
              handleProps: { ...attributes, ...listeners },
            }
      }
    />
  );
};

const GroupRow = ({ row }: { row: GridRow }) => {
  const { displayColumns, allColumns, grouping, showRowLines } = useGridContext();
  const groupColumn = allColumns.find((c) => c.id === row.groupingColumnId);
  const canCollapse = grouping?.allowCollapsing !== false;
  const isExpanded = row.getIsExpanded();
  const text = groupColumn
    ? `${groupColumn.caption}: ${getDisplayText(groupColumn, row.groupingValue)}`
    : String(row.groupingValue ?? '');

  return (
    <TableRow
      onClick={() => {
        if (canCollapse && grouping?.expandMode === 'rowClick') row.toggleExpanded();
      }}
      sx={(theme) => ({ backgroundColor: theme.palette.action.hover })}
    >
      <TableCell
        colSpan={displayColumns.length}
        sx={(theme) => ({
          py: 0.5,
          borderBottom: showRowLines ? `1px solid ${theme.palette.divider}` : 'none',
          fontSize: '0.8125rem',
          fontWeight: 600,
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: row.depth * 3, position: 'sticky', left: 0 }}>
          {canCollapse && (
            <IconButton
              size="small"
              aria-label={isExpanded ? 'Grubu daralt' : 'Grubu genişlet'}
              aria-expanded={isExpanded}
              onClick={(event) => {
                event.stopPropagation();
                row.toggleExpanded();
              }}
              sx={{ p: 0.25 }}
            >
              {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
            </IconButton>
          )}
          {text}
        </Box>
      </TableCell>
    </TableRow>
  );
};

export const GridBody = () => {
  const ctx = useGridContext();
  const { table, displayColumns, editing, noDataText, isRowDraggingEnabled, dragging, selection } = ctx;
  const rows = table.getRowModel().rows;
  const dataRows = rows.filter((row) => !row.getIsGrouped());
  let dataIndex = -1;

  const body = (
    <TableBody>
      {editing.editingRow?.rowId === NEW_ROW_ID && (
        <RowView rowId={NEW_ROW_ID} data={editing.editingRow.values} dataIndex={-1} isSelected={false} />
      )}
      {rows.length === 0 && editing.editingRow?.rowId !== NEW_ROW_ID && (
        <TableRow>
          <TableCell
            colSpan={displayColumns.length}
            align="center"
            sx={{ py: 4, color: 'text.secondary', fontSize: '0.8125rem' }}
          >
            {noDataText}
          </TableCell>
        </TableRow>
      )}
      {rows.map((row) => {
        if (row.getIsGrouped()) return <GroupRow key={row.id} row={row} />;
        dataIndex += 1;
        const common = {
          rowId: row.id,
          data: row.original,
          dataIndex,
          isSelected: selection.isRowSelected(row.original),
          onToggleSelected: (checked: boolean) => row.toggleSelected(checked),
        };
        return isRowDraggingEnabled ? (
          <SortableRow key={row.id} {...common} disabled={!dragging.isRowDraggable(row.original)} />
        ) : (
          <RowView key={row.id} {...common} />
        );
      })}
    </TableBody>
  );

  if (!isRowDraggingEnabled) return body;
  return (
    <DndContext
      sensors={dragging.sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      accessibility={getDndAccessibility()}
      onDragStart={dragging.onDragStart}
      onDragOver={dragging.onDragOver}
      onDragEnd={dragging.onDragEnd}
      onDragCancel={dragging.onDragCancel}
    >
      <SortableContext items={dataRows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        {body}
      </SortableContext>
    </DndContext>
  );
};
