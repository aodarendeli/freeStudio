import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import IosShareIcon from '@mui/icons-material/IosShare';
import LibraryAddCheckOutlinedIcon from '@mui/icons-material/LibraryAddCheckOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import type { GridColumn } from '../columns';
import type { GridTable } from '../table';
import { ColumnChooser } from './ColumnChooser';
import { DebouncedTextField } from './DebouncedTextField';

type GridToolbarProps = {
  table: GridTable;
  columns: GridColumn[];
  searchVisible: boolean;
  searchText: string;
  onSearch: (text: string) => void;
  columnChooser: { enabled?: boolean; allowSearch?: boolean; title?: string };
  showAddButton: boolean;
  isAddDisabled: boolean;
  onAdd: () => void;
  showExportButton: boolean;
  onExport: () => void;
  showPrintButton: boolean;
  onPrint?: () => void;
  showExportAllButton: boolean;
  onExportAll?: () => void;
  showExportSelectedButton: boolean;
  onExportSelected: () => void;
};

const ToolbarButton = ({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Tooltip title={title}>
    <span>
      <IconButton size="small" aria-label={title} onClick={onClick} disabled={disabled}>
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

/** DevExtreme toolbar sırası: ekle, dışa aktar, sütun seçici, arama, sonra özel butonlar */
export const GridToolbar = (props: GridToolbarProps) => {
  const [chooserAnchor, setChooserAnchor] = useState<HTMLElement | null>(null);
  const {
    table,
    columns,
    searchVisible,
    searchText,
    onSearch,
    columnChooser,
    showAddButton,
    isAddDisabled,
    onAdd,
    showExportButton,
    onExport,
    showPrintButton,
    onPrint,
    showExportAllButton,
    onExportAll,
    showExportSelectedButton,
    onExportSelected,
  } = props;

  const hasItems =
    showAddButton ||
    showExportButton ||
    columnChooser.enabled ||
    searchVisible ||
    showPrintButton ||
    showExportAllButton ||
    showExportSelectedButton;
  if (!hasItems) return null;

  return (
    <Box
      role="toolbar"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.5, py: 0.75 }}
    >
      {showAddButton && (
        <ToolbarButton title="Satır Ekle" onClick={onAdd} disabled={isAddDisabled}>
          <AddIcon fontSize="small" />
        </ToolbarButton>
      )}
      {showExportButton && (
        <ToolbarButton title="Excel'e Aktar" onClick={onExport}>
          <FileDownloadOutlinedIcon fontSize="small" />
        </ToolbarButton>
      )}
      {columnChooser.enabled && (
        <>
          <ToolbarButton
            title={columnChooser.title ?? 'Sütun Seçici'}
            onClick={(event) => setChooserAnchor(event.currentTarget)}
          >
            <ViewColumnOutlinedIcon fontSize="small" />
          </ToolbarButton>
          {chooserAnchor && (
            <ColumnChooser
              anchorEl={chooserAnchor}
              onClose={() => setChooserAnchor(null)}
              title={columnChooser.title ?? 'Sütun Seçici'}
              allowSearch={columnChooser.allowSearch ?? false}
              columns={columns}
              table={table}
            />
          )}
        </>
      )}
      {searchVisible && (
        <DebouncedTextField
          size="small"
          placeholder="Ara..."
          value={searchText}
          onDebouncedChange={onSearch}
          sx={{ width: { xs: '100%', sm: 220 } }}
          slotProps={{
            htmlInput: { 'aria-label': 'Ara', style: { fontSize: '0.8125rem' } },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      {showPrintButton && (
        <ToolbarButton title="Yazdır" onClick={() => onPrint?.()}>
          <PrintOutlinedIcon fontSize="small" />
        </ToolbarButton>
      )}
      {showExportAllButton && (
        <ToolbarButton title="Tüm Veriyi Dışa Aktar" onClick={() => onExportAll?.()}>
          <IosShareIcon fontSize="small" />
        </ToolbarButton>
      )}
      {showExportSelectedButton && (
        <ToolbarButton title="Seçili Satırları Dışa Aktar" onClick={onExportSelected}>
          <LibraryAddCheckOutlinedIcon fontSize="small" />
        </ToolbarButton>
      )}
    </Box>
  );
};
