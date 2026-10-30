import TableCell from '@mui/material/TableCell';
import TableFooter from '@mui/material/TableFooter';
import TableRow from '@mui/material/TableRow';
import type { Summary } from '../VKDataGrid.types';
import { getCellSx, useGridContext } from '../context';
import { getCellValue, type GridColumn } from '../columns';
import { formatValue } from '../format';
import { isNil } from '../utils';

const getSummaryValue = (column: GridColumn | undefined, index: number, summary: Summary, rows: any[]) => {
  const remote = summary.count?.[index];
  if (!isNil(remote)) return remote;
  if (!column) return 0;
  return rows.reduce((total, row) => {
    const value = Number(getCellValue(column, row));
    return Number.isFinite(value) ? total + value : total;
  }, 0);
};

/** DevExtreme `Summary > TotalItem summaryType="sum"` karşılığı */
export const GridFooter = ({ summary }: { summary: Summary }) => {
  const { displayColumns, allColumns, pageData, showColumnLines } = useGridContext();

  const itemsByColumnId = new Map<string, string[]>();
  summary.options.forEach((option, index) => {
    const column = allColumns.find((c) => c.dataField === option.column || c.name === option.column);
    if (!column) return;
    const raw = getSummaryValue(column, index, summary, pageData);
    const value = typeof raw === 'number' ? formatValue(raw, column.format, 'number') : String(raw);
    const text = option.text ? `${option.text}: ${value}` : value;
    itemsByColumnId.set(column.id, [...(itemsByColumnId.get(column.id) ?? []), text]);
  });

  return (
    <TableFooter>
      <TableRow>
        {displayColumns.map((displayColumn) => (
          <TableCell
            key={displayColumn.id}
            align={displayColumn.column?.alignment ?? 'left'}
            sx={[
              getCellSx(displayColumn, { showRowLines: true, showColumnLines }),
              (theme) => ({
                px: 1,
                py: 0.75,
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: theme.palette.text.primary,
                whiteSpace: 'nowrap',
                backgroundColor: displayColumn.pinned ? theme.palette.background.paper : undefined,
              }),
            ]}
          >
            {itemsByColumnId.get(displayColumn.id)?.map((text) => <div key={text}>{text}</div>)}
          </TableCell>
        ))}
      </TableRow>
    </TableFooter>
  );
};
