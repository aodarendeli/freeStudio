"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@repo/core/useForm";
import { Button } from "@repo/ui/Button";
import { Input } from "@repo/ui/Input";
import { Select } from "@repo/ui/Select";
import { Textarea } from "@repo/ui/Textarea";
import { Checkbox } from "@repo/ui/Checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/Card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/form";
import { dataProvider } from "@/lib/dataProvider";
import { SeoRow } from "@/components/SeoRow";
import { flattenTree, type MenuItem } from "@/lib/menu-items";
import type { SeoMetadata } from "@/lib/seo";

type SeoFormValues = {
  projectKey: string;
  slug: string;
  title: string;
  description: string;
  ogImage: string;
  canonicalUrl: string;
  noIndex: boolean;
};

const EMPTY_SLUG = "";

export function SeoManager({
  entries,
  menuItems,
  projectKey,
}: {
  entries: SeoMetadata[];
  menuItems: MenuItem[];
  projectKey: string;
}) {
  const router = useRouter();
  const [pageSource, setPageSource] = useState<"menu" | "custom">("menu");

  const usedSlugs = useMemo(() => new Set(entries.map((e) => e.slug)), [entries]);
  const menuRows = useMemo(
    () => flattenTree(menuItems).filter(({ item }) => !usedSlugs.has(item.slug)),
    [menuItems, usedSlugs],
  );

  const form = useForm<SeoFormValues, SeoMetadata>({
    dataProvider,
    resource: "seo",
    action: "create",
    defaultValues: {
      projectKey,
      slug: "",
      title: "",
      description: "",
      ogImage: "",
      canonicalUrl: "",
      noIndex: false,
    },
    onSuccess: () => {
      form.reset();
      setPageSource("menu");
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Yeni SEO kaydı ekle</CardTitle>
          <CardDescription>
            Kaydı, mevcut bir menü sayfasına bağlayabilir veya menüde yer almayan bir sayfa (örn. bir
            blog yazısı) için slug&apos;ı kendin yazabilirsin. Başlık ve açıklama, arama sonuçlarında ve
            sosyal medya paylaşımlarında görünür.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(form.onFinish)} className="flex flex-col gap-4">
              <input type="hidden" {...form.register("projectKey")} />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">Bu SEO kaydı hangi sayfaya ait?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPageSource("menu");
                      form.setValue("slug", EMPTY_SLUG);
                    }}
                    className={
                      "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                      (pageSource === "menu"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-secondary")
                    }
                  >
                    Menüden bir sayfa seç
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPageSource("custom");
                      form.setValue("slug", EMPTY_SLUG);
                    }}
                    className={
                      "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                      (pageSource === "custom"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-secondary")
                    }
                  >
                    Menüde yok, slug&apos;ı elle yaz
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {pageSource === "menu" ? (
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sayfa (menü)</FormLabel>
                        {menuRows.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Bu projede SEO kaydı olmayan bir menü öğesi yok. &quot;Menü Yönetimi&quot;nden
                            yeni bir menü ekleyebilir veya slug&apos;ı elle yazabilirsin.
                          </p>
                        ) : (
                          <Select
                            name={field.name}
                            ref={field.ref}
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value={EMPTY_SLUG}>— Sayfa seç —</option>
                            {menuRows.map(({ item, depth }) => (
                              <option key={item.id} value={item.slug}>
                                {"    ".repeat(depth)}
                                {depth > 0 ? "↳ " : ""}
                                {item.label} (/{item.slug})
                              </option>
                            ))}
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug (sayfa yolu)</FormLabel>
                        <Input {...field} placeholder="blog/ilk-yazi" />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sayfa başlığı</FormLabel>
                      <Input {...field} placeholder="Hakkımızda" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama (meta description)</FormLabel>
                    <Textarea {...field} rows={3} placeholder="Arama sonuçlarında görünecek kısa açıklama" />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ogImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paylaşım görseli URL</FormLabel>
                      <Input {...field} placeholder="https://..." />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="canonicalUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canonical URL</FormLabel>
                      <Input {...field} placeholder="https://..." />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="noIndex"
                render={({ field }) => (
                  <FormItem className="flex-row items-center gap-2">
                    <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} ref={field.ref} />
                    <FormLabel className="mb-0!">Arama motorlarından gizle (noindex)</FormLabel>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formLoading} className="self-start">
                {form.formLoading ? "Ekleniyor..." : "Kaydı ekle"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO kayıtları</CardTitle>
          <CardDescription>Her sayfa için tanımlanmış meta bilgiler.</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz SEO kaydı yok. Yukarıdaki formdan ekleyebilirsin.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => (
                <SeoRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
