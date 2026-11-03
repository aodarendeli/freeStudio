import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api';

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body, headers: new Headers() }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe('API istemcisi', () => {
  it('liste isteği POST /api/products; page ve size URL değil body içinde', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: [], totalCount: 0, page: 2, size: 10, totalPages: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    await api.listProducts({ page: 2, size: 10, filter: [], searchText: 'a', sort: null });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/products');
    expect(url).not.toContain('?');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ page: 2, size: 10, filter: [], searchText: 'a', sort: null });
  });

  it('create / update / delete doğru adreslere gider', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: {} }));
    vi.stubGlobal('fetch', fetchMock);
    await api.createProduct({ name: 'a', price: 1, categoryId: 'c' });
    await api.updateProduct('p 1', { name: 'a', price: 1, categoryId: 'c' });
    await api.deleteProduct('p1');
    expect(fetchMock.mock.calls.map(([url, init]: any) => `${init.method} ${url}`)).toEqual([
      'POST /api/products/create',
      'PUT /api/products/update/p%201',
      'DELETE /api/products/delete/p1',
    ]);
  });

  it('hata yanıtında doğrulama mesajlarını içeren ApiError fırlatır', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ success: false, message: 'Hata', errors: [{ message: 'Ad zorunlu' }] }, 400))
    );
    await expect(api.createProduct({ name: '', price: 1, categoryId: 'c' })).rejects.toMatchObject({
      message: 'Ad zorunlu',
      status: 400,
    });
    await expect(api.createProduct({ name: '', price: 1, categoryId: 'c' })).rejects.toBeInstanceOf(ApiError);
  });

  it('dışa aktarma: filtreleri body ile gönderir, dosya adını Content-Disposition başlığından alır', async () => {
    const headers = new Headers({ 'Content-Disposition': "attachment; filename=x.xlsx; filename*=UTF-8''urunler-2026.xlsx" });
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, headers, blob: async () => new Blob(['x']) }) as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    let downloaded = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download;
    });

    await api.exportProducts({ filter: [], searchText: 'kalem', sort: null });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/products/export');
    expect(JSON.parse(init.body as string)).toEqual({ filter: [], searchText: 'kalem', sort: null });
    expect(downloaded).toBe('urunler-2026.xlsx');
    click.mockRestore();
  });

  it('dışa aktarma hatasında ApiError fırlatır', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: false, message: 'Yetki yok' }, 403)));
    await expect(api.exportProducts({})).rejects.toMatchObject({ message: 'Yetki yok', status: 403 });
  });
});
