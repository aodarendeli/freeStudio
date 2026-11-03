import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VKDataGrid } from '../VKDataGrid';
import { columns, getDataRows, getRowByText, page, products, ServerHarness } from './fixtures';

const firstCell = () => getDataRows()[0].querySelector('td')!;
const style = (el: Element) => getComputedStyle(el);

describe('Görünüm bayrakları', () => {
  it('showBorders: dış çerçeve varsayılan açık, false ile kapanır', () => {
    const { container, unmount } = render(<ServerHarness />);
    expect(style(container.firstElementChild!).borderStyle).toBe('solid');
    unmount();
    const second = render(<ServerHarness showBorders={false} />);
    expect(style(second.container.firstElementChild!).borderStyle).not.toBe('solid');
  });

  it('showRowLines / showColumnLines satır ve sütun çizgilerini açıp kapatır', () => {
    const { unmount } = render(<ServerHarness />);
    expect(style(firstCell()).borderBottomStyle).toBe('solid');
    expect(style(firstCell()).borderRightStyle).toBe('solid');
    unmount();
    render(<ServerHarness showRowLines={false} showColumnLines={false} />);
    expect(style(firstCell()).borderBottomStyle).not.toBe('solid');
    expect(style(firstCell()).borderRightStyle).not.toBe('solid');
  });

  it('rowAlternationEnabled: tek/çift satırlar farklı zeminde, false ise aynı', () => {
    const { unmount } = render(<ServerHarness />);
    const [row1, row2] = getDataRows();
    expect(style(row1).backgroundColor).not.toBe(style(row2).backgroundColor);
    unmount();
    render(<ServerHarness rowAlternationEnabled={false} />);
    const [a, b] = getDataRows();
    expect(style(a).backgroundColor).toBe(style(b).backgroundColor);
  });

  it('seçili satır farklı zeminde gösterilir', async () => {
    render(<ServerHarness rowAlternationEnabled={false} />);
    const before = style(getRowByText('Ürün 01')).backgroundColor;
    await userEvent.click(screen.getByText('Ürün 01'));
    expect(style(getRowByText('Ürün 01')).backgroundColor).not.toBe(before);
  });

  it('isHeaderBold başlıkları 700 kalınlıkta yazar', () => {
    const { unmount } = render(<ServerHarness />);
    const header = () => within(document.querySelector('thead')!).getByText('Ad');
    expect(style(header()).fontWeight).toBe('600');
    unmount();
    render(<ServerHarness isHeaderBold />);
    expect(style(header()).fontWeight).toBe('700');
  });

  it('height verilince başlık yapışkan olur ve gövde kaydırılır; verilmezse değil', () => {
    const { container, unmount } = render(<ServerHarness height={300} />);
    expect(style(document.querySelector('thead')!).position).toBe('sticky');
    expect(style(container.firstElementChild!).maxHeight).toBe('300px');
    expect(style(container.querySelector('.MuiTableContainer-root')!).overflow).toBe('auto');
    unmount();
    render(<ServerHarness />);
    expect(style(document.querySelector('thead')!).position).not.toBe('sticky');
  });

  it('scrollingOption virtual desteklenmez: uyarı yazılır, standart kaydırma kullanılır', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ServerHarness scrollingOption={{ mode: 'virtual' }} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('virtual'));
    expect(getDataRows()).toHaveLength(10);
    warn.mockRestore();
  });
});

describe('Seçim: ek durumlar', () => {
  it("selection={{ mode: 'multiple', showCheckBoxesMode: 'none' }}: checkbox yok, Ctrl+tıklama ekler", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ServerHarness
        selection={{ mode: 'multiple', selectAllMode: 'page', showCheckBoxesMode: 'none' }}
        rowSelectionChange={onSelect}
      />
    );
    expect(screen.queryByRole('checkbox', { name: 'Satırı seç' })).not.toBeInTheDocument();
    await user.click(screen.getByText('Ürün 01'));
    await user.keyboard('{Control>}');
    await user.click(screen.getByText('Ürün 03'));
    await user.keyboard('{/Control}');
    expect(onSelect.mock.calls.at(-1)![0].selectedRowKeys).toEqual([1, 3]);
    await user.click(screen.getByText('Ürün 05'));
    expect(onSelect.mock.calls.at(-1)![0].selectedRowKeys).toEqual([5]);
  });

  it('tekli seçimde seçili kayıt veriden kalkınca (silinince) seçim de kalkar', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <VKDataGrid dataSource={page(0, 5)} totalCount={5} columns={columns} rowKeyExpr="id" rowSelectionChange={onSelect} />
    );
    await userEvent.click(screen.getByText('Ürün 02'));
    expect(getRowByText('Ürün 02')).toHaveAttribute('aria-selected', 'true');
    const withoutTwo = page(0, 5).filter((p) => p.id !== 2);
    rerender(<VKDataGrid dataSource={withoutTwo} totalCount={4} columns={columns} rowKeyExpr="id" rowSelectionChange={onSelect} />);
    rerender(<VKDataGrid dataSource={page(0, 5)} totalCount={5} columns={columns} rowKeyExpr="id" rowSelectionChange={onSelect} />);
    expect(getRowByText('Ürün 02')).toHaveAttribute('aria-selected', 'false');
  });

  it('rowKeyExpr verilmezse satır nesnesinin kendisi anahtar olur', async () => {
    const onSelect = vi.fn();
    const rows = [{ name: 'A' }, { name: 'B' }];
    render(<VKDataGrid dataSource={rows} totalCount={2} multipleSelection columns={[{ dataField: 'name' }]} rowSelectionChange={onSelect} />);
    await userEvent.click(within(getRowByText('B')).getByRole('checkbox', { name: 'Satırı seç' }));
    expect(onSelect.mock.calls.at(-1)![0]).toEqual({ selectedRowsData: [{ name: 'B' }], selectedRowKeys: [{ name: 'B' }] });
  });

  it('eski davranış: rowKeyExpr verilip veride o alan yoksa satır seçime eklenmez', async () => {
    const onSelect = vi.fn();
    render(
      <VKDataGrid dataSource={[{ name: 'A' }]} totalCount={1} rowKeyExpr="id" multipleSelection columns={[{ dataField: 'name' }]} rowSelectionChange={onSelect} />
    );
    await userEvent.click(within(getRowByText('A')).getByRole('checkbox', { name: 'Satırı seç' }));
    expect(onSelect.mock.calls.at(-1)![0].selectedRowKeys).toEqual([]);
  });
});

