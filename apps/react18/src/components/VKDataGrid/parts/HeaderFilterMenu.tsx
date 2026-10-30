import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import type { HeaderFilterItem } from '../columns';

type HeaderFilterMenuProps = {
  anchorEl: HTMLElement | null;
  items: HeaderFilterItem[];
  selectedValues: any[];
  onApply: (values: any[]) => void;
  onClose: () => void;
};

const valueKey = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value));

export const HeaderFilterMenu = ({ anchorEl, items, selectedValues, onApply, onClose }: HeaderFilterMenuProps) => {
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(() => new Set(selectedValues.map(valueKey)));

  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr');
    return term ? items.filter((item) => item.text.toLocaleLowerCase('tr').includes(term)) : items;
  }, [items, search]);

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Popover
      open={!!anchorEl}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Box sx={{ width: 260, p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Ara..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoFocus
        />
        <List dense sx={{ maxHeight: 280, overflow: 'auto' }}>
          {visibleItems.map((item) => {
            const key = valueKey(item.value);
            return (
              <ListItemButton key={key} onClick={() => toggle(key)} dense>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Checkbox
                    edge="start"
                    size="small"
                    checked={checked.has(key)}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-label': item.text }}
                  />
                </ListItemIcon>
                <ListItemText primary={item.text || '(Boş)'} />
              </ListItemButton>
            );
          })}
        </List>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button size="small" onClick={onClose}>
            İptal
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              onApply(items.filter((item) => checked.has(valueKey(item.value))).map((item) => item.value));
              onClose();
            }}
          >
            Tamam
          </Button>
        </Box>
      </Box>
    </Popover>
  );
};
