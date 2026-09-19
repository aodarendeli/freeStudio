import { getResourceList } from "@/lib/resource-actions";

export type MenuItem = {
  id: string;
  projectKey: string;
  label: string;
  slug: string;
  order: number;
  isActive: boolean;
  parentId: string | null;
  createdAt: string;
};

export async function getMenuItems(projectKey: string) {
  const result = await getResourceList<MenuItem>("menu-items", undefined, { projectKey });
  if (!result.ok) {
    throw result.error;
  }
  return result.data;
}

/** parentId'ye göre ağaç haline getirir, her düğüm kendi seviyesinde order'a göre sıralanır. */
export function buildMenuTree(items: MenuItem[]): (MenuItem & { children: MenuItem[] })[] {
  const byParent = new Map<string | null, MenuItem[]>();
  for (const item of items) {
    const key = item.parentId ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), item]);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order);
  }

  const attach = (item: MenuItem): MenuItem & { children: MenuItem[] } => ({
    ...item,
    children: (byParent.get(item.id) ?? []).map(attach),
  });

  return (byParent.get(null) ?? []).map(attach);
}

/** Ağacı, hiyerarşik sırada ve her düğümün derinliğiyle birlikte düz bir listeye çevirir (satır satır görüntülemek için). */
export function flattenTree(items: MenuItem[]): { item: MenuItem; depth: number }[] {
  const tree = buildMenuTree(items);
  const result: { item: MenuItem; depth: number }[] = [];

  const walk = (nodes: (MenuItem & { children: MenuItem[] })[], depth: number) => {
    for (const node of nodes) {
      const { children, ...item } = node;
      result.push({ item, depth });
      walk(children as (MenuItem & { children: MenuItem[] })[], depth + 1);
    }
  };

  walk(tree, 0);
  return result;
}

/** Parent seçim listesi için ağacı girintili düz listeye çevirir. */
export function flattenForSelect(items: MenuItem[]): { id: string; label: string; depth: number }[] {
  const tree = buildMenuTree(items);
  const result: { id: string; label: string; depth: number }[] = [];

  const walk = (nodes: (MenuItem & { children: MenuItem[] })[], depth: number) => {
    for (const node of nodes) {
      result.push({ id: node.id, label: node.label, depth });
      walk(node.children as (MenuItem & { children: MenuItem[] })[], depth + 1);
    }
  };

  walk(tree, 0);
  return result;
}
