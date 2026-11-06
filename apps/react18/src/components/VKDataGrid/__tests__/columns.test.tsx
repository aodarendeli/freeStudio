import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VKDataGrid } from '../VKDataGrid';
import { categories, getDataRows, getRowByText, page, products, ServerHarness } from './fixtures';

const thead = () => within(document.querySelector('thead')!);

describe('Sütunlar ve hücreler', () => {
  it('columns verilmezse ilk satırın alanlarından üretilir, caption yoksa dataField yazılır', () => {
    render(<VKDataGrid dataSource={[{ code: 'A1', qty: 3 }]} totalCount={1} />);
    expect(thead().getByText('code')).toBeInTheDocument();
    expect(thead().getByText('qty')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
  });

  it('veri yoksa noDataText gösterilir', () => {
    const { unmount } = render(<VKDataGrid dataSource={[]} columns={[{ dataField: 'a' }]} />);
    expect(screen.getByText('Veri Bulunamadı')).toBeInTheDocument();
    unmount();
    render(<VKDataGrid dataSource={[]} columns={[{ dataField: 'a' }]} noDataText="Kayıt yok" />);
    expect(screen.getByText('Kayıt yok')).toBeInTheDocument();
  });

  it('lookup: hücrede id yerine displayExpr metni görünür', () => {
    render(<ServerHarness />);
    expect(within(getRowByText('Ürün 01')).getByText('Kırtasiye')).toBeInTheDocument();
    expect(within(getRowByText('Ürün 02')).getByText('Oyuncak')).toBeInTheDocument();
    expect(screen.queryByText('c1')).not.toBeInTheDocument();
  });

  it('format: para birimi ve tarih biçimlenir; calculateCellValue hesaplanmış değer gösterir', () => {
    render(
      <VKDataGrid
        dataSource={[{ id: 1, price: 1234.5, createdAt: '2024-03-05T14:07:00', qty: 2 }]}
        totalCount={1}
        columns={[
          { dataField: 'price', caption: 'Fiyat', dataType: 'number', format: { type: 'currency', precision: 2 } },
          { dataField: 'createdAt', caption: 'Tarih', dataType: 'date', format: 'dd.MM.yyyy HH:mm' },
          { caption: 'Toplam', name: 'total', calculateCellValue: (row: any) => row.price * row.qty, dataType: 'number' },
        ]}
      />
    );
    expect(screen.getByText(/1\.234,50/)).toBeInTheDocument();
    expect(screen.getByText('05.03.2024 14:07')).toBeInTheDocument();
    expect(screen.getByText('2469')).toBeInTheDocument();
  });

  it('boolean sütun salt okunur checkbox olarak çizilir', () => {
    render(
      <VKDataGrid dataSource={[{ id: 1, active: true }]} totalCount={1} columns={[{ dataField: 'active', caption: 'Aktif', dataType: 'boolean' }]} />
    );
    const box = within(document.querySelector('tbody')!).getByRole('checkbox', { name: 'Aktif' });
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
  });

  it('cellRender eski DevExtreme bilgisini alır: data, value, text, rowIndex, column', () => {
    const cellRender = vi.fn((info: any) => <span>özel {info.value}</span>);
    render(
      <VKDataGrid dataSource={page(0, 2)} totalCount={2} rowKeyExpr="id" columns={[{ dataField: 'name', caption: 'Ad', cellRender }]} />
    );
    expect(screen.getByText('özel Ürün 01')).toBeInTheDocument();
    expect(cellRender.mock.calls[0][0]).toMatchObject({
      data: products[0],
      value: 'Ürün 01',
      text: 'Ürün 01',
      rowIndex: 0,
      key: 1,
      rowType: 'data',
      column: expect.objectContaining({ dataField: 'name', caption: 'Ad' }),
    });
  });

  it('visible: false sütun gösterilmez; alignment uygulanır', () => {
    render(
      <ServerHarness
        columns={[
          { dataField: 'name', caption: 'Ad', alignment: 'right' },
          { dataField: 'price', caption: 'Fiyat', visible: false },
        ]}
      />
    );
    expect(thead().queryByText('Fiyat')).not.toBeInTheDocument();
    expect(within(getRowByText('Ürün 01')).getByText('Ürün 01').closest('td')).toHaveClass('MuiTableCell-alignRight');
  });
});

describe('Sütun bazında filtre / sıralama ayarları', () => {
  it('allowFiltering: false olan sütunda filtre kutusu yoktur', () => {
    render(
      <ServerHarness
        columns={[
          { dataField: 'name', caption: 'Ad' },
          { dataField: 'price', caption: 'Fiyat', dataType: 'number', allowFiltering: false },
        ]}
      />
    );
    expect(screen.getByRole('textbox', { name: 'Ad filtresi' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Fiyat filtresi' })).not.toBeInTheDocument();
  });

  it('filterRow.visible: false ise filtre satırı yoktur', () => {
    render(<ServerHarness filterRow={{ visible: false }} />);
    expect(screen.queryByRole('textbox', { name: 'Ad filtresi' })).not.toBeInTheDocument();
  });

  it('allowSorting: false ve sorting.mode none sıralamayı kapatır', async () => {
    const onRequest = vi.fn();
    const { unmount } = render(
      <ServerHarness onRequest={onRequest} columns={[{ dataField: 'name', caption: 'Ad', allowSorting: false }]} />
    );
    await userEvent.click(thead().getByText('Ad'));
    expect(onRequest).not.toHaveBeenCalled();
    expect(thead().getByText('Ad').closest('th')).not.toHaveAttribute('aria-sort');
    unmount();

    render(<ServerHarness onRequest={onRequest} sorting={{ mode: 'none' }} />);
    await userEvent.click(thead().getByText('Fiyat'));
    expect(onRequest).not.toHaveBeenCalled();
  });

// HEADER FILTER: özellik yorum satırında olduğu için atlanıyor; açılınca .skip kaldırılmalı
  it.skip('header filter: sadece izin verilen sütunlarda ikon çıkar, seçilen değerler filterValues ile gider', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(
      <ServerHarness
        headerFilter
        onRequest={onRequest}
        columns={[
          { dataField: 'name', caption: 'Ad', allowHeaderFiltering: false },
          { dataField: 'categoryId', caption: 'Kategori', lookup: { dataSource: categories, valueExpr: 'id', displayExpr: 'name' } },
        ]}
      />
    );
    expect(screen.queryByRole('button', { name: 'Ad değer filtresi' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kategori değer filtresi' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Oyuncak' }));
    await user.click(screen.getByRole('button', { name: 'Tamam' }));
    expect(onRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageIndex: 0,
        filter: [expect.objectContaining({ dataField: 'categoryId', filterValues: ['c2'] })],
      })
    );
  });
});

describe('Sabit (fixed) sütunlar', () => {
  const stickyHeaders = () =>
    Array.from(document.querySelectorAll('thead tr:first-child th')).filter(
      (th) => getComputedStyle(th).position === 'sticky'
    );

  it('fixed verilmezse hiçbir sütun sabitlenmez (seçim sütunu dahil)', () => {
    render(<ServerHarness multipleSelection />);
    expect(stickyHeaders()).toHaveLength(0);
  });

  it('fixed: true sütun ve seçim sütunu sabitlenir; aksiyon (cellRender) sütunu normal kalır', () => {
    render(
      <ServerHarness
        multipleSelection
        columns={[
          { dataField: 'name', caption: 'Ad', fixed: true },
          { dataField: 'price', caption: 'Fiyat' },
          { dataField: 'actions', caption: 'İşlem', cellRender: () => <span>btn</span> },
        ]}
      />
    );
    const sticky = stickyHeaders().map((th) => th.textContent);
    expect(sticky).toHaveLength(2);
    expect(sticky).toContain('Ad');
    expect(sticky).not.toContain('İşlem');
  });

  it("fixedPosition: 'right' sütunu sağa sabitler", () => {
    render(
      <ServerHarness
        columns={[
          { dataField: 'name', caption: 'Ad' },
          { dataField: 'price', caption: 'Fiyat', fixed: true, fixedPosition: 'right' },
        ]}
      />
    );
    const [th] = stickyHeaders();
    expect(th.textContent).toContain('Fiyat');
    expect(getComputedStyle(th).right).not.toBe('');
  });
});

describe('Diğer', () => {
  it('veri satırları sayfa boyutunu aşmaz', () => {
    render(<VKDataGrid dataSource={products} totalCount={12} rowKeyExpr="id" paging={{ pageSize: 5 }} />);
    expect(getDataRows()).toHaveLength(5);
  });
});