describe('Gruplama: ek ayarlar', () => {
  const grouped = [
    { dataField: 'name', caption: 'Ad' },
    { dataField: 'categoryId', caption: 'Kategori', groupIndex: 0 },
  ];

  it('autoExpandAll: false ise gruplar kapalı başlar', () => {
    render(<VKDataGrid dataSource={page(0, 4)} totalCount={4} rowKeyExpr="id" columns={grouped} grouping={{ autoExpandAll: false }} />);
    expect(getDataRows()).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Grubu genişlet' })).toHaveLength(2);
  });

  it("expandMode: 'rowClick' grup satırına tıklayınca açıp kapatır", async () => {
    render(
      <VKDataGrid
        dataSource={page(0, 4)}
        totalCount={4}
        rowKeyExpr="id"
        columns={grouped}
        grouping={{ autoExpandAll: true, expandMode: 'rowClick', allowCollapsing: true }}
      />
    );
    await userEvent.click(screen.getByText('Kategori: c1'));
    expect(getDataRows()).toHaveLength(2);
    await userEvent.click(screen.getByText('Kategori: c1'));
    expect(getDataRows()).toHaveLength(4);
  });
});

describe('Özet: birden fazla sütun', () => {
  it('her sütun için ayrı toplam; metinsiz seçenek sadece değeri yazar', () => {
    render(
      <VKDataGrid
        dataSource={page(0, 2)}
        totalCount={2}
        rowKeyExpr="id"
        columns={[
          { dataField: 'id', caption: 'No', dataType: 'number' },
          { dataField: 'price', caption: 'Fiyat', dataType: 'number' },
        ]}
        summary={{ options: [{ column: 'id' }, { column: 'price', text: 'Toplam' }], count: [] }}
      />
    );
    const footer = document.querySelector('tfoot')!;
    expect(within(footer as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(footer as HTMLElement).getByText('Toplam: 30')).toBeInTheDocument();
  });
});

describe('Sütun Seçici: arama ve kapanma', () => {
  it('allowSearch ile liste filtrelenir, dışarı tıklayınca kapanır', async () => {
    const user = userEvent.setup();
    render(<ServerHarness columnChooserOption={{ enabled: true, allowSearch: true, title: 'Kolonlar' }} />);
    await user.click(screen.getByRole('button', { name: 'Kolonlar' }));
    const popup = await screen.findByRole('presentation');
    expect(within(popup).getByText('Kolonlar')).toBeInTheDocument();
    await user.type(within(popup).getByPlaceholderText('Ara...'), 'fiy');
    expect(within(popup).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'))).toEqual(['Fiyat']);
    await user.click(document.body.querySelector('.MuiBackdrop-root, .MuiPopover-root > div') ?? document.body);
    await waitFor(() => expect(screen.queryByRole('presentation')).not.toBeInTheDocument());
  });
});

describe('Excel dışa aktarma (exportOptions.enabled)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('görünen sütunları başlıklarıyla, lookup metniyle ve sayıları sayı olarak yazar', async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const onExporting = vi.fn();

    render(<ServerHarness onExporting={onExporting} />);
    await act(async () => {
      screen.getByRole('button', { name: "Excel'e Aktar" }).click();
    });
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(onExporting.mock.calls[0][0]).toMatchObject({ selectedRowsOnly: false, fileName: 'DataGrid', cancel: false });

    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    // jsdom Blob'unda arrayBuffer() yok
    const buffer = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob!);
    });
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    expect(sheet.getRow(1).values).toEqual([undefined, 'Ad', 'Fiyat', 'Kategori']);
    expect(sheet.getRow(2).values).toEqual([undefined, 'Ürün 01', 10, 'Kırtasiye']);
    expect(sheet.rowCount).toBe(11);
  });

  it('onExporting fileName değiştirirse dosya adı o olur', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });
    render(<ServerHarness onExporting={(e) => (e.fileName = 'Urunler')} />);
    await act(async () => {
      screen.getByRole('button', { name: "Excel'e Aktar" }).click();
    });
    await waitFor(() => expect(downloadName).toBe('Urunler.xlsx'));
  });
});

it('fixture kontrolü', () => {
  expect(products[0].name).toBe('Ürün 01');
});
