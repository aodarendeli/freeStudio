import { useState } from 'react';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import type { GridColumn } from '../columns';
import { isNil, parseNumber, toDate } from '../utils';

type CellEditorProps = {
  column: GridColumn;
  value: any;
  onChange: (value: any) => void;
  autoFocus?: boolean;
};

const inputSx = { fontSize: '0.8125rem' };

/** CRUD satır düzenlemede sütun tipine göre editör */
export const CellEditor = ({ column, value, onChange, autoFocus }: CellEditorProps) => {
  const label = { 'aria-label': column.caption };

  if (column.lookupOptions) {
    const options = column.lookupOptions;
    const selectedIndex = options.findIndex((o) => o.value === value);
    return (
      <Select
        variant="standard"
        fullWidth
        displayEmpty
        autoFocus={autoFocus}
        value={selectedIndex >= 0 ? String(selectedIndex) : ''}
        onChange={(event) => {
          const index = event.target.value;
          onChange(index === '' ? null : options[Number(index)]?.value);
        }}
        inputProps={label}
        sx={inputSx}
      >
        <MenuItem value="">
          <em>Seçiniz</em>
        </MenuItem>
        {options.map((option, index) => (
          <MenuItem key={index} value={String(index)}>
            {option.text}
          </MenuItem>
        ))}
      </Select>
    );
  }

  if (column.dataType === 'boolean') {
    return (
      <Checkbox
        size="small"
        checked={value === true}
        onChange={(event) => onChange(event.target.checked)}
        inputProps={label}
        sx={{ p: 0 }}
      />
    );
  }

  if (column.dataType === 'date' || column.dataType === 'datetime') {
    const Picker = column.dataType === 'datetime' ? DateTimePicker : DatePicker;
    const date = toDate(value);
    return (
      <Picker
        value={date ? dayjs(date) : null}
        onChange={(next: Dayjs | null) => onChange(next && next.isValid() ? next.toDate() : null)}
        slotProps={{
          textField: { size: 'small', variant: 'standard', fullWidth: true, autoFocus, inputProps: label },
        }}
      />
    );
  }

  if (column.dataType === 'number') {
    return <NumberEditor column={column} value={value} onChange={onChange} autoFocus={autoFocus} />;
  }

  return (
    <TextField
      variant="standard"
      size="small"
      fullWidth
      autoFocus={autoFocus}
      value={isNil(value) ? '' : String(value)}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ htmlInput: { ...label, style: inputSx } }}
    />
  );
};

/** "1," / "1." gibi ara değerler yazılabilsin diye metin ayrı tutulur */
const NumberEditor = ({ column, value, onChange, autoFocus }: CellEditorProps) => {
  const [text, setText] = useState(isNil(value) ? '' : String(value));
  return (
    <TextField
      variant="standard"
      size="small"
      fullWidth
      autoFocus={autoFocus}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(parseNumber(event.target.value));
      }}
      slotProps={{ htmlInput: { 'aria-label': column.caption, inputMode: 'decimal', style: inputSx } }}
    />
  );
};
