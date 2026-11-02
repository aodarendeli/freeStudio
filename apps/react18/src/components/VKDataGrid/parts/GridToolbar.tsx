import { useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
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
  showExportButton: boolean;
  onExport: () => void;
  showPrintButton: boolean;
  onPrint?: () => void;
  showExportAllButton: boolean;
  onExportAll?: () => void;
  isExportingAll: boolean;
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

/** Arama solda; dışa aktar, sütun seçici ve özel butonlar sağda */
export const GridToolbar = (props: GridToolbarProps) => {
  const [chooserAnchor, setChooserAnchor] = useState<HTMLElement | null>(null);
  const {
    table,
    columns,
    searchVisible,
    searchText,
    onSearch,
    columnChooser,
    showExportButton,
    onExport,
    showPrintButton,
    onPrint,
    showExportAllButton,
    onExportAll,
    isExportingAll,
    showExportSelectedButton,
    onExportSelected,
  } = props;

  const hasItems =
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
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
        px: 1.5,
        py: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
      })}
    >
      {searchVisible && (
        <DebouncedTextField
          size="small"
          placeholder="Ara..."
          value={searchText}
          onDebouncedChange={onSearch}
          sx={{ flex: { xs: '1 1 100%', sm: '0 1 280px' } }}
          slotProps={{
            htmlInput: { 'aria-label': 'Ara', style: { fontSize: '0.8125rem' } },
            input: {
              sx: { height: 34 },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 'auto' }}>
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
      {showPrintButton && (
        <ToolbarButton title="Yazdır" onClick={() => onPrint?.()}>
          <PrintOutlinedIcon fontSize="small" />
        </ToolbarButton>
      )}
      {showExportAllButton && (
        <ToolbarButton
          title={isExportingAll ? 'Dışa aktarılıyor...' : 'Tüm Veriyi Dışa Aktar'}
          onClick={() => onExportAll?.()}
          disabled={isExportingAll}
        >
          {isExportingAll ? <CircularProgress size={18} /> : <IosShareIcon fontSize="small" />}
        </ToolbarButton>
      )}
      {showExportSelectedButton && (
        <ToolbarButton title="Seçili Satırları Dışa Aktar" onClick={onExportSelected}>
          <LibraryAddCheckOutlinedIcon fontSize="small" />
        </ToolbarButton>
      )}
      </Box>
    </Box>
  );
};
