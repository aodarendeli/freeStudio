import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColumn } from '../columns';
import type { GridTable } from '../table';

type ColumnChooserProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  title: string;
  allowSearch: boolean;
  columns: GridColumn[];
  table: GridTable;
};

/** DevExtreme `ColumnChooser mode="select"`: dışına tıklayınca kapanır */
export const ColumnChooser = ({ anchorEl, onClose, title, allowSearch, columns, table }: ColumnChooserProps) => {
  const [search, setSearch] = useState('');
  const visibility = table.state.columnVisibility as Record<string, boolean>;

  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr');
    return columns
      .filter((column) => column.allowHiding)
      .filter((column) => !term || column.caption.toLocaleLowerCase('tr').includes(term));
  }, [columns, search]);

  return (
    <Popover
      open={!!anchorEl}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box sx={{ width: 260, p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ px: 1 }}>
          {title}
        </Typography>
        {allowSearch && (
          <TextField
            size="small"
            placeholder="Ara..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
        )}
        <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
          {items.map((column) => {
            const isVisible = visibility[column.id] !== false;
            return (
              <ListItemButton
                key={column.id}
                dense
                onClick={() => table.setColumnVisibility((prev) => ({ ...prev, [column.id]: !isVisible }))}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Checkbox
                    edge="start"
                    size="small"
                    checked={isVisible}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-label': column.caption }}
                  />
                </ListItemIcon>
                <ListItemText primary={column.caption} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Popover>
  );
};
