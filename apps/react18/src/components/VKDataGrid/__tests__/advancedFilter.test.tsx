import { createRef } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VKDataGrid } from '../VKDataGrid';
import type { VKDataGridRef } from '../VKDataGrid.types';
import { columns, getDataRows, products, ServerHarness } from './fixtures';

const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0];
const rowNames = () => getDataRows().map((row) => row.querySelector('td')?.textContent);

/** Dialog içindeki RQB kontrolleri (`title` taşıyan sarmalayıcılar) */
const dialogControls = (title: string) =>
  Array.from(screen.getByRole('dialog').querySelectorAll(`[title="${title}"]`)).flatMap((wrapper) =>
    Array.from(wrapper.querySelectorAll<HTMLElement>('[role="combobox"], input:not([aria-hidden="true"])'))
  );

const selectOption = async (combobox: HTMLElement, label: string) => {
  fireEvent.mouseDown(combobox);
  fireEvent.click(await screen.findByRole('option', { name: label }));
};

/** Gelişmiş filtreyi açar, kural ekler; `edit` ile kontroller doldurulur, sonra "Uygula" */
const applyAdvancedFilter = async (edit: (user: ReturnType<typeof userEvent.setup>) => Promise<void>) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Gelişmiş filtre' }));
  await screen.findByRole('dialog');
  await edit(user);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Uygula' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
};

describe('Gelişmiş filtre (advancedFilter)', () => {
  it('advancedFilter verilmezse buton yoktur', () => {
    render(<ServerHarness />);
    expect(screen.queryByRole('button', { name: 'Gelişmiş filtre' })).not.toBeInTheDocument();
  });

  it('server mod: filtre satırı payload\'daki filter alanında RQB ağacı olarak gider', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    await user.type(screen.getByRole('textbox', { name: 'Fiyat filtresi' }), '30');
    await waitFor(() =>
      expect(lastCall(onRequest).filter).toEqual({ combinator: 'and', rules: [{ field: 'price', operator: '=', value: 30 }] })
    );
  });

  it('server mod: uygulanan gelişmiş filtre filtre satırıyla VE olarak birleşir, sayfa 0 ile istek atılır', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} advancedFilter />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    await user.type(screen.getByRole('textbox', { name: 'Ad filtresi' }), 'ürün');
    await waitFor(() => expect(lastCall(onRequest).filter.rules).toHaveLength(1));

    await applyAdvancedFilter(async (u) => {
      await u.click(screen.getByRole('button', { name: '+ Kural' }));
      await u.click(screen.getByRole('button', { name: '+ Kural' }));
      await selectOption(dialogControls('Bağlaç')[0], 'VEYA');
      await selectOption(dialogControls('Alan')[0], 'Fiyat');
      await selectOption(dialogControls('Operatör')[0], 'Büyüktür');
      await u.type(dialogControls('Değer')[0], '100');
      await selectOption(dialogControls('Alan')[1], 'Kategori');
      await selectOption(dialogControls('Değer')[1], 'Oyuncak');
    });

    expect(lastCall(onRequest)).toMatchObject({
      pageIndex: 0,
      filter: {
        combinator: 'and',
        rules: [
          {
            combinator: 'or',
            rules: [
              { field: 'price', operator: '>', value: 100 },
              { field: 'categoryId', operator: '=', value: 'c2' },
            ],
          },
          { field: 'name', operator: 'contains', value: 'ürün' },
        ],
      },
    });
    expect(screen.getByText('Gelişmiş filtre: 2 kural')).toBeInTheDocument();
  });

  it('chip üzerindeki sil gelişmiş filtreyi kaldırır; tekrar açınca uygulanmış filtreyle gelir', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} advancedFilter />);
    await applyAdvancedFilter(async (u) => {
      await u.click(screen.getByRole('button', { name: '+ Kural' }));
      await u.type(dialogControls('Değer')[0], 'Ürün 0');
    });
    expect(lastCall(onRequest).filter.rules).toEqual([{ field: 'name', operator: 'contains', value: 'Ürün 0' }]);

    await user.click(screen.getByText('Gelişmiş filtre: 1 kural'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(dialogControls('Değer')[0]).toHaveValue('Ürün 0');
    await user.click(screen.getByRole('button', { name: 'Kapat' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const chip = screen.getByText('Gelişmiş filtre: 1 kural').closest('.MuiChip-root') as HTMLElement;
    await user.click(within(chip).getByTestId('CancelIcon'));
    expect(lastCall(onRequest).filter).toEqual({ combinator: 'and', rules: [] });
    expect(screen.queryByText(/Gelişmiş filtre: /)).not.toBeInTheDocument();
  });

  it('client mod: gelişmiş filtre tüm veride yerelde uygulanır, istek atılmaz', async () => {
    const onFilterChange = vi.fn();
    render(
      <VKDataGrid
        columns={columns}
        rowKeyExpr="id"
        dataSource={products}
        remoteOperations={false}
        paging={{ pageIndex: 0, pageSize: 5 }}
        onFilterChange={onFilterChange}
        advancedFilter
      />
    );
    // Fiyatı 110'dan büyük VEYA adı "01" ile biten: Ürün 01, Ürün 12
    await applyAdvancedFilter(async (u) => {
      await u.click(screen.getByRole('button', { name: '+ Kural' }));
      await u.click(screen.getByRole('button', { name: '+ Kural' }));
      await selectOption(dialogControls('Bağlaç')[0], 'VEYA');
      await selectOption(dialogControls('Alan')[0], 'Fiyat');
      await selectOption(dialogControls('Operatör')[0], 'Büyüktür');
      await u.type(dialogControls('Değer')[0], '110');
      await selectOption(dialogControls('Operatör')[1], 'İle biter');
      await u.type(dialogControls('Değer')[1], '01');
    });
    expect(rowNames()).toEqual(['Ürün 01', 'Ürün 12']);
    expect(screen.getByText('Sayfa 1/1 (2 öğeler)')).toBeInTheDocument();
    expect(onFilterChange).not.toHaveBeenCalled();
  });

  it('ref: resetFilters gelişmiş filtreyi de temizler, getFilters ağacı döner', async () => {
    const ref = createRef<VKDataGridRef>();
    const onRequest = vi.fn();
    render(<ServerHarness ref={ref} onRequest={onRequest} advancedFilter />);
    await applyAdvancedFilter(async (u) => {
      await u.click(screen.getByRole('button', { name: '+ Kural' }));
      await u.type(dialogControls('Değer')[0], 'x');
    });
    expect(ref.current!.getFilters().filter.rules).toHaveLength(1);

    ref.current!.resetFilters();
    await waitFor(() => expect(screen.queryByText(/Gelişmiş filtre: /)).not.toBeInTheDocument());
    expect(ref.current!.getFilters().filter).toEqual({ combinator: 'and', rules: [] });
  });
});
