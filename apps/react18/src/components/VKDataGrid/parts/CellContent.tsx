import { Fragment, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import { getDisplayText, getLookupText, type GridColumn } from '../columns';

type CellContentProps = {
  column: GridColumn;
  value: any;
  row: any;
  rowKey: any;
  rowIndex: number;
  columnIndex: number;
  isSelected: boolean;
  isEditing: boolean;
  searchText: string;
  highlight: { enabled: boolean; caseSensitive: boolean };
};

const highlightText = (text: string, search: string, caseSensitive: boolean): ReactNode => {
  const term = search.trim();
  if (!term || !text) return text;
  const source = caseSensitive ? text : text.toLocaleLowerCase('tr');
  const needle = caseSensitive ? term : term.toLocaleLowerCase('tr');
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = source.indexOf(needle);
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <Box
        key={index}
        component="mark"
        sx={(theme) => ({
          backgroundColor: theme.palette.warning.light,
          color: theme.palette.getContrastText(theme.palette.warning.light),
          px: 0,
        })}
      >
        {text.slice(index, index + needle.length)}
      </Box>
    );
    cursor = index + needle.length;
    index = source.indexOf(needle, cursor);
  }
  if (cursor === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
};

/**
 * DevExtreme `cellRender` bilgi nesnesi ile uyumlu alanlar:
 * data, value, displayValue, text, rowIndex, columnIndex, column, row, rowType, key, isSelected, isEditing
 */
const buildCellInfo = ({ column, value, row, rowKey, rowIndex, columnIndex, isSelected, isEditing }: CellContentProps) => {
  const text = getDisplayText(column, value);
  return {
    data: row,
    value,
    displayValue: column.lookupOptions ? getLookupText(column, value) : value,
    text,
    rowIndex,
    columnIndex,
    column: {
      ...column.raw,
      dataField: column.dataField,
      caption: column.caption,
      dataType: column.dataType,
      name: column.name,
      alignment: column.alignment,
    },
    row: { data: row, key: rowKey, rowIndex, rowType: 'data', isSelected, isEditing },
    rowType: 'data',
    key: rowKey,
    isSelected,
    isEditing,
    values: [],
  };
};

export const CellContent = (props: CellContentProps) => {
  const { column, value, searchText, highlight } = props;
  if (column.cellRender) return <>{column.cellRender(buildCellInfo(props))}</>;
  if (column.dataType === 'boolean' && !column.lookupOptions && (typeof value === 'boolean' || value == null)) {
    return (
      <Checkbox
        size="small"
        checked={value === true}
        indeterminate={value == null}
        disabled
        sx={{ p: 0 }}
        inputProps={{ 'aria-label': column.caption }}
      />
    );
  }
  const text = getDisplayText(column, value);
  if (!highlight.enabled || !searchText) return <>{text}</>;
  return <>{highlightText(text, searchText, highlight.caseSensitive)}</>;
};
