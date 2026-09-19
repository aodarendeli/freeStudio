import { auth } from "@/auth";
import { AdminShell } from "@/components/AdminShell";
import { SeoManager } from "@/components/SeoManager";
import { getSeoMetadataList } from "@/lib/seo";
import { getMenuItems } from "@/lib/menu-items";
import { resolveProjectKey } from "@/lib/projects";

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const projectKey = resolveProjectKey((await searchParams).project);
  const [{ data: entries }, { data: menuItems }] = await Promise.all([
    getSeoMetadataList(projectKey),
    getMenuItems(projectKey),
  ]);

  return (
    <AdminShell
      active="seo"
      currentProject={projectKey}
      title="SEO Yönetimi"
      description="Sayfa başlıkları, açıklamaları ve paylaşım görsellerini buradan yönet."
      userLabel={session?.user?.name ?? session?.user?.email ?? ""}
    >
      <SeoManager entries={entries} menuItems={menuItems} projectKey={projectKey} />
    </AdminShell>
  );
}
