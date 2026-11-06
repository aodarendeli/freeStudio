import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getDataRows, ServerHarness } from './fixtures';

const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0];
const header = (caption: string) => within(document.querySelector('thead')!).getByText(caption);

describe('Server mod (onFilterChange)', () => {
  it('ilk açılışta istek atmaz, sayfa boyutu kadar satır gösterir', () => {
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    expect(onRequest).not.toHaveBeenCalled();
    expect(getDataRows()).toHaveLength(10);
  });

  it('arama 400ms beklenip tek istekle gönderilir ve sayfa 0a döner', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    expect(lastCall(onRequest)).toMatchObject({ pageIndex: 1 });

    await user.type(screen.getByRole('textbox', { name: 'Ara' }), 'kalem');
    await waitFor(() => expect(lastCall(onRequest)).toMatchObject({ searchText: 'kalem', pageIndex: 0 }));
    expect(onRequest.mock.calls.filter(([o]) => o.searchText === 'kalem')).toHaveLength(1);
  });

  it('metin filtresi contains, sayı filtresi = operatörüyle gider', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);

    await user.type(screen.getByRole('textbox', { name: 'Ad filtresi' }), 'ürün');
    await waitFor(() =>
      expect(lastCall(onRequest).filter).toEqual([
        expect.objectContaining({ dataField: 'name', filterOperator: 'contains', filterValue: 'ürün' }),
      ])
    );

    await user.type(screen.getByRole('textbox', { name: 'Fiyat filtresi' }), '30');
    await waitFor(() =>
      expect(lastCall(onRequest).filter).toContainEqual(
        expect.objectContaining({ dataField: 'price', dataType: 'number', filterOperator: '=', filterValue: 30 })
      )
    );
    expect(lastCall(onRequest).pageIndex).toBe(0);
  });

  it('filtre temizlenince filtresiz istek atılır; boşken tekrar boşaltmak istek atmaz', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    const input = screen.getByRole('textbox', { name: 'Ad filtresi' });

    await user.type(input, 'a');
    await waitFor(() => expect(onRequest).toHaveBeenCalledTimes(1));
    await user.clear(input);
    await waitFor(() => expect(onRequest).toHaveBeenCalledTimes(2));
    expect(lastCall(onRequest).filter).toEqual([]);

    await user.type(input, ' ');
    await user.clear(input);
    await new Promise((r) => setTimeout(r, 600));
    expect(onRequest).toHaveBeenCalledTimes(2);
  });

  it('operatör seçimi tek başına istek atmaz, sonraki değer seçilen operatörle gider', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(
      <ServerHarness
        onRequest={onRequest}
        columns={[{ dataField: 'price', caption: 'Fiyat', dataType: 'number', filterOperations: ['=', '>', 'between'] }]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Filtre operatörü' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Büyüktür' }));
    await new Promise((r) => setTimeout(r, 500));
    expect(onRequest).not.toHaveBeenCalled();

    await user.type(screen.getByRole('textbox', { name: 'Fiyat filtresi' }), '50');
    await waitFor(() =>
      expect(lastCall(onRequest).filter).toEqual([expect.objectContaining({ filterOperator: '>', filterValue: 50 })])
    );
  });

  it('between: tek uç doluyken istek atılmaz, iki uç dolunca [başlangıç, bitiş] gider', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(
      <ServerHarness
        onRequest={onRequest}
        columns={[{ dataField: 'price', caption: 'Fiyat', dataType: 'number', filterOperations: ['=', 'between'] }]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Filtre operatörü' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Arasında' }));

    await user.type(screen.getByPlaceholderText('Başlangıç'), '20');
    await new Promise((r) => setTimeout(r, 600));
    expect(onRequest).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Bitiş'), '60');
    await waitFor(() =>
      expect(lastCall(onRequest).filter).toEqual([
        expect.objectContaining({ filterOperator: 'between', filterValue: [20, 60] }),
      ])
    );
  });

  it('başlığa tıklama: artan -> azalan; Ctrl+tıklama sıralamayı kaldırır (sort: null)', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);

    await user.click(header('Fiyat'));
    expect(lastCall(onRequest)).toMatchObject({ sort: { dataField: 'price', sortOrder: 'asc' }, pageIndex: 0 });
    await user.click(header('Fiyat'));
    expect(lastCall(onRequest).sort).toMatchObject({ dataField: 'price', sortOrder: 'desc' });
    expect(header('Fiyat').closest('th')).toHaveAttribute('aria-sort', 'descending');

    await user.keyboard('{Control>}');
    await user.click(header('Fiyat'));
    await user.keyboard('{/Control}');
    expect(lastCall(onRequest).sort).toBeNull();
  });

  it('sayfa değişince filtre ve sıralama korunur, sadece pageIndex değişir', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    await user.click(header('Ad'));
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    expect(lastCall(onRequest)).toMatchObject({ pageIndex: 1, pageSize: 10, sort: { dataField: 'name' } });
  });

  it('sayfa boyutu değişince her zaman 1. sayfaya dönülür', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} paging={{ pageSize: 5 }} allowedPageSizes={[5, 10, 20]} />);
    await user.click(screen.getByRole('button', { name: 'Sayfa 3' }));
    expect(lastCall(onRequest)).toMatchObject({ pageIndex: 2, pageSize: 5 });

    await user.click(screen.getByRole('button', { name: 'Sayfa başına 10 satır' }));
    expect(lastCall(onRequest)).toMatchObject({ pageIndex: 0, pageSize: 10 });
  });

  it('sayfa boyutu küçülünce yeni veri gelmeden fazla satırlar görünmez', async () => {
    const user = userEvent.setup();
    // onFilterChange veriyi değiştirmiyor: grid hâlâ 10 satırlık eski sayfayı tutuyor
    const { rerender } = render(<ServerHarness onFilterChange={() => {}} allowedPageSizes={[5, 10]} />);
    expect(getDataRows()).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: 'Sayfa başına 5 satır' }));
    expect(getDataRows()).toHaveLength(5);
    rerender(<ServerHarness onFilterChange={() => {}} allowedPageSizes={[5, 10]} />);
    expect(getDataRows()).toHaveLength(5);
  });

  it('sütun genişliği değişimi istek atmaz', async () => {
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    const handle = screen.getByRole('separator', { name: 'Fiyat genişliğini değiştir' });
    // jsdom'da PointerEvent yok; MouseEvent aynı alanları taşır
    await act(async () => {
      fireEvent.pointerDown(handle, { clientX: 100 });
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 160 }));
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: 160 }));
    });
    expect(onRequest).not.toHaveBeenCalled();
  });
});
