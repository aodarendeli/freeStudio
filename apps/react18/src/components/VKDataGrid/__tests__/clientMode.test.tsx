import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, forwardRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { VKDataGrid } from '../VKDataGrid';
import type { VKDataGridProps, VKDataGridRef } from '../VKDataGrid.types';
import { columns, getDataRows, products } from './fixtures';

/** Client mod: 12 ürünün tamamı verilir, sayfa boyutu 5 */
const ClientGrid = forwardRef<VKDataGridRef, Partial<VKDataGridProps>>((props, ref) => (
  <VKDataGrid
    ref={ref}
    columns={columns}
    rowKeyExpr="id"
    multipleSelection={false}
    dataSource={products}
    remoteOperations={false}
    paging={{ pageIndex: 0, pageSize: 5 }}
    allowedPageSizes={[5, 10, 20]}
    {...props}
  />
));

const rowNames = () => getDataRows().map((row) => row.querySelector('td')?.textContent);
const pageInfo = () => screen.getByText(/^Sayfa \d+\/\d+/).textContent;

describe('Client mod (remoteOperations={false})', () => {
  it('tüm veriyi kendisi sayfalar; totalCount verilmeden sayfa bilgisini hesaplar', async () => {
    const user = userEvent.setup();
    render(<ClientGrid />);
    expect(rowNames()).toEqual(['Ürün 01', 'Ürün 02', 'Ürün 03', 'Ürün 04', 'Ürün 05']);
    expect(pageInfo()).toBe('Sayfa 1/3 (12 öğeler)');

    await user.click(screen.getByRole('button', { name: 'Sayfa 3' }));
    expect(rowNames()).toEqual(['Ürün 11', 'Ürün 12']);
    expect(pageInfo()).toBe('Sayfa 3/3 (12 öğeler)');
  });

  it('sayfa boyutu değişince 1. sayfaya döner', async () => {
    const user = userEvent.setup();
    render(<ClientGrid />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    await user.click(screen.getByRole('button', { name: 'Sayfa başına 10 satır' }));
    expect(getDataRows()).toHaveLength(10);
    expect(pageInfo()).toBe('Sayfa 1/2 (12 öğeler)');
  });

  it('filtre tüm veride çalışır, sayfa sayısı filtrelenmiş veriden hesaplanır ve 1. sayfaya döner', async () => {
    const user = userEvent.setup();
    render(<ClientGrid />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));

    // 1. sayfada olmayan bir ürün bulunabilmeli
    await user.type(screen.getByRole('textbox', { name: 'Ad filtresi' }), '12');
    await waitFor(() => expect(rowNames()).toEqual(['Ürün 12']));
    expect(pageInfo()).toBe('Sayfa 1/1 (1 öğeler)');
  });

  it('sayı filtresi ve operatör: fiyatı 100den büyük olanlar', async () => {
    const user = userEvent.setup();
    render(
      <ClientGrid
        columns={[
          { dataField: 'name', caption: 'Ad' },
          { dataField: 'price', caption: 'Fiyat', dataType: 'number', filterOperations: ['=', '>'] },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Filtre operatörü' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Büyüktür' }));
    await user.type(screen.getByRole('textbox', { name: 'Fiyat filtresi' }), '100');
    await waitFor(() => expect(rowNames()).toEqual(['Ürün 11', 'Ürün 12']));
  });

  it('arama tüm veride ve lookup metninde arar', async () => {
    const user = userEvent.setup();
    render(<ClientGrid />);
    await user.type(screen.getByRole('textbox', { name: 'Ara' }), 'oyuncak');
    // Çift id'ler Oyuncak: 6 ürün, 2 sayfa
    await waitFor(() => expect(pageInfo()).toBe('Sayfa 1/2 (6 öğeler)'));
    expect(rowNames()).toEqual(['Ürün 02', 'Ürün 04', 'Ürün 06', 'Ürün 08', 'Ürün 10']);
  });

  it('sıralama sayfalamadan önce tüm veriye uygulanır', async () => {
    const user = userEvent.setup();
    render(<ClientGrid />);
    const priceHeader = within(document.querySelector('thead')!).getByText('Fiyat');
    await user.click(priceHeader);
    await user.click(priceHeader);
    expect(rowNames()).toEqual(['Ürün 12', 'Ürün 11', 'Ürün 10', 'Ürün 09', 'Ürün 08']);
  });

  it('onFilterChange ve handlePagingChanged verilse bile çağrılmaz', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const handlePagingChanged = vi.fn();
    render(<ClientGrid onFilterChange={onFilterChange} handlePagingChanged={handlePagingChanged} />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    await user.type(screen.getByRole('textbox', { name: 'Ad filtresi' }), 'ürün');
    await new Promise((r) => setTimeout(r, 500));
    expect(onFilterChange).not.toHaveBeenCalled();
    expect(handlePagingChanged).not.toHaveBeenCalled();
  });

  it('özet filtrelenmiş tüm veriden hesaplanır, sadece sayfadan değil', () => {
    render(<ClientGrid summary={{ options: [{ column: 'price', text: 'Toplam' }], count: [] }} />);
    // 10 + 20 + ... + 120
    expect(screen.getByText('Toplam: 780')).toBeInTheDocument();
  });

  it('veri azalırsa sayfa geçerli son sayfaya çekilir', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ClientGrid />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 3' }));
    rerender(<ClientGrid dataSource={products.slice(0, 6)} />);
    expect(rowNames()).toEqual(['Ürün 06']);
    expect(pageInfo()).toBe('Sayfa 2/2 (6 öğeler)');
  });

  it('ref: applyFilters ve resetFilters yerelde uygulanır', async () => {
    const ref = createRef<VKDataGridRef>();
    render(<ClientGrid ref={ref} />);
    ref.current!.applyFilters([{ dataField: 'categoryId', dataType: 'string', filterOperator: '=', filterValue: 'c1' }]);
    await waitFor(() => expect(pageInfo()).toBe('Sayfa 1/2 (6 öğeler)'));

    ref.current!.resetFilters();
    await waitFor(() => expect(pageInfo()).toBe('Sayfa 1/3 (12 öğeler)'));
  });

  it('"tümünü dışa aktar" exportDataAllMethod yoksa filtrelenmiş tüm satırları aktarır', async () => {
    const user = userEvent.setup();
    const onExporting = vi.fn((e) => {
      e.cancel = true;
    });
    render(<ClientGrid isExportAllButtonVisible onExporting={onExporting} />);
    await user.type(screen.getByRole('textbox', { name: 'Ara' }), 'oyuncak');
    await waitFor(() => expect(pageInfo()).toBe('Sayfa 1/2 (6 öğeler)'));

    await user.click(screen.getByRole('button', { name: 'Tüm Veriyi Dışa Aktar' }));
    const event = onExporting.mock.calls[0][0];
    expect(event.component.getVisibleRows()).toHaveLength(6);
    expect(event.component.totalCount()).toBe(6);
  });
});
