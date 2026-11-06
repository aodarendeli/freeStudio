import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { VKDataGrid } from '../../components/VKDataGrid/VKDataGrid';
import type { ProductDto } from '../api';
import { useCategories, useProductSearch } from '../queries';
import { EMPTY_ROWS, QueryError, type DemoProps } from '../shared';
import { CreateProductButton, useProductCrud } from '../useProductCrud';

/** Satır sürükleme: ilk satır `isNonDraggable`, yeni sıra sadece `onReorder` ile bildirilir */
export const RowDraggingPage = ({ log }: DemoProps) => {
  const products = useProductSearch({ page: 1, size: 8 });
  const categories = useCategories();
  const rows = useMemo(
    () => (products.data?.data ?? EMPTY_ROWS).map((row, i) => ({ ...row, isNonDraggable: i === 0 })),
    [products.data]
  );
  const crud = useProductCrud();
  const columns = useMemo(
    () => [
      {
        dataField: 'name',
        caption: 'Ürün Adı',
        width: 300,
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
      },
      {
        dataField: 'createdAt',
        caption: 'Oluşturulma',
        width: 180,
        dataType: 'date',
        format: 'dd.MM.yyyy HH:mm',
      },
      {
        dataField: 'actions',
        caption: 'İşlemler',
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
      <Stack direction="row"><CreateProductButton /></Stack>
      <VKDataGrid
        dataSource={rows}
        totalCount={rows.length}
        columns={columns}
        rowKeyExpr="id"
        filterRow={{ visible: false }}
        pager={{ visible: false }}
        exportOptions={{ enabled: false, allowExportSelectedData: false }}
        rowDragging={{
          allowReordering: true,
          onReorder: (from, to) => log('onReorder', { from, to }),
        }}
      />
    </Stack>
  );
};
