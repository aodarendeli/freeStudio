/**
 * "Gelişmiş filtre" penceresi: VKFilterBuilder ile VE / VEYA / DEĞİL ve iç içe gruplar.
 * Her açılışta uygulanmış filtreyle başlar; "Uygula" / "Temizle" grid'e bildirir ve pencereyi kapatır.
 */
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { VKFilterBuilder } from '../../VKFilterBuilder/VKFilterBuilder';
import { createEmptyFilter } from '../../VKFilterBuilder/tree';
import type { FilterGroup, VKFilterField } from '../../VKFilterBuilder/VKFilterBuilder.types';

type AdvancedFilterDialogProps = {
  open: boolean;
  title: string;
  fields: VKFilterField[];
  value: FilterGroup | null;
  onApply: (tree: FilterGroup) => void;
  onClose: () => void;
};

export const AdvancedFilterDialog = ({ open, title, fields, value, onApply, onClose }: AdvancedFilterDialogProps) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="vk-advanced-filter-title">
    <DialogTitle id="vk-advanced-filter-title" sx={{ pr: 6 }}>
      {title}
      <IconButton aria-label="Kapat" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent dividers>
      {/* Kapalıyken içerik bağlanmaz: her açılışta uygulanmış filtreyle yeniden kurulur, yarım düzenleme kalmaz */}
      {open && (
        <VKFilterBuilder
          fields={fields}
          defaultValue={value ?? createEmptyFilter()}
          onApply={(tree) => {
            onApply(tree);
            onClose();
          }}
        />
      )}
    </DialogContent>
  </Dialog>
);
