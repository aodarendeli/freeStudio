"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "@repo/core/useForm";
import type { HttpError } from "@repo/core/dataProvider";
import { Button } from "@repo/ui/Button";
import { Input } from "@repo/ui/Input";
import { Form, FormField, FormItem, FormMessage } from "@repo/ui/form";
import { useRouter } from "@/i18n/navigation";
import { dataProvider } from "@/lib/dataProvider";
import type { Category } from "@/lib/categories";

type CategoryFormValues = { name: string };

export function CategoryRow({ category, isAdmin }: { category: Category; isAdmin: boolean }) {
  const t = useTranslations("categories");
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm<CategoryFormValues, Category>({
    dataProvider,
    resource: "categories",
    action: "edit",
    id: category.id,
    defaultValues: { name: category.name },
    onSuccess: () => {
      setIsEditing(false);
      router.refresh();
    },
  });

  const handleDelete = async () => {
    if (!confirm(t("confirmDelete", { name: category.name }))) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await dataProvider.deleteOne({ resource: "categories", id: category.id });
      router.refresh();
    } catch (error) {
      setDeleteError((error as HttpError)?.message ?? "Beklenmeyen bir hata oluştu.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <li className="rounded-md border border-border px-3 py-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(form.onFinish)} className="flex items-start gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <Input {...field} autoFocus />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={form.formLoading} size="sm">
                {form.formLoading ? t("saving") : t("save")}
              </Button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-muted-foreground underline"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </Form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-foreground">
      <span>{category.name}</span>
      {isAdmin && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium text-muted-foreground underline"
          >
            {t("edit")}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="text-xs font-medium text-destructive underline disabled:opacity-50"
          >
            {isDeleting ? t("deleting") : t("delete")}
          </button>
        </div>
      )}
      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
    </li>
  );
}
