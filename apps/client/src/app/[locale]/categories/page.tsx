import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getCategories } from "@/lib/categories";
import { Link } from "@/i18n/navigation";
import { CategoryManager } from "@/components/CategoryManager";

export default async function CategoriesPage() {
  const session = await auth();
  const isAdmin = session?.roles.includes("admin") ?? false;

  const { data: categories } = await getCategories();
  const t = await getTranslations("categories");
  const tCommon = await getTranslations("common");

  return (
    <div className="min-h-screen bg-background px-4 py-16 font-sans">
      <div className="mx-auto flex max-w-sm flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
          <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
            {tCommon("home")}
          </Link>
        </div>

        <CategoryManager categories={categories} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
