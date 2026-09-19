"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@repo/core/useForm";
import type { HttpError } from "@repo/core/dataProvider";
import { Button } from "@repo/ui/Button";
import { Input } from "@repo/ui/Input";
import { Select } from "@repo/ui/Select";
import { Checkbox } from "@repo/ui/Checkbox";
import { Badge } from "@repo/ui/Badge";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/form";
import { dataProvider } from "@/lib/dataProvider";
import type { MenuItem } from "@/lib/menu-items";

type MenuItemFormValues = {
  label: string;
  slug: string;
  order: number;
  isActive: boolean;
  parentId: string | null;
};

const EMPTY_PARENT = "";

export function MenuItemRow({
  item,
  depth,
  parentOptions,
}: {
  item: MenuItem;
  depth: number;
  parentOptions: { id: string; label: string; depth: number }[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm<MenuItemFormValues, MenuItem>({
    dataProvider,
    resource: "menu-items",
    action: "edit",
    id: item.id,
    defaultValues: {
      label: item.label,
      slug: item.slug,
      order: item.order,
      isActive: item.isActive,
      parentId: item.parentId,
    },
    onSuccess: () => {
      setIsEditing(false);
      router.refresh();
    },
  });

  const handleDelete = async () => {
    if (!confirm(`"${item.label}" menü öğesini silmek istediğine emin misin?`)) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await dataProvider.deleteOne({ resource: "menu-items", id: item.id });
      router.refresh();
    } catch (error) {
      setDeleteError((error as HttpError)?.message ?? "Beklenmeyen bir hata oluştu.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Kendisini kendi altına parent seçemesin diye kendisini seçim listesinden çıkarıyoruz.
  const selectableParents = parentOptions.filter((option) => option.id !== item.id);

  if (isEditing) {
    return (
      <li style={{ marginLeft: depth * 24 }}>
        <div className="rounded-md border border-primary/40 bg-secondary/40 p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(form.onFinish)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menü adı</FormLabel>
                      <Input {...field} autoFocus />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (URL)</FormLabel>
                      <Input {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Üst menü</FormLabel>
                      <Select
                        name={field.name}
                        ref={field.ref}
                        value={field.value ?? EMPTY_PARENT}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value={EMPTY_PARENT}>— Ana seviyede —</option>
                        {selectableParents.map((option) => (
                          <option key={option.id} value={option.id}>
                            {"    ".repeat(option.depth)}
                            {option.depth > 0 ? "↳ " : ""}
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sıra numarası</FormLabel>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex-row items-center gap-2">
                    <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} ref={field.ref} />
                    <FormLabel className="mb-0!">Menüde göster (aktif)</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={form.formLoading} size="sm">
                  {form.formLoading ? "Kaydediliyor..." : "Kaydet"}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-muted-foreground underline"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </Form>
        </div>
      </li>
    );
  }

  return (
    <li style={{ marginLeft: depth * 24 }}>
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm text-foreground">
        <div className="flex items-center gap-2">
          {depth > 0 && <span className="text-muted-foreground">↳</span>}
          <span className="font-medium">{item.label}</span>
          <span className="text-xs text-muted-foreground">/{item.slug}</span>
          {!item.isActive && <Badge variant="secondary">Pasif</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium text-muted-foreground underline"
          >
            Düzenle
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="text-xs font-medium text-destructive underline disabled:opacity-50"
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </div>
      {deleteError && <p className="mt-1 text-xs text-destructive">{deleteError}</p>}
    </li>
  );
}
