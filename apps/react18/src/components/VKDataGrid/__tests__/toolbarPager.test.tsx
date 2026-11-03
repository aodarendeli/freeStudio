import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { products, ServerHarness } from './fixtures';

describe('Araç çubuğu', () => {
  it('arama ve butonlar sağa yaslı tek grupta; arama butonların solunda', () => {
    render(<ServerHarness isPrintButtonVisible handlePrint={() => {}} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.children).toHaveLength(1);
    const search = screen.getByRole('textbox', { name: 'Ara' });
    const exportButton = screen.getByRole('button', { name: "Excel'e Aktar" });
    const print = screen.getByRole('button', { name: 'Yazdır' });
    expect(toolbar.firstElementChild).toContainElement(search);
    expect(toolbar.firstElementChild).toContainElement(print);
    expect(search.compareDocumentPosition(exportButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(exportButton.compareDocumentPosition(print) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('bayraklar kapalıyken butonlar görünmez; hiçbiri yoksa araç çubuğu render edilmez', () => {
    const { unmount } = render(<ServerHarness />);
    expect(screen.queryByRole('button', { name: 'Yazdır' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tüm Veriyi Dışa Aktar' })).not.toBeInTheDocument();
    unmount();
    render(
      <ServerHarness
        searchPanel={{ visible: false }}
        columnChooserOption={{ enabled: false }}
        exportOptions={{ enabled: false, allowExportSelectedData: false }}
      />
    );
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('Yazdır butonu handlePrint çağırır', async () => {
    const handlePrint = vi.fn();
    render(<ServerHarness isPrintButtonVisible handlePrint={handlePrint} />);
    await userEvent.click(screen.getByRole('button', { name: 'Yazdır' }));
    expect(handlePrint).toHaveBeenCalledTimes(1);
  });

  it('Tüm Veriyi Dışa Aktar: güncel filtrelerle çağrılır, Promise bitene kadar buton kilitli', async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const exportAll = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<ServerHarness isExportAllButtonVisible exportDataAllMethod={exportAll} />);

    await user.type(screen.getByRole('textbox', { name: 'Ara' }), 'kalem');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Ara' })).toHaveValue('kalem'));
    await new Promise((r) => setTimeout(r, 450));
    await user.click(screen.getByRole('button', { name: 'Tüm Veriyi Dışa Aktar' }));

    expect(exportAll).toHaveBeenCalledWith(expect.objectContaining({ searchText: 'kalem', filter: [] }));
    expect(screen.getByRole('button', { name: 'Dışa aktarılıyor...' })).toBeDisabled();
    resolve();
    expect(await screen.findByRole('button', { name: 'Tüm Veriyi Dışa Aktar' })).toBeEnabled();
  });

  it('Tüm Veriyi Dışa Aktar hata verirse uyarı gösterilir', async () => {
    const exportAll = vi.fn(() => Promise.reject(new Error('Sunucu hatası')));
    render(<ServerHarness isExportAllButtonVisible exportDataAllMethod={exportAll} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tüm Veriyi Dışa Aktar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sunucu hatası');
  });

  it('eski parametresiz exportDataAllMethod da çalışır', async () => {
    const exportAll = vi.fn();
    render(<ServerHarness isExportAllButtonVisible exportDataAllMethod={() => exportAll()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tüm Veriyi Dışa Aktar' }));
    expect(exportAll).toHaveBeenCalledTimes(1);
  });

  it('seçim yokken "Seçili Satırları Dışa Aktar" uyarı verir (isSelected)', async () => {
    render(<ServerHarness isSelected multipleSelection />);
    await userEvent.click(screen.getByRole('button', { name: 'Seçili Satırları Dışa Aktar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lütfen önce en az 1 satır seçin.');
  });

  it('onExporting e.cancel = true ile varsayılan Excel aktarımını iptal eder, seçili satırları verir', async () => {
    const user = userEvent.setup();
    const onExporting = vi.fn((e) => {
      e.cancel = true;
    });
    render(<ServerHarness multipleSelection onExporting={onExporting} />);
    await user.click(within(document.querySelector('tbody')!).getAllByRole('checkbox', { name: 'Satırı seç' })[0]);
    await user.click(screen.getByRole('button', { name: 'Seçili Satırları Dışa Aktar' }));
    const event = onExporting.mock.calls[0][0];
    expect(event).toMatchObject({ selectedRowsOnly: true, format: 'xlsx', cancel: true });
    expect(event.component.getSelectedRowsData()).toEqual([products[0]]);
  });

  it('Sütun Seçici: sütun gizler, allowHiding: false olan sütun listede yoktur', async () => {
    const user = userEvent.setup();
    render(
      <ServerHarness
        columns={[
          { dataField: 'name', caption: 'Ad', allowHiding: false },
          { dataField: 'price', caption: 'Fiyat', dataType: 'number' },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Sütun Seçici' }));
    const popup = await screen.findByRole('presentation');
    expect(within(popup).queryByRole('checkbox', { name: 'Ad' })).not.toBeInTheDocument();
    await user.click(within(popup).getByRole('checkbox', { name: 'Fiyat' }));
    expect(within(document.querySelector('thead')!).queryByText('Fiyat')).not.toBeInTheDocument();
  });
});

describe('Sayfalayıcı', () => {
  it('bilgi metni ve sayfa butonları', () => {
    render(<ServerHarness />);
    expect(screen.getByText('Sayfa 1/2 (12 öğeler)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sayfa 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Sonraki sayfa' })).toBeInTheDocument();
  });

  it('sayfa boyutları yuvarlak butonlardır, seçili olan işaretlidir', async () => {
    render(<ServerHarness allowedPageSizes={[5, 10, 20]} />);
    const group = screen.getByRole('group', { name: 'Sayfa başına satır' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['5', '10', '20']);
    expect(within(group).getByRole('button', { name: 'Sayfa başına 10 satır' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Sayfa başına 10 satır' })).toHaveClass('Mui-selected');
  });

  it('seçili sayfa boyutuna tekrar basmak istek atmaz', async () => {
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} allowedPageSizes={[5, 10]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sayfa başına 10 satır' }));
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('pager.visible: false ise sayfalayıcı yoktur; showInfo / showPageSizeSelector kapatılabilir', () => {
    const { unmount } = render(<ServerHarness pager={{ visible: false }} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    unmount();
    render(<ServerHarness pager={{ visible: true, showInfo: false, showPageSizeSelector: false, showNavigationButtons: false }} />);
    expect(screen.queryByText(/öğeler/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sayfa başına/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sonraki sayfa' })).not.toBeInTheDocument();
  });
});
