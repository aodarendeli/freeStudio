import type { FilterGroup, SortingTypes } from '../components/VKDataGrid/VKDataGrid.types';

export type ProductDto = { id: string; name: string; price: number; categoryId: string; createdAt: string };
export type CategoryDto = { id: string; name: string; createdAt: string };
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: { field?: string | null; message: string }[] | null;
};

/** Backend hataları RFC 9457 Problem Details olarak döner; `errors` alan -> mesaj listesi sözlüğüdür */
type ProblemDetails = { title?: string; detail?: string; errors?: Record<string, string[]> };

/** Liste yanıtı: sayfa bilgisi doğrudan yanıtta döner */
export type PagedResponse<T> = ApiResponse<T[]> & {
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
};

/** Sayfa bilgisi URL'de değil body'de gider. `page` 1'den başlar. */
export type ProductSearchPayload = {
  page: number;
  size: number;
  /** react-querybuilder ağacı (grid'in `onFilterChange` payload'undaki `filter`) */
  filter?: FilterGroup;
  searchText?: string;
  sort?: SortingTypes | null;
};

export type CategorySearchPayload = { page: number; size: number };

export type ProductInput = { name: string; price: number; categoryId: string };

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Eski `{ message, errors: [{ message }] }` zarfını ve Problem Details'i okur */
const errorMessage = (json: unknown): string | undefined => {
  if (!json || typeof json !== 'object') return undefined;
  const body = json as Partial<ApiResponse<unknown>> & ProblemDetails;
  const errors = Array.isArray(body.errors)
    ? body.errors.map((e) => e.message)
    : body.errors && typeof body.errors === 'object'
      ? Object.values(body.errors).flat()
      : [];
  return errors.filter(Boolean).join(', ') || body.message || body.detail || body.title;
};

const request = async <T, R extends ApiResponse<any> = ApiResponse<T>>(
  method: string,
  url: string,
  body?: unknown
): Promise<R> => {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as R | null;
  if (!response.ok || !json?.success) {
    throw new ApiError(errorMessage(json) || `${method} ${url} ${response.status}`, response.status);
  }
  return json;
};

/** Dosya indirir. Ad `Content-Disposition` başlığından alınır. */
const download = async (url: string, body: unknown, fallbackName: string) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new ApiError(errorMessage(json) || `POST ${url} ${response.status}`, response.status);
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  // UTF-8 adı (filename*) Türkçe karakterleri taşır, varsa o tercih edilir
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  const fileName = encoded ? decodeURIComponent(encoded) : (plain ?? fallbackName);
  const href = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(href);
};

export const api = {
  listProducts: (payload: ProductSearchPayload) =>
    request<ProductDto[], PagedResponse<ProductDto>>('POST', '/api/products', payload),
  listCategories: (payload: CategorySearchPayload) =>
    request<CategoryDto[], PagedResponse<CategoryDto>>('POST', '/api/categories', payload),
  /** Filtreye uyan tüm ürünleri backend Excel olarak üretir */
  exportProducts: (payload: Omit<ProductSearchPayload, 'page' | 'size'>) =>
    download('/api/products/export', payload, 'urunler.xlsx'),
  createProduct: (input: ProductInput) => request<ProductDto>('POST', '/api/products/create', input),
  updateProduct: (id: string, input: ProductInput) =>
    request<ProductDto>('PUT', `/api/products/update/${encodeURIComponent(id)}`, input),
  deleteProduct: (id: string) =>
    request<object>('DELETE', `/api/products/delete/${encodeURIComponent(id)}`),
};
