"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@repo/core/useForm";
import { Button } from "@repo/ui/Button";
import { Input } from "@repo/ui/Input";
import { Select } from "@repo/ui/Select";
import { Checkbox } from "@repo/ui/Checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/Card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/form";
import { dataProvider } from "@/lib/dataProvider";
import { MenuItemRow } from "@/components/MenuItemRow";
import { flattenForSelect, flattenTree, type MenuItem } from "@/lib/menu-items";

type MenuItemFormValues = {
  projectKey: string;
  label: string;
  slug: string;
  order: number;
  isActive: boolean;
  parentId: string | null;
};

const EMPTY_PARENT = "";

export function MenuItemManager({ items, projectKey }: { items: MenuItem[]; projectKey: string }) {
  const router = useRouter();
  const parentOptions = flattenForSelect(items);
  const rows = flattenTree(items);

  const form = useForm<MenuItemFormValues, MenuItem>({
    dataProvider,
    resource: "menu-items",
    action: "create",
    defaultValues: { projectKey, label: "", slug: "", order: 0, isActive: true, parentId: null },
    onSuccess: () => {
      form.reset();
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Yeni menü ekle</CardTitle>
          <CardDescription>
            Etiket, ziyaretçiye görünen isimdir; slug ise URL&apos;de kullanılacak değerdir (örn.
            &quot;hakkimizda&quot;). Bir üst menü seçersen bu öğe onun alt menüsü olur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(form.onFinish)} className="flex flex-col gap-4">
              <input type="hidden" {...form.register("projectKey")} />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menü adı</FormLabel>
                      <Input {...field} placeholder="Ana Sayfa" />
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
                      <Input {...field} placeholder="ana-sayfa" />
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
                        <option value={EMPTY_PARENT}>— Ana seviyede oluştur —</option>
                        {parentOptions.map((option) => (
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
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
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
                    <Checkbox
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      ref={field.ref}
                    />
                    <FormLabel className="mb-0!">Menüde göster (aktif)</FormLabel>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formLoading} className="self-start">
                {form.formLoading ? "Ekleniyor..." : "Menüyü ekle"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menü listesi</CardTitle>
          <CardDescription>Alt menüler, bağlı oldukları üst menünün altında girintili gösterilir.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz menü öğesi yok. Yukarıdaki formdan ekleyebilirsin.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map(({ item, depth }) => (
                <MenuItemRow key={item.id} item={item} depth={depth} parentOptions={parentOptions} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
