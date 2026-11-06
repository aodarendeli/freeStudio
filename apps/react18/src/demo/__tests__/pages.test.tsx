import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PagingPage } from '../pages/PagingPage';
import { RowDraggingPage } from '../pages/RowDraggingPage';
import { ServerModePage } from '../pages/ServerModePage';
import { SimpleModePage } from '../pages/SimpleModePage';
import { ProductCrudProvider } from '../useProductCrud';

const categories = [
  { id: 'c1', name: 'Kırtasiye', createdAt: '' },
  { id: 'c2', name: 'Oyuncak', createdAt: '' },
];
const products = Array.from({ length: 23 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Ürün ${String(i + 1).padStart(2, '0')}`,
  price: (i + 1) * 10,
  categoryId: i % 2 === 0 ? 'c1' : 'c2',
  createdAt: '2026-01-01T10:00:00',
}));

/** Backend'i taklit eden fetch: liste istekleri body'deki page / size ile sayfalanır */
const requests: { method: string; url: string; body?: any }[] = [];
const fakeFetch = vi.fn(async (url: string, init: RequestInit = {}) => {
  const body = init.body ? JSON.parse(init.body as string) : undefined;
  requests.push({ method: init.method ?? 'GET', url, body });
  const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data, headers: new Headers() }) as Response;
  if (url === '/api/categories') return json({ success: true, data: categories, totalCount: 2, page: 1, size: 200, totalPages: 1 });
  if (url === '/api/products') {
    const { page, size } = body;
    return json({
      success: true,
      data: products.slice((page - 1) * size, page * size),
      totalCount: products.length,
      page,
      size,
      totalPages: Math.ceil(products.length / size),
    });
  }
  return json({ success: true, data: {} });
});

const productListRequests = () => requests.filter((r) => r.url === '/api/products');

const renderPage = (page: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductCrudProvider log={() => {}}>{page}</ProductCrudProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  requests.length = 0;
  vi.stubGlobal('fetch', fakeFetch);
});

describe('Demo sayfaları (gerçek API akışı, sahte fetch ile)', () => {
  it('Server mod: veriyi API den çeker; sayfa / sıralama body ile gider', async () => {
    const user = userEvent.setup();
    renderPage(<ServerModePage log={() => {}} />);
    expect(await screen.findByText('Ürün 01')).toBeInTheDocument();
    expect(productListRequests()[0].body).toMatchObject({ page: 1, size: 10 });

    await user.click(screen.getByRole('button', { name: 'Sayfa 3' }));
    expect(await screen.findByText('Ürün 21')).toBeInTheDocument();
    expect(productListRequests().at(-1)!.body).toMatchObject({ page: 3, size: 10 });

    await user.click(within(document.querySelector('thead')!).getByText('Fiyat'));
    await waitFor(() =>
      expect(productListRequests().at(-1)!.body).toMatchObject({ page: 1, sort: { dataField: 'price', sortOrder: 'asc' } })
    );
    expect(requests.every((r) => !r.url.includes('?'))).toBe(true);
  });

  it('Server mod: satırdaki Düzenle modalı, Sil onayı açar; butonlar satırı seçmez', async () => {
    const user = userEvent.setup();
    renderPage(<ServerModePage log={() => {}} />);
    const row = (await screen.findByText('Ürün 02')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Düzenle' }));
    expect(await screen.findByRole('dialog', { name: 'Ürünü düzenle' })).toBeInTheDocument();
    expect(row).toHaveAttribute('aria-selected', 'false');
    await user.click(screen.getByRole('button', { name: 'Vazgeç' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(within(row).getByRole('button', { name: 'Sil' }));
    await user.click(await screen.findByRole('button', { name: 'Evet, sil' }));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.url === '/api/products/delete/p2')).toBe(true));
    // Silme sonrası liste yeniden çekilir
    await waitFor(() => expect(productListRequests().length).toBeGreaterThan(1));
  });

  it('Basit mod: kategoriye göre gruplu gelir, sayfa boyutu değişince 1. sayfa istenir', async () => {
    const user = userEvent.setup();
    renderPage(<SimpleModePage log={() => {}} />);
    expect(await screen.findByText('Kategori: Kırtasiye')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    await waitFor(() => expect(productListRequests().at(-1)!.body).toEqual({ page: 2, size: 20 }));
    await user.click(screen.getByRole('button', { name: 'Sayfa başına 10 satır' }));
    await waitFor(() => expect(productListRequests().at(-1)!.body).toEqual({ page: 1, size: 10 }));
  });

  it('Sadece sayfalama: filtre, arama, sıralama, araç çubuğu yok; body sadece { page, size }', async () => {
    const user = userEvent.setup();
    renderPage(<PagingPage log={() => {}} />);
    expect(await screen.findByText('Ürün 01')).toBeInTheDocument();
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /filtresi/ })).not.toBeInTheDocument();
    await user.click(within(document.querySelector('thead')!).getByText('Fiyat'));
    expect(productListRequests()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Sayfa 3' }));
    await user.click(screen.getByRole('button', { name: 'Sayfa başına 5 satır' }));
    await waitFor(() => expect(productListRequests().at(-1)!.body).toEqual({ page: 1, size: 5 }));
    expect(productListRequests().map((r) => Object.keys(r.body).sort().join(','))).toEqual(
      productListRequests().map(() => 'page,size')
    );
  });

  it('Satır sürükleme: ilk 8 ürün, ilk satırın tutamacı pasif', async () => {
    renderPage(<RowDraggingPage log={() => {}} />);
    expect(await screen.findByText('Ürün 08')).toBeInTheDocument();
    expect(productListRequests()[0].body).toEqual({ page: 1, size: 8 });
    const handles = screen.getAllByLabelText('Satırı sürükle');
    expect(handles).toHaveLength(8);
    expect(handles[0]).toHaveStyle({ cursor: 'not-allowed' });
  });
});
