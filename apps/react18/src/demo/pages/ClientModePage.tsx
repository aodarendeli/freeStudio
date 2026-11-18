import { useEffect, useMemo } from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { VKDataGrid } from '../../components/VKDataGrid/VKDataGrid';
import { useCategories, useProductSearch } from '../queries';
import { EMPTY_ROWS, QueryError, type DemoProps } from '../shared';

/** Backend'in tek istekte verdiği en fazla kayıt (GridDemoValidators.MaxPageSize) */
const ALL_PRODUCTS = { page: 1, size: 200 };

/**
 * Client mod: ürünlerin tamamı bir kez çekilip grid'e verilir (`remoteOperations={false}`).
 * Sayfalama, filtre, arama, sıralama, özet ve "tümünü dışa aktar" tarayıcıda çalışır,
 * olay günlüğüne ilk yükleme dışında istek düşmez. Aynı filtreleri Server mod sekmesinde deneyip
 * sonuçları karşılaştırabilirsin.
 */
export const ClientModePage = ({ log }: DemoProps) => {
  const products = useProductSearch(ALL_PRODUCTS);
  const categories = useCategories();
  const rows = products.data?.data ?? EMPTY_ROWS;
  const total = products.data?.totalCount ?? 0;

  useEffect(() => {
    if (products.data) log('POST /api/products (client mod, tek sefer)', { ...ALL_PRODUCTS, gelen: rows.length });
  }, [products.data, rows.length, log]);

  const columns = useMemo(
    () => [
      {
        dataField: 'name',
        caption: 'Ürün Adı',
        width: 300,
        filterOperations: ['contains', 'notcontains', 'startswith', 'endswith', '='],
      },
      {
        dataField: 'categoryId',
        caption: 'Kategori',
        width: 170,
        lookup: { dataSource: categories.data ?? [], valueExpr: 'id', displayExpr: 'name' },
      },
      {
        dataField: 'price',
        caption: 'Fiyat',
        width: 150,
        dataType: 'number',
        format: { type: 'currency', precision: 2 },
        filterOperations: ['=', '<>', '<', '>', '<=', '>=', 'between'],
      },
      {
        dataField: 'createdAt',
        caption: 'Oluşturulma',
        width: 180,
        dataType: 'date',
        format: 'dd.MM.yyyy HH:mm',
        filterOperations: ['=', '<', '>', 'between'],
      },
    ],
    [categories.data]
  );
  const summary = useMemo(() => ({ options: [{ column: 'price', text: 'Toplam' }], count: [] }), []);

  return (
    <Stack spacing={1.5}>
      <QueryError error={products.error ?? categories.error} />
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip size="small" color="primary" label={`Tarayıcıdaki kayıt: ${rows.length}`} />
        {total > rows.length && (
          <Chip size="small" color="warning" label={`Backend'de ${total} kayıt var, ilk ${rows.length} tanesi alındı`} />
        )}
      </Stack>
      <VKDataGrid
        dataSource={rows}
        columns={columns}
        rowKeyExpr="id"
        remoteOperations={false}
        advancedFilter
        paging={{ pageIndex: 0, pageSize: 10 }}
        allowedPageSizes={[10, 20, 50]}
        multipleSelection
        rowSelectionChange={(selected) => log('rowSelectionChange', selected.selectedRowKeys)}
        isExportAllButtonVisible
        summary={summary}
        height={560}
      />
    </Stack>
  );
};
