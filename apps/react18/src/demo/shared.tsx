import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import type { FiltersChangesTypes } from '../components/VKDataGrid/VKDataGrid.types';
import type { PagedResponse, ProductDto, ProductSearchPayload } from './api';

export type DemoProps = { log: (title: string, payload: unknown) => void };

export const EMPTY_ROWS: ProductDto[] = [];

export const QueryError = ({ error }: { error: Error | null }) =>
  error ? (
    <Alert severity="error">{error.message}. Backend http://localhost:5108 üzerinde çalışıyor mu?</Alert>
  ) : null;

/** Yanıttaki sayfa bilgisi (totalCount / page / size / totalPages) */
export const PageInfoChips = ({ response }: { response?: PagedResponse<ProductDto> }) =>
  response ? (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
      <Chip size="small" label={`totalCount: ${response.totalCount}`} />
      <Chip size="small" label={`page: ${response.page}`} />
      <Chip size="small" label={`size: ${response.size}`} />
      <Chip size="small" color="primary" label={`totalPages: ${response.totalPages}`} />
    </Stack>
  ) : null;

/** Grid'in 0 tabanlı pageIndex değeri backend'in 1 tabanlı `page` alanına çevrilir */
export const toSearchPayload = (options: FiltersChangesTypes): ProductSearchPayload => ({
  page: options.pageIndex + 1,
  size: options.pageSize,
  filter: options.filter,
  searchText: options.searchText,
  sort: options.sort,
});
