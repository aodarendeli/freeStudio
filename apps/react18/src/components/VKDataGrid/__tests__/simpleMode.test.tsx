import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getDataRows, SimpleHarness } from './fixtures';

const names = () => getDataRows().map((tr) => tr.querySelector('td')?.textContent);

describe('Basit mod (handlePagingChanged)', () => {
  it('sayfa değişince { size, page } bildirilir', async () => {
    const user = userEvent.setup();
    const onPaging = vi.fn();
    render(<SimpleHarness onPaging={onPaging} />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    expect(onPaging).toHaveBeenLastCalledWith({ size: 5, page: 1 });
    expect(names()[0]).toBe('Ürün 06');
  });

  it('sayfa boyutu değişince server modla aynı kural: 1. sayfaya dönülür', async () => {
    const user = userEvent.setup();
    const onPaging = vi.fn();
    render(<SimpleHarness onPaging={onPaging} allowedPageSizes={[5, 10]} />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 3' }));
    await user.click(screen.getByRole('button', { name: 'Sayfa başına 10 satır' }));
    expect(onPaging).toHaveBeenLastCalledWith({ size: 10, page: 0 });
    expect(names()).toHaveLength(10);
  });

  it('arama, filtre ve sıralama sayfadaki veride yerel yapılır, istek atılmaz', async () => {
    const user = userEvent.setup();
    const onPaging = vi.fn();
    render(<SimpleHarness onPaging={onPaging} />);

    await user.type(screen.getByRole('textbox', { name: 'Ara' }), 'oyuncak');
    await waitFor(() => expect(names()).toEqual(['Ürün 02', 'Ürün 04']));
    await user.clear(screen.getByRole('textbox', { name: 'Ara' }));

    await user.type(screen.getByRole('textbox', { name: 'Fiyat filtresi' }), '30');
    await waitFor(() => expect(names()).toEqual(['Ürün 03']));
    await user.clear(screen.getByRole('textbox', { name: 'Fiyat filtresi' }));
    await waitFor(() => expect(names()).toHaveLength(5));

    const priceHeader = within(document.querySelector('thead')!).getByText('Fiyat');
    await user.click(priceHeader);
    await user.click(priceHeader);
    expect(names()).toEqual(['Ürün 05', 'Ürün 04', 'Ürün 03', 'Ürün 02', 'Ürün 01']);
    expect(onPaging).not.toHaveBeenCalled();
  });

  it('arama sonucu vurgulanır', async () => {
    const user = userEvent.setup();
    render(<SimpleHarness />);
    await user.type(screen.getByRole('textbox', { name: 'Ara' }), '03');
    await waitFor(() => expect(document.querySelector('tbody mark')?.textContent).toBe('03'));
  });
});
