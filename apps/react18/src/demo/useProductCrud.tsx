import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import AddIcon from '@mui/icons-material/Add';
import type { ProductDto, ProductInput } from './api';
import { DeleteConfirmDialog, ProductFormDialog } from './ProductDialogs';
import { useCategories, useProductMutations } from './queries';

type ProductCrud = {
  openCreate: () => void;
  openEdit: (product: ProductDto) => void;
  openDelete: (product: ProductDto) => void;
};

const ProductCrudContext = createContext<ProductCrud | null>(null);

/**
 * Ekle / düzenle / sil modal'ları, silme onayı ve bildirimler uygulamada bir kez render edilir.
 * Sayfalar sadece `useProductCrud()` ile `openEdit` / `openDelete` / `openCreate` çağırır.
 */
export const ProductCrudProvider = ({
  log,
  children,
}: {
  log: (title: string, payload: unknown) => void;
  children: ReactNode;
}) => {
  const [form, setForm] = useState<{ product: ProductDto | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const categories = useCategories();
  const { create, update, remove } = useProductMutations();
  const editing = form?.product ?? null;
  const saving = editing ? update : create;

  const crud = useMemo<ProductCrud>(
    () => ({
      openCreate: () => setForm({ product: null }),
      openEdit: (product) => setForm({ product }),
      openDelete: (product) => setDeleteTarget(product),
    }),
    []
  );

  const closeForm = () => {
    setForm(null);
    create.reset();
    update.reset();
  };

  const handleSave = async (input: ProductInput) => {
    if (editing) {
      log('PUT /api/products/update/{id}', { id: editing.id, ...input });
      const result = await update.mutateAsync({ id: editing.id, input }).catch(() => null);
      if (!result) return;
      setToast(`“${result.data.name}” güncellendi`);
    } else {
      log('POST /api/products/create', input);
      const result = await create.mutateAsync(input).catch(() => null);
      if (!result) return;
      setToast(`“${result.data.name}” eklendi`);
    }
    closeForm();
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    remove.reset();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    log('DELETE /api/products/delete/{id}', { id: deleteTarget.id });
    if (!(await remove.mutateAsync([deleteTarget.id]).catch(() => null))) return;
    setToast(`“${deleteTarget.name}” silindi`);
    closeDelete();
  };

  return (
    <ProductCrudContext.Provider value={crud}>
      {children}
      <ProductFormDialog
        open={form !== null}
        product={editing}
        categories={categories.data ?? []}
        isSaving={saving.isPending}
        error={saving.error?.message}
        onClose={closeForm}
        onSave={handleSave}
      />
      <DeleteConfirmDialog
        products={deleteTarget ? [deleteTarget] : []}
        isDeleting={remove.isPending}
        error={remove.error?.message}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </ProductCrudContext.Provider>
  );
};

export const useProductCrud = () => {
  const crud = useContext(ProductCrudContext);
  if (!crud) throw new Error('useProductCrud, ProductCrudProvider içinde kullanılmalı');
  return crud;
};

export const CreateProductButton = () => {
  const { openCreate } = useProductCrud();
  return (
    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
      Yeni ürün
    </Button>
  );
};
