import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type ProductDto } from '../api';
import { CreateProductButton, ProductCrudProvider, useProductCrud } from '../useProductCrud';

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    api: {
      listCategories: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
    },
  };
});

const mocked = vi.mocked(api);
const product: ProductDto = { id: 'p1', name: 'Kalem', price: 12.5, categoryId: 'c1', createdAt: '2024-01-01' };
const categories = [
  { id: 'c1', name: 'Kırtasiye', createdAt: '' },
  { id: 'c2', name: 'Oyuncak', createdAt: '' },
];

const RowButtons = () => {
  const crud = useProductCrud();
  return (
    <>
      <button onClick={() => crud.openEdit(product)}>satırı düzenle</button>
      <button onClick={() => crud.openDelete(product)}>satırı sil</button>
      <CreateProductButton />
    </>
  );
};

const renderWithProviders = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductCrudProvider log={() => {}}>{ui}</ProductCrudProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.listCategories.mockResolvedValue({ success: true, message: '', data: categories } as any);
});

describe('Ürün ekle / düzenle / sil akışı (grid dışı, kullanan proje)', () => {
  it('Düzenle: modal ürünün değerleriyle açılır, Kaydet update isteği atar ve bildirim gösterir', async () => {
    const user = userEvent.setup();
    mocked.updateProduct.mockResolvedValue({ success: true, message: '', data: { ...product, name: 'Kurşun kalem' } });
    renderWithProviders(<RowButtons />);

    await user.click(screen.getByRole('button', { name: 'satırı düzenle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ürünü düzenle' });
    const name = within(dialog).getByRole('textbox', { name: /Ürün adı/ });
    expect(name).toHaveValue('Kalem');
    expect(within(dialog).getByRole('textbox', { name: /Fiyat/ })).toHaveValue('12.5');

    await user.clear(name);
    await user.type(name, 'Kurşun kalem');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    expect(mocked.updateProduct).toHaveBeenCalledWith('p1', { name: 'Kurşun kalem', categoryId: 'c1', price: 12.5 });
    expect(await screen.findByText('“Kurşun kalem” güncellendi')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('Düzenle: API hata verirse modal açık kalır ve hata gösterilir', async () => {
    const user = userEvent.setup();
    mocked.updateProduct.mockRejectedValue(new Error('Kategori bulunamadı'));
    renderWithProviders(<RowButtons />);
    await user.click(screen.getByRole('button', { name: 'satırı düzenle' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(await within(dialog).findByText('Kategori bulunamadı')).toBeInTheDocument();
  });

  it('Düzenle: ad boşsa Kaydet pasiftir; Vazgeç modalı kapatır', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RowButtons />);
    await user.click(screen.getByRole('button', { name: 'satırı düzenle' }));
    const dialog = await screen.findByRole('dialog');
    await user.clear(within(dialog).getByRole('textbox', { name: /Ürün adı/ }));
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocked.updateProduct).not.toHaveBeenCalled();
  });

  it('Sil: onay sorulur, "Hayır" hiçbir şey silmez', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RowButtons />);
    await user.click(screen.getByRole('button', { name: 'satırı sil' }));
    const dialog = await screen.findByRole('dialog', { name: /emin misiniz/i });
    expect(dialog).toHaveTextContent('“Kalem” kalıcı olarak silinecek.');
    await user.click(within(dialog).getByRole('button', { name: 'Hayır' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocked.deleteProduct).not.toHaveBeenCalled();
  });

  it('Sil: "Evet, sil" delete isteği atar ve bildirim gösterir', async () => {
    const user = userEvent.setup();
    mocked.deleteProduct.mockResolvedValue({ success: true, message: '', data: {} });
    renderWithProviders(<RowButtons />);
    await user.click(screen.getByRole('button', { name: 'satırı sil' }));
    await user.click(await screen.findByRole('button', { name: 'Evet, sil' }));
    expect(mocked.deleteProduct).toHaveBeenCalledWith('p1');
    expect(await screen.findByText('“Kalem” silindi')).toBeInTheDocument();
  });

  it('Yeni ürün: boş form açılır, create isteği atılır', async () => {
    const user = userEvent.setup();
    mocked.createProduct.mockResolvedValue({ success: true, message: '', data: { ...product, id: 'p2', name: 'Silgi' } });
    renderWithProviders(<RowButtons />);
    await user.click(screen.getByRole('button', { name: 'Yeni ürün' }));
    const dialog = await screen.findByRole('dialog', { name: 'Yeni ürün' });
    await user.type(within(dialog).getByRole('textbox', { name: /Ürün adı/ }), 'Silgi');
    await user.type(within(dialog).getByRole('textbox', { name: /Fiyat/ }), '7,5');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeEnabled());
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(mocked.createProduct).toHaveBeenCalledWith({ name: 'Silgi', categoryId: 'c1', price: 7.5 });
    expect(await screen.findByText('“Silgi” eklendi')).toBeInTheDocument();
  });
});
