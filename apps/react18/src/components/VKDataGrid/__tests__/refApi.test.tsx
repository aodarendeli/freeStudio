import { createRef } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { VKDataGridRef } from '../VKDataGrid.types';
import { ServerHarness } from './fixtures';

const setup = () => {
  const ref = createRef<VKDataGridRef>();
  const onRequest = vi.fn();
  render(<ServerHarness ref={ref} onRequest={onRequest} />);
  return { ref, onRequest, grid: () => ref.current as any };
};

describe('Ref API (VKDataGridRef)', () => {
  it('getFilters son filtre / arama / sıralama / sayfa bilgisini döner', async () => {
    const user = userEvent.setup();
    const { grid, onRequest } = setup();
    expect(grid().getFilters()).toEqual({ filter: [], searchText: '', sort: null, pageIndex: 0, pageSize: 10 });

    await user.type(screen.getByRole('textbox', { name: 'Ad filtresi' }), 'ürün');
    await waitFor(() => expect(onRequest).toHaveBeenCalled());
    await user.click(within(document.querySelector('thead')!).getByText('Fiyat'));
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));

    expect(grid().getFilters()).toMatchObject({
      filter: [expect.objectContaining({ dataField: 'name', filterValue: 'ürün' })],
      sort: { dataField: 'price', sortOrder: 'asc' },
      pageIndex: 1,
    });
  });

  it('resetFilters varsayılan: filtre / arama / sıralamayı temizler, sayfa 0, istek atmaz', async () => {
    const user = userEvent.setup();
    const { grid, onRequest } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Ara' }), 'x');
    await user.type(screen.getByRole('textbox', { name: 'Ad filtresi' }), 'y');
    await waitFor(() => expect(grid().getFilters().filter).toHaveLength(1));
    const calls = onRequest.mock.calls.length;

    act(() => grid().resetFilters());
    expect(onRequest).toHaveBeenCalledTimes(calls);
    expect(grid().getFilters()).toMatchObject({ filter: [], searchText: '', sort: null, pageIndex: 0 });
    expect(screen.getByRole('textbox', { name: 'Ara' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Ad filtresi' })).toHaveValue('');
  });

  it('resetFilters({ triggerOnFilterChange: true }) temiz seçeneklerle istek atar', async () => {
    const user = userEvent.setup();
    const { grid, onRequest } = setup();
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    act(() => grid().resetFilters({ triggerOnFilterChange: true }));
    expect(onRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: [], searchText: '', sort: null, pageIndex: 0 })
    );
  });

  it('resetFilters seçenekleri sadece istenen kısmı sıfırlar (resetSearch: false)', async () => {
    const user = userEvent.setup();
    const { grid } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Ara' }), 'kalem');
    await waitFor(() => expect(grid().getFilters().searchText).toBe('kalem'));
    act(() => grid().resetFilters({ resetSearch: false }));
    expect(grid().getFilters().searchText).toBe('kalem');
  });

  it('applyFilters filtreyi ve sıralamayı uygular, her zaman sayfa 0 ile istek atar', async () => {
    const user = userEvent.setup();
    const { grid, onRequest } = setup();
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));

    const filters = [{ dataField: 'name', dataType: 'string', filterOperator: 'contains', filterValue: 'Ürün 1' }];
    act(() => grid().applyFilters(filters, { dataField: 'price', dataType: 'number', sortOrder: 'desc' }));

    expect(onRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: filters, pageIndex: 0, sort: expect.objectContaining({ sortOrder: 'desc' }) })
    );
    expect(screen.getByRole('textbox', { name: 'Ad filtresi' })).toHaveValue('Ürün 1');
    expect(within(document.querySelector('thead')!).getByText('Fiyat').closest('th')).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });
});
