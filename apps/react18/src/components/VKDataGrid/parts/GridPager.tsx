import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';

type GridPagerProps = {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  allowedPageSizes: number[];
  showPageSizeSelector: boolean;
  showInfo: boolean;
  showNavigationButtons: boolean;
  displayMode?: string;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export const GridPager = ({
  pageIndex,
  pageSize,
  totalCount,
  allowedPageSizes,
  showPageSizeSelector,
  showInfo,
  showNavigationButtons,
  displayMode,
  onPageChange,
  onPageSizeChange,
}: GridPagerProps) => {
  const pageCount = Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)));
  const isCompact = displayMode === 'compact';
  const sizes = allowedPageSizes.includes(pageSize)
    ? allowedPageSizes
    : [...allowedPageSizes, pageSize].sort((a, b) => a - b);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        px: 1,
        py: 0.75,
      }}
    >
      <Box>
        {showPageSizeSelector && sizes.length > 0 && (
          <Select
            size="small"
            variant="standard"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            inputProps={{ 'aria-label': 'Sayfa başına satır' }}
            sx={{ fontSize: '0.8125rem' }}
          >
            {sizes.map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {showInfo && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            {`Sayfa ${pageIndex + 1}/${pageCount} (${totalCount} öğeler)`}
          </Typography>
        )}
        <Pagination
          size="small"
          shape="rounded"
          count={pageCount}
          page={Math.min(pageIndex + 1, pageCount)}
          onChange={(_, page) => onPageChange(page - 1)}
          hidePrevButton={!showNavigationButtons}
          hideNextButton={!showNavigationButtons}
          siblingCount={isCompact ? 0 : 1}
          boundaryCount={isCompact ? 1 : 1}
          getItemAriaLabel={(type, page) =>
            type === 'page' ? `Sayfa ${page}` : type === 'next' ? 'Sonraki sayfa' : type === 'previous' ? 'Önceki sayfa' : type
          }
        />
      </Box>
    </Box>
  );
};
