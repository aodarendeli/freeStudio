"use client";

import { useTranslations } from "next-intl";
import { useForm } from "@repo/core/useForm";
import { Button } from "@repo/ui/Button";
import { Input } from "@repo/ui/Input";
import { Form, FormField, FormItem, FormMessage } from "@repo/ui/form";
import { useRouter } from "@/i18n/navigation";
import { dataProvider } from "@/lib/dataProvider";
import { CategoryRow } from "@/components/CategoryRow";
import type { Category } from "@/lib/categories";

type CategoryFormValues = { name: string };

export function CategoryManager({
  categories,
  isAdmin,
}: {
  categories: Category[];
  isAdmin: boolean;
}) {
  const t = useTranslations("categories");
  const router = useRouter();

  const form = useForm<CategoryFormValues, Category>({
    dataProvider,
    resource: "categories",
    action: "create",
    defaultValues: { name: "" },
    onSuccess: () => {
      form.reset();
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} isAdmin={isAdmin} />
          ))}
        </ul>
      )}

      {isAdmin ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(form.onFinish)}
            className="flex flex-col gap-2 border-t border-border pt-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Input {...field} placeholder={t("addPlaceholder")} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formLoading}>
              {form.formLoading ? t("adding") : t("add")}
            </Button>
          </form>
        </Form>
      ) : (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">{t("adminRequired")}</p>
      )}
    </div>
  );
}
