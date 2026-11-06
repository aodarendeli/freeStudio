import { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import { VKDataGrid } from '../../components/VKDataGrid/VKDataGrid';
import { useCategories, useProductSearch } from '../queries';
import { EMPTY_ROWS, PageInfoChips, QueryError, type DemoProps } from '../shared';

/** Sadece sayfalama: filtre, arama, sıralama, araç çubuğu yok. Grid + pager. */
export const PagingPage = ({ log }: DemoProps) => {
  const [paging, setPaging] = useState({ pageIndex: 0, pageSize: 10 });
  const payload = useMemo(() => ({ page: paging.pageIndex + 1, size: paging.pageSize }), [paging]);
  const products = useProductSearch(payload);
  const categories = useCategories();
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

  return (
    <Stack spacing={1.5}>
      <QueryError error={products.error ?? categories.error} />
      <PageInfoChips response={products.data} />
      <VKDataGrid
        dataSource={products.data?.data ?? EMPTY_ROWS}
        totalCount={products.data?.totalCount ?? 0}
        columns={columns}
        rowKeyExpr="id"
        paging={paging}
        allowedPageSizes={[5, 10, 20, 50]}
        handlePagingChanged={({ size, page }) => {
          log('POST /api/products', { page: page + 1, size });
          setPaging({ pageIndex: page, pageSize: size });
        }}
        filterRow={{ visible: false }}
        searchPanel={{ visible: false }}
        sorting={{ mode: 'none' }}
        columnChooserOption={{ enabled: false }}
        exportOptions={{ enabled: false, allowExportSelectedData: false }}
      />
    </Stack>
  );
};
