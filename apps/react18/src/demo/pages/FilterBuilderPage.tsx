import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { VKDataGrid } from '../../components/VKDataGrid/VKDataGrid';
import { countRules, VKFilterBuilder, type FilterGroup, type VKFilterField } from '../../components/VKFilterBuilder';
import { useCategories, useProductSearch } from '../queries';
import { EMPTY_ROWS, PageInfoChips, QueryError, type DemoProps } from '../shared';

const INITIAL_FILTER: FilterGroup = {
  combinator: 'and',
  rules: [
    { field: 'name', operator: 'contains', value: '' },
    { field: 'price', operator: 'between', value: [100, 500] },
  ],
};

/**
 * Dinamik filtre: VKFilterBuilder ile kurulan ağaç "Uygula" ile backend'e `filter` olarak gider
 * (grid'in gelişmiş filtresiyle aynı payload). Sonuçlar grid'de, grid'in kendi filtreleri kapalı.
 */
export const FilterBuilderPage = ({ log }: DemoProps) => {
  const categories = useCategories();
  const [applied, setApplied] = useState<FilterGroup | null>(null);
  const [paging, setPaging] = useState({ pageIndex: 0, pageSize: 10 });

  const fields = useMemo<VKFilterField[]>(
    () => [
      { name: 'name', label: 'Ürün Adı' },
      {
        name: 'categoryId',
        label: 'Kategori',
        options: (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
      },
      { name: 'price', label: 'Fiyat', dataType: 'number' },
      { name: 'createdAt', label: 'Oluşturulma', dataType: 'date' },
    ],
    [categories.data]
  );

  const payload = useMemo(
    () => ({
      page: paging.pageIndex + 1,
      size: paging.pageSize,
      ...(applied && { filter: applied }),
    }),
    [paging, applied]
  );
  const products = useProductSearch(payload);

  const columns = useMemo(
    () => [
      { dataField: 'name', caption: 'Ürün Adı', width: 300 },
      {
        dataField: 'categoryId',
        caption: 'Kategori',
        width: 170,
        lookup: { dataSource: categories.data ?? [], valueExpr: 'id', displayExpr: 'name' },
      },
      { dataField: 'price', caption: 'Fiyat', width: 150, dataType: 'number', format: { type: 'currency', precision: 2 } },
      { dataField: 'createdAt', caption: 'Oluşturulma', width: 180, dataType: 'date', format: 'dd.MM.yyyy HH:mm' },
    ],
    [categories.data]
  );

  const handleApply = (tree: FilterGroup) => {
    setApplied(tree);
    setPaging((prev) => ({ ...prev, pageIndex: 0 }));
    log('POST /api/products', { page: 1, size: paging.pageSize, filter: tree });
  };

  return (
    <Stack spacing={1.5}>
      <QueryError error={products.error ?? categories.error} />
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <VKFilterBuilder fields={fields} defaultValue={INITIAL_FILTER} onApply={handleApply} />
      </Paper>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          {applied && countRules(applied) > 0
            ? `Uygulanan filtre: ${countRules(applied)} kural`
            : 'Filtre uygulanmadı, tüm ürünler listeleniyor'}
        </Typography>
        <PageInfoChips response={products.data} />
      </Stack>

      <VKDataGrid
        dataSource={products.data?.data ?? EMPTY_ROWS}
        totalCount={products.data?.totalCount ?? 0}
        columns={columns}
        rowKeyExpr="id"
        paging={paging}
        allowedPageSizes={[10, 20, 50]}
        handlePagingChanged={({ size, page }) => setPaging({ pageIndex: page, pageSize: size })}
        filterRow={{ visible: false }}
        searchPanel={{ visible: false }}
        height={480}
      />

      {applied && (
        <Box component="details">
          <Typography component="summary" variant="body2" sx={{ cursor: 'pointer' }}>
            Backend'e giden filter
          </Typography>
          <Box
            component="pre"
            sx={{ m: 0, mt: 1, p: 1.5, fontSize: 12, bgcolor: 'action.hover', borderRadius: 1, overflow: 'auto' }}
          >
            {JSON.stringify(applied, null, 2)}
          </Box>
        </Box>
      )}
    </Stack>
  );
};
