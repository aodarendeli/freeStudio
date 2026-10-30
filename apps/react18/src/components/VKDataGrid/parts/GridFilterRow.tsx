import { memo, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { getCellSx, useGridContext, type DisplayColumn } from '../context';
import type { GridColumn } from '../columns';
import {
  getEffectiveOperation,
  normalizeOperation,
  OPERATION_LABELS,
  type ColumnFilterState,
} from '../filtering';
import { isNil, parseNumber, toDate } from '../utils';
import { DebouncedTextField } from './DebouncedTextField';

const inputSx = { fontSize: '0.8125rem' };

type ValueInputProps = {
  column: GridColumn;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  showAllText?: string;
};

const DateInput = ({ column, value, onChange, placeholder }: ValueInputProps) => {
  const Picker = column.dataType === 'datetime' ? DateTimePicker : DatePicker;
  const date = toDate(value);
  return (
    <Picker
      value={date ? dayjs(date) : null}
      onChange={(next: Dayjs | null) => {
        if (!next || !next.isValid()) {
          onChange(undefined);
          return;
        }
        onChange(column.dataType === 'date' ? next.startOf('day').toDate() : next.toDate());
      }}
      slotProps={{
        field: { clearable: true },
        textField: {
          size: 'small',
          variant: 'standard',
          fullWidth: true,
          placeholder,
          inputProps: { 'aria-label': `${column.caption} filtresi` },
          sx: { '& input': inputSx },
        },
      }}
    />
  );
};

/** Lookup ve boolean için seçim listesi. Değer tipini korumak için index kullanılır. */
const SelectInput = ({
  column,
  value,
  onChange,
  showAllText,
  options,
}: ValueInputProps & { options: { value: any; text: string }[] }) => {
  const selectedIndex = options.findIndex((o) => o.value === value);
  return (
    <Select
      variant="standard"
      fullWidth
      displayEmpty
      value={selectedIndex >= 0 ? String(selectedIndex) : ''}
      onChange={(event) => {
        const index = event.target.value;
        onChange(index === '' ? undefined : options[Number(index)]?.value);
      }}
      inputProps={{ 'aria-label': `${column.caption} filtresi` }}
      sx={inputSx}
    >
      <MenuItem value="">
        <em>{showAllText ?? '(Tümü)'}</em>
      </MenuItem>
      {options.map((option, index) => (
        <MenuItem key={index} value={String(index)}>
          {option.text}
        </MenuItem>
      ))}
    </Select>
  );
};

const BOOLEAN_OPTIONS = [
  { value: true, text: 'Evet' },
  { value: false, text: 'Hayır' },
];

const SingleValueInput = (props: ValueInputProps) => {
  const { column, value, onChange, placeholder } = props;
  if (column.lookupOptions) return <SelectInput {...props} options={column.lookupOptions} />;
  if (column.dataType === 'boolean') return <SelectInput {...props} options={BOOLEAN_OPTIONS} />;
  if (column.dataType === 'date' || column.dataType === 'datetime') return <DateInput {...props} />;
  const isNumber = column.dataType === 'number';
  return (
    <DebouncedTextField
      variant="standard"
      size="small"
      fullWidth
      placeholder={placeholder}
      value={isNil(value) ? '' : String(value)}
      onDebouncedChange={(text) => onChange(isNumber ? parseNumber(text) : text)}
      slotProps={{
        htmlInput: {
          inputMode: isNumber ? 'decimal' : 'text',
          'aria-label': `${column.caption} filtresi`,
          style: inputSx,
        },
      }}
    />
  );
};

const FilterCellContent = ({ column, state }: { column: GridColumn; state?: ColumnFilterState }) => {
  const { gridState, showAllText, resetOperationText } = useGridContext();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const operation = getEffectiveOperation(column, state);
  const hasOperationMenu = column.filterOperations.length > 0;
  const value = state?.value;

  const input =
    operation === 'between' ? (
      <Box sx={{ display: 'flex', gap: 0.5, flex: 1, minWidth: 0 }}>
        {[0, 1].map((index) => (
          <SingleValueInput
            key={index}
            column={column}
            placeholder={index === 0 ? 'Başlangıç' : 'Bitiş'}
            value={Array.isArray(value) ? value[index] : undefined}
            onChange={(next) => {
              const range = Array.isArray(value) ? [...value] : [undefined, undefined];
              range[index] = isNil(next) ? null : next;
              gridState.changeFilterValue(
                column.id,
                range.every((v) => isNil(v)) ? undefined : range
              );
            }}
          />
        ))}
      </Box>
    ) : (
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <SingleValueInput
          column={column}
          value={value}
          showAllText={showAllText}
          onChange={(next) => gridState.changeFilterValue(column.id, next)}
        />
      </Box>
    );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {hasOperationMenu && (
        <>
          <Tooltip title={OPERATION_LABELS[operation] ?? operation}>
            <IconButton
              size="small"
              aria-label="Filtre operatörü"
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              sx={{ p: 0.25 }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            {column.filterOperations.map((op) => {
              const normalized = normalizeOperation(op) ?? op;
              return (
                <MenuItem
                  key={op}
                  dense
                  selected={normalized === operation && !!state?.operator}
                  onClick={() => {
                    gridState.changeFilterOperator(column.id, op);
                    setMenuAnchor(null);
                  }}
                >
                  <ListItemText>{OPERATION_LABELS[normalized] ?? op}</ListItemText>
                </MenuItem>
              );
            })}
            <Divider />
            <MenuItem
              dense
              onClick={() => {
                gridState.resetFilterOperator(column.id);
                setMenuAnchor(null);
              }}
            >
              <ListItemText>{resetOperationText}</ListItemText>
            </MenuItem>
          </Menu>
        </>
      )}
      {input}
    </Box>
  );
};

const FilterCell = memo(
  ({
    displayColumn,
    state,
    showRowLines,
    showColumnLines,
  }: {
    displayColumn: DisplayColumn;
    state?: ColumnFilterState;
    showRowLines: boolean;
    showColumnLines: boolean;
  }) => {
    const column = displayColumn.column;
    return (
      <TableCell
        padding="none"
        sx={[
          getCellSx(displayColumn, { showRowLines, showColumnLines, isHeader: true }),
          { px: 1, py: 0.5 },
        ]}
      >
        {column && column.allowFiltering && <FilterCellContent column={column} state={state} />}
      </TableCell>
    );
  }
);

export const GridFilterRow = () => {
  const { displayColumns, gridState, showRowLines, showColumnLines } = useGridContext();
  return (
    <TableRow>
      {displayColumns.map((displayColumn) => (
        <FilterCell
          key={displayColumn.id}
          displayColumn={displayColumn}
          state={gridState.filters[displayColumn.id]}
          showRowLines={showRowLines}
          showColumnLines={showColumnLines}
        />
      ))}
    </TableRow>
  );
};
