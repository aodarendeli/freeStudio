import type { DataProvider } from "@repo/core/dataProvider";
import {
  createResource,
  deleteResource,
  getResourceList,
  getResourceOne,
  updateResource,
  type ActionResult,
} from "@/lib/resource-actions";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw result.error;
  }
  return result.data;
}

/**
 * @repo/core'un DataProvider arayüzünü backend'imize (ASP.NET Core, /api/{resource})
 * bağlayan tek implementasyon. Yeni bir kaynak eklediğinde burada hiçbir değişiklik
 * gerekmiyor — sadece resource ismini (örn. "menu-items", "seo") verirsin.
 */
export const dataProvider: DataProvider = {
  async getList(params) {
    return unwrap(await getResourceList(params.resource, params.pagination, params.filters));
  },
  async getOne(params) {
    return unwrap(await getResourceOne(params.resource, params.id));
  },
  async create(params) {
    return unwrap(await createResource(params.resource, params.variables));
  },
  async update(params) {
    return unwrap(await updateResource(params.resource, params.id, params.variables));
  },
  async deleteOne(params) {
    return unwrap(await deleteResource(params.resource, params.id));
  },
};
