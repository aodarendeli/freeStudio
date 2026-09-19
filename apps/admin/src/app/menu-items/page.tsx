import { auth } from "@/auth";
import { AdminShell } from "@/components/AdminShell";
import { MenuItemManager } from "@/components/MenuItemManager";
import { getMenuItems } from "@/lib/menu-items";
import { resolveProjectKey } from "@/lib/projects";

export default async function MenuItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const projectKey = resolveProjectKey((await searchParams).project);
  const { data: items } = await getMenuItems(projectKey);

  return (
    <AdminShell
      active="menu-items"
      currentProject={projectKey}
      title="Menü Yönetimi"
      description="Site navigasyonunda görünecek menüleri ve sıralarını buradan yönet."
      userLabel={session?.user?.name ?? session?.user?.email ?? ""}
    >
      <MenuItemManager items={items} projectKey={projectKey} />
    </AdminShell>
  );
}
