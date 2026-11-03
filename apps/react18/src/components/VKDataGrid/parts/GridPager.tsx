/**
 * Sayfalayıcı: sayfa boyutu ve sayfa butonları (yuvarlak, seçili olan tema ana renginde), bilgi metni.
 * DevExtreme karşılığı: `<Pager>` (`infoText="Sayfa {0}/{1} ({2} öğeler)"`).
 */
import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
import Typography from '@mui/material/Typography';

/** Sayfa ve sayfa boyutu butonları aynı görünür: yuvarlak, seçili olan primary zemin + beyaz yazı */
const roundItemSx = { fontSize: '0.8125rem', fontWeight: 500 } as const;

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
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        px: 1.5,
        py: 1,
        borderTop: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Box role="group" aria-label="Sayfa başına satır" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {showPageSizeSelector &&
          sizes.map((size) => (
            <PaginationItem
              key={size}
              page={size}
              size="small"
              color="primary"
              selected={size === pageSize}
              aria-label={`Sayfa başına ${size} satır`}
              aria-pressed={size === pageSize}
              onClick={() => size !== pageSize && onPageSizeChange(size)}
              sx={roundItemSx}
            />
          ))}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {showInfo && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            {`Sayfa ${pageIndex + 1}/${pageCount} (${totalCount} öğeler)`}
          </Typography>
        )}
        <Pagination
          size="small"
          color="primary"
          count={pageCount}
          page={Math.min(pageIndex + 1, pageCount)}
          onChange={(_, page) => onPageChange(page - 1)}
          hidePrevButton={!showNavigationButtons}
          hideNextButton={!showNavigationButtons}
          siblingCount={isCompact ? 0 : 1}
          boundaryCount={isCompact ? 1 : 1}
          renderItem={(item) => <PaginationItem {...item} sx={roundItemSx} />}
          getItemAriaLabel={(type, page) =>
            type === 'page'
              ? `Sayfa ${page}`
              : type === 'next'
                ? 'Sonraki sayfa'
                : type === 'previous'
                  ? 'Önceki sayfa'
                  : type
          }
        />
      </Box>
    </Box>
  );
};
