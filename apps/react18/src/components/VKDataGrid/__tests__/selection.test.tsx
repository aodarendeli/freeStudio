import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VKDataGrid } from '../VKDataGrid';
import { columns, getDataRows, getRowByText, page, products, ServerHarness, SimpleHarness } from './fixtures';

const lastSelection = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0];
const rowCheckbox = (text: string) => within(getRowByText(text)).getByRole('checkbox', { name: 'Satırı seç' });

describe('Seçim', () => {
  describe('varsayılan (multipleSelection = false)', () => {
    it('checkbox sütunu yoktur; satıra tıklayınca tek satır seçilir, başkasına tıklayınca seçim değişir', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ServerHarness rowSelectionChange={onSelect} />);
      expect(screen.queryByRole('checkbox', { name: 'Satırı seç' })).not.toBeInTheDocument();

      await user.click(screen.getByText('Ürün 02'));
      expect(lastSelection(onSelect)).toEqual({ selectedRowKeys: [2], selectedRowsData: [products[1]] });
      expect(getRowByText('Ürün 02')).toHaveAttribute('aria-selected', 'true');

      await user.click(screen.getByText('Ürün 05'));
      expect(lastSelection(onSelect).selectedRowKeys).toEqual([5]);
      expect(getRowByText('Ürün 02')).toHaveAttribute('aria-selected', 'false');
    });

    it('seçili satıra Ctrl+tıklama seçimi kaldırır', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ServerHarness rowSelectionChange={onSelect} />);
      await user.click(screen.getByText('Ürün 02'));
      await user.keyboard('{Control>}');
      await user.click(screen.getByText('Ürün 02'));
      await user.keyboard('{/Control}');
      expect(lastSelection(onSelect).selectedRowKeys).toEqual([]);
    });
  });

  describe('çoklu seçim (multipleSelection)', () => {
    it('her satırda checkbox ve başlıkta "sayfadaki tümünü seç" vardır', () => {
      render(<ServerHarness multipleSelection />);
      expect(screen.getAllByRole('checkbox', { name: 'Satırı seç' })).toHaveLength(10);
      expect(screen.getByRole('checkbox', { name: 'Sayfadaki tüm satırları seç' })).toBeInTheDocument();
    });

    it('checkbox ve satır tıklaması seçime ekler / çıkarır', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ServerHarness multipleSelection rowSelectionChange={onSelect} />);
      await user.click(rowCheckbox('Ürün 01'));
      await user.click(screen.getByText('Ürün 03'));
      expect(lastSelection(onSelect).selectedRowKeys).toEqual([1, 3]);

      await user.click(rowCheckbox('Ürün 01'));
      expect(lastSelection(onSelect).selectedRowKeys).toEqual([3]);
    });

    it('"tümünü seç" sadece görünen sayfayı seçer, tekrar basınca sayfanın seçimini kaldırır', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ServerHarness multipleSelection rowSelectionChange={onSelect} />);
      const selectAll = screen.getByRole('checkbox', { name: 'Sayfadaki tüm satırları seç' });

      await user.click(selectAll);
      expect(lastSelection(onSelect).selectedRowKeys).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(selectAll).toBeChecked();

      await user.click(selectAll);
      expect(lastSelection(onSelect).selectedRowKeys).toEqual([]);
    });

    it('sayfalar arası: başka sayfaya gidip dönünce seçili checkboxlar seçili kalır', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ServerHarness multipleSelection paging={{ pageSize: 5 }} rowSelectionChange={onSelect} />);

      await user.click(rowCheckbox('Ürün 02'));
      await user.click(rowCheckbox('Ürün 04'));
      await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
      expect(screen.getAllByRole('checkbox', { name: 'Satırı seç' }).every((c) => !(c as HTMLInputElement).checked)).toBe(
        true
      );

      await user.click(rowCheckbox('Ürün 07'));
      expect(lastSelection(onSelect).selectedRowKeys).toEqual([2, 4, 7]);

      await user.click(screen.getByRole('button', { name: 'Sayfa 1' }));
      expect(rowCheckbox('Ürün 02')).toBeChecked();
      expect(rowCheckbox('Ürün 04')).toBeChecked();
      expect(rowCheckbox('Ürün 01')).not.toBeChecked();

      await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
      expect(rowCheckbox('Ürün 07')).toBeChecked();
      // Başka sayfadaki seçim, bu sayfada "tümünü seç" kaldırılınca kaybolmaz
      await user.click(screen.getByRole('checkbox', { name: 'Sayfadaki tüm satırları seç' }));
      await user.click(screen.getByRole('checkbox', { name: 'Sayfadaki tüm satırları seç' }));
      expect(lastSelection(onSelect).selectedRowKeys).toEqual([2, 4]);
    });

    it('basit modda da sayfa değişince seçim korunur', async () => {
      const user = userEvent.setup();
      render(<SimpleHarness multipleSelection />);
      await user.click(rowCheckbox('Ürün 01'));
      await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
      await user.click(screen.getByRole('button', { name: 'Sayfa 1' }));
      expect(rowCheckbox('Ürün 01')).toBeChecked();
    });

    it('selectedRowKeys başlangıç seçimidir (anahtar ya da nesne)', () => {
      const { unmount } = render(<ServerHarness multipleSelection selectedRowKeys={[2, 3]} />);
      expect(rowCheckbox('Ürün 02')).toBeChecked();
      expect(rowCheckbox('Ürün 03')).toBeChecked();
      unmount();
      render(<ServerHarness multipleSelection selectedRowKeys={[{ id: 4 }]} />);
      expect(rowCheckbox('Ürün 04')).toBeChecked();
    });
  });

  describe('singleRowRadioSelection', () => {
    it('başta seçim işareti olur, satıra tıklayınca sadece o satır işaretlenir ve bildirilir', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ServerHarness singleRowRadioSelection rowSelectionChange={onSelect} />);
      await user.click(screen.getByText('Ürün 03'));
      expect(lastSelection(onSelect)).toMatchObject({ selectedRowKeys: [3] });
      expect(rowCheckbox('Ürün 03')).toBeChecked();

      await user.click(screen.getByText('Ürün 06'));
      expect(rowCheckbox('Ürün 06')).toBeChecked();
      expect(rowCheckbox('Ürün 03')).not.toBeChecked();
    });
  });

  it('cellRender içindeki buton stopPropagation yaparsa satır seçilmez', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(
      <VKDataGrid
        dataSource={page(0, 5)}
        totalCount={5}
        rowKeyExpr="id"
        rowSelectionChange={onSelect}
        columns={[
          ...columns,
          {
            dataField: 'actions',
            caption: '',
            allowFiltering: false,
            allowSorting: false,
            cellRender: ({ data }: any) => (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(data);
                }}
              >
                Düzenle {data.id}
              </button>
            ),
          },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Düzenle 2' }));
    expect(onEdit).toHaveBeenCalledWith(products[1]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(getDataRows().every((tr) => tr.getAttribute('aria-selected') === 'false')).toBe(true);
  });
});
