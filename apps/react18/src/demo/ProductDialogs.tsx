import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import type { CategoryDto, ProductDto, ProductInput } from './api';

type ProductFormDialogProps = {
  open: boolean;
  /** Verilirse düzenleme, verilmezse yeni kayıt */
  product?: ProductDto | null;
  categories: CategoryDto[];
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (input: ProductInput) => void;
};

/** Ekleme / düzenleme modal'ı. Grid'in parçası değil, kullanan projenin formu. */
export const ProductFormDialog = (props: ProductFormDialogProps) =>
  props.open ? <ProductForm {...props} /> : null;

const ProductForm = ({ product, categories, isSaving, error, onClose, onSave }: ProductFormDialogProps) => {
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const parsedPrice = Number(price.replace(',', '.'));
  const isValid = name.trim() !== '' && categoryId !== '' && price !== '' && Number.isFinite(parsedPrice);

  return (
    <Dialog open onClose={isSaving ? undefined : onClose} fullWidth maxWidth="xs">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isValid) onSave({ name: name.trim(), categoryId, price: parsedPrice });
        }}
      >
        <DialogTitle>{product ? 'Ürünü düzenle' : 'Yeni ürün'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Ürün adı" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            <TextField select label="Kategori" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Fiyat"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              slotProps={{
                htmlInput: { inputMode: 'decimal' },
                input: { endAdornment: <InputAdornment position="end">₺</InputAdornment> },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSaving}>
            Vazgeç
          </Button>
          <Button type="submit" variant="contained" disabled={!isValid || isSaving}>
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

type DeleteConfirmDialogProps = {
  /** Silinecek ürünler; boşsa modal kapalı */
  products: ProductDto[];
  isDeleting: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

/** "Emin misiniz?" onayı: Evet / Hayır */
export const DeleteConfirmDialog = ({ products, isDeleting, error, onClose, onConfirm }: DeleteConfirmDialogProps) => (
  <Dialog open={products.length > 0} onClose={isDeleting ? undefined : onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WarningAmberRoundedIcon color="error" />
      Silmek istediğinize emin misiniz?
    </DialogTitle>
    <DialogContent>
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <DialogContentText>
          {products.length === 1
            ? `“${products[0].name}” kalıcı olarak silinecek.`
            : `Seçili ${products.length} ürün kalıcı olarak silinecek.`}{' '}
          Bu işlem geri alınamaz.
        </DialogContentText>
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} disabled={isDeleting} autoFocus>
        Hayır
      </Button>
      <Button color="error" variant="contained" onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? 'Siliniyor...' : 'Evet, sil'}
      </Button>
    </DialogActions>
  </Dialog>
);
