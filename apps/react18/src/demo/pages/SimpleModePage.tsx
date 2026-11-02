import { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { VKDataGrid } from '../../components/VKDataGrid/VKDataGrid';
import type { ProductDto } from '../api';
import { useCategories, useProductSearch } from '../queries';
import { EMPTY_ROWS, PageInfoChips, QueryError, type DemoProps } from '../shared';
import { CreateProductButton, useProductCrud } from '../useProductCrud';

/**
 * Basit mod: sadece `handlePagingChanged` ile sayfa değişir, filtre / arama / sıralama
 * o sayfanın verisinde yapılır. Kategoriye göre gruplama ve tekli (radio) seçim.
 */
export const SimpleModePage = ({ log }: DemoProps) => {
  const [paging, setPaging] = useState({ pageIndex: 0, pageSize: 20 });
  const payload = useMemo(() => ({ page: paging.pageIndex + 1, size: paging.pageSize }), [paging]);
  const products = useProductSearch(payload);
  const categories = useCategories();
  const crud = useProductCrud();
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
        groupIndex: 0,
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
      {
        dataField: 'actions',
        caption: '',
        width: 90,
        alignment: 'center',
        allowSorting: false,
        allowFiltering: false,
        allowHeaderFiltering: false,
        allowHiding: false,
        // Düzenle modal'ı / silme onayı açar. stopPropagation: butona tıklamak satırı seçmesin
        cellRender: ({ data }: { data: ProductDto }) => (
          <>
            <Tooltip title="Düzenle">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  crud.openEdit(data);
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Sil">
              <IconButton
                size="small"
                color="error"
                onClick={(event) => {
                  event.stopPropagation();
                  crud.openDelete(data);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ),
      },
    ],
    [categories.data, crud.openEdit, crud.openDelete]
  );

  return (
    <Stack spacing={1.5}>
      <QueryError error={products.error ?? categories.error} />
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <CreateProductButton />
        <PageInfoChips response={products.data} />
      </Stack>
      <VKDataGrid
        dataSource={products.data?.data ?? EMPTY_ROWS}
        totalCount={products.data?.totalCount ?? 0}
        columns={columns}
        rowKeyExpr="id"
        paging={paging}
        allowedPageSizes={[10, 20, 50]}
        handlePagingChanged={({ size, page }) => {
          log('POST /api/products', { page: page + 1, size });
          setPaging({ pageIndex: page, pageSize: size });
        }}
        singleRowRadioSelection
        rowSelectionChange={(selected) => log('rowSelectionChange', selected.selectedRowKeys)}
        grouping={{ allowCollapsing: true, autoExpandAll: true, expandMode: 'rowClick' }}
      />
    </Stack>
  );
};
