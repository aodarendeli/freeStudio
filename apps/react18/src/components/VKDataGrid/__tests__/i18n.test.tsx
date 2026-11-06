import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { VKDataGrid } from '../VKDataGrid';
import { useExternalUiText } from '../i18n/useExternalUiText';
import { formatText } from '../utils';
import { ServerHarness } from './fixtures';

afterEach(() => {
  document.documentElement.lang = '';
});

describe('Dil metinleri (useExternalUiText("dataGrid.xxx"))', () => {
  it('varsayılan Türkçe metinler', () => {
    render(<ServerHarness isPrintButtonVisible isExportAllButtonVisible handlePrint={() => {}} />);
    expect(screen.getByRole('button', { name: 'Yazdır' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tüm Veriyi Dışa Aktar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seçili Satırları Dışa Aktar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sütun Seçici' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ara...')).toBeInTheDocument();
    expect(screen.getByText('Sayfa 1/2 (12 öğeler)')).toBeInTheDocument();
  });

  it('<html lang="en"> iken İngilizce metinler', async () => {
    document.documentElement.lang = 'en-US';
    render(<ServerHarness isPrintButtonVisible isExportAllButtonVisible isSelected multipleSelection handlePrint={() => {}} />);
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export All Data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Column Chooser' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByText('Page 1/2 (12 items)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Export Selected Rows' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please select at least one row first.');
  });

  it('noDataText dil dosyasından gelir; prop verilirse prop kazanır', () => {
    document.documentElement.lang = 'en';
    const { unmount } = render(<VKDataGrid dataSource={[]} columns={[{ dataField: 'a' }]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    unmount();
    render(<VKDataGrid dataSource={[]} columns={[{ dataField: 'a' }]} noDataText="Kayıt yok" />);
    expect(screen.getByText('Kayıt yok')).toBeInTheDocument();
  });

  it('columnChooserOption.title verilirse dil dosyasının yerine o kullanılır', () => {
    render(<ServerHarness columnChooserOption={{ enabled: true, title: 'Kolonlar' }} />);
    expect(screen.getByRole('button', { name: 'Kolonlar' })).toBeInTheDocument();
  });

  it('bilinmeyen dil Türkçeye, bilinmeyen anahtar anahtarın kendisine düşer', () => {
    document.documentElement.lang = 'de';
    const Probe = () => (
      <>
        <span>{useExternalUiText('dataGrid.printHint')}</span>
        <span>{useExternalUiText('dataGrid.yok')}</span>
      </>
    );
    render(<Probe />);
    expect(screen.getByText('Yazdır')).toBeInTheDocument();
    expect(screen.getByText('dataGrid.yok')).toBeInTheDocument();
  });

  it('formatText {0} {1} {2} yer tutucularını doldurur', () => {
    expect(formatText('Sayfa {0}/{1} ({2} öğeler)', 1, 13, 124)).toBe('Sayfa 1/13 (124 öğeler)');
    expect(formatText('{0} ve {3}', 'a')).toBe('a ve {3}');
  });
});
