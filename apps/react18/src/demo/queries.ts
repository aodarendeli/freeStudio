import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ProductInput, type ProductSearchPayload } from './api';

export const productKeys = {
  all: ['products'] as const,
  list: (payload: ProductSearchPayload) => [...productKeys.all, 'list', payload] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
};

/** Sayfa değişirken önceki sayfa ekranda kalsın diye `keepPreviousData` */
export const useProductSearch = (payload: ProductSearchPayload) =>
  useQuery({
    queryKey: productKeys.list(payload),
    queryFn: () => api.listProducts(payload),
    placeholderData: keepPreviousData,
  });

export const useCategories = () =>
  useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => api.listCategories({ page: 1, size: 200 }),
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000,
  });

/** CRUD sonrası bütün ürün listeleri yeniden çekilir */
export const useProductMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: productKeys.all });

  const create = useMutation({
    mutationFn: (input: ProductInput) => api.createProduct(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) => api.updateProduct(id, input),
    onSuccess: invalidate,
  });
  /** Tek ya da çoklu silme; backend'de toplu silme olmadığı için her id ayrı istek */
  const remove = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => api.deleteProduct(id))),
    onSuccess: invalidate,
  });

  return { create, update, remove };
};
