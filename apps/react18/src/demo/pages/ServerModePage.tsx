import { useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Typography from '@mui/material/Typography';
import { VKDataGrid } from '../../components/VKDataGrid/VKDataGrid';
import type { FiltersChangesTypes, VKDataGridRef } from '../../components/VKDataGrid/VKDataGrid.types';
import { api } from '../api';
import type { ProductDto } from '../api';
import { useCategories, useProductSearch } from '../queries';
import { EMPTY_ROWS, PageInfoChips, QueryError, toSearchPayload, type DemoProps } from '../shared';
import { useProductCrud } from '../useProductCrud';

const INITIAL_OPTIONS: FiltersChangesTypes = { filter: [], searchText: '', sort: null, pageIndex: 0, pageSize: 10 };

/**
 * Server mod: filtre / arama / sıralama / sayfa değişince `onFilterChange` gelir,
 * hepsi body ile POST /api/products'a gider. Checkbox ile çoklu seçim,
 * satır sağında düzenle (modal) / sil (onay) butonları.
 */
export const ServerModePage = ({ log }: DemoProps) => {
  const gridRef = useRef<VKDataGridRef>(null);
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const payload = useMemo(() => toSearchPayload(options), [options]);
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
  // const summary = useMemo(() => ({ options: [{ column: 'price', text: 'Sayfa toplamı' }], count: [] }), []);

  return (
    <Stack spacing={1.5}>
      <VKDataGrid
        ref={gridRef}
        dataSource={products.data?.data ?? EMPTY_ROWS}
        totalCount={products.data?.totalCount ?? 0}
        columns={columns}
        rowKeyExpr="id"
        onFilterChange={(next) => {
          log('POST /api/products', toSearchPayload(next));
          setOptions(next);
        }}
        multipleSelection
        rowSelectionChange={(selected) => log('rowSelectionChange', selected.selectedRowKeys)}
        headerFilter
        isSelected
        isPrintButtonVisible
        handlePrint={() => window.print()}
        isExportAllButtonVisible
        exportDataAllMethod={(current) => {
          const { filter, searchText, sort } = toSearchPayload(current);
          return api.exportProducts({ filter, searchText, sort });
        }}
        // summary={summary}
        height={560}
      />
    </Stack>
  );
};
