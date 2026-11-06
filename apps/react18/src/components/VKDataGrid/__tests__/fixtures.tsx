import { forwardRef, useState } from 'react';
import { VKDataGrid } from '../VKDataGrid';
import type { FiltersChangesTypes, VKDataGridProps, VKDataGridRef } from '../VKDataGrid.types';

export type Product = { id: number; name: string; price: number; active: boolean; categoryId: string };

export const categories = [
  { id: 'c1', name: 'Kırtasiye' },
  { id: 'c2', name: 'Oyuncak' },
];

/** 12 ürün: id 1..12, fiyat id * 10, tek id'ler Kırtasiye */
export const products: Product[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Ürün ${String(i + 1).padStart(2, '0')}`,
  price: (i + 1) * 10,
  active: i % 3 !== 0,
  categoryId: i % 2 === 0 ? 'c1' : 'c2',
}));

export const columns = [
  { dataField: 'name', caption: 'Ad' },
  { dataField: 'price', caption: 'Fiyat', dataType: 'number' },
  {
    dataField: 'categoryId',
    caption: 'Kategori',
    lookup: { dataSource: categories, valueExpr: 'id', displayExpr: 'name' },
  },
];

export const page = (pageIndex: number, pageSize: number, rows: Product[] = products) =>
  rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

/**
 * Server mod kullanan bir projeyi taklit eder: onFilterChange gelince
 * ilgili sayfayı "sunucudan" alıp grid'e verir.
 */
export const ServerHarness = forwardRef<
  VKDataGridRef,
  Partial<VKDataGridProps> & { onRequest?: (options: FiltersChangesTypes) => void }
>(({ onRequest, ...props }, ref) => {
  const [options, setOptions] = useState({ pageIndex: 0, pageSize: props.paging?.pageSize ?? 10 });
  return (
    <VKDataGrid
      ref={ref}
      columns={columns}
      rowKeyExpr="id"
      dataSource={page(options.pageIndex, options.pageSize)}
      totalCount={products.length}
      onFilterChange={(next) => {
        onRequest?.(next);
        setOptions({ pageIndex: next.pageIndex, pageSize: next.pageSize });
      }}
      {...props}
    />
  );
});

/** Basit mod: sayfa bilgisi `paging` ile dışarıdan gelir, `handlePagingChanged` ile değişir */
export const SimpleHarness = (
  props: Partial<VKDataGridProps> & { onPaging?: (data: { size: number; page: number }) => void }
) => {
  const { onPaging, ...rest } = props;
  const [paging, setPaging] = useState({ pageIndex: 0, pageSize: 5 });
  return (
    <VKDataGrid
      columns={columns}
      rowKeyExpr="id"
      dataSource={page(paging.pageIndex, paging.pageSize)}
      totalCount={products.length}
      paging={paging}
      handlePagingChanged={(data) => {
        onPaging?.(data);
        setPaging({ pageIndex: data.page, pageSize: data.size });
      }}
      {...rest}
    />
  );
};

/** tbody içindeki veri satırları */
export const getDataRows = () =>
  Array.from(document.querySelectorAll('tbody tr')).filter((tr) => tr.querySelector('td:not([colspan])'));

export const getRowByText = (text: string) => {
  const row = getDataRows().find((tr) => tr.textContent?.includes(text));
  if (!row) throw new Error(`Satır bulunamadı: ${text}`);
  return row as HTMLTableRowElement;
};
