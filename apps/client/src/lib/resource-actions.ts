"use server";

/**
 * Tek bir yerde tanımlı, herhangi bir backend kaynağı (categories, products, ...)
 * için çalışan genel CRUD server action'ları. apiFetch server-only olduğu
 * (auth() kullandığı) için bunlar da server action — token tarayıcıya hiç gitmiyor.
 *
 * Next.js server action'ları throw edilen Error'ların özel alanlarını (errors, status)
 * istemciye taşımıyor — sadece genel bir mesaj geçiyor. Bu yüzden throw etmek yerine
 * ayrıştırılabilir bir sonuç objesi döndürüyoruz; asıl throw işini istemci tarafında
 * (dataProvider.ts) yapıyoruz.
 */
import { apiFetch, ApiError } from "@/lib/api";
import type { HttpError } from "@repo/core/dataProvider";
import type { PaginationMeta } from "@/lib/types";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: HttpError };

function toHttpError(error: unknown): HttpError {
  if (error instanceof ApiError) {
    return { message: error.message, statusCode: error.status, errors: error.errors };
  }
  return { message: "Beklenmeyen bir hata oluştu." };
}

export async function getResourceList<T>(
  resource: string,
  pagination?: { page?: number; limit?: number },
): Promise<ActionResult<{ data: T[]; total: number }>> {
  try {
    const query = new URLSearchParams();
    if (pagination?.page) query.set("page", String(pagination.page));
    if (pagination?.limit) query.set("limit", String(pagination.limit));
    const qs = query.toString();

    const response = await apiFetch<ApiResponse<T[]>>(`/api/${resource}${qs ? `?${qs}` : ""}`);
    return { ok: true, data: { data: response.data, total: response.meta?.total ?? response.data.length } };
  } catch (error) {
    return { ok: false, error: toHttpError(error) };
  }
}

export async function getResourceOne<T>(resource: string, id: string): Promise<ActionResult<{ data: T }>> {
  try {
    const response = await apiFetch<ApiResponse<T>>(`/api/${resource}/${id}`);
    return { ok: true, data: { data: response.data } };
  } catch (error) {
    return { ok: false, error: toHttpError(error) };
  }
}

export async function createResource<T>(
  resource: string,
  variables: unknown,
): Promise<ActionResult<{ data: T }>> {
  try {
    const response = await apiFetch<ApiResponse<T>>(`/api/${resource}`, {
      method: "POST",
      body: JSON.stringify(variables),
      auth: true,
    });
    return { ok: true, data: { data: response.data } };
  } catch (error) {
    return { ok: false, error: toHttpError(error) };
  }
}

export async function updateResource<T>(
  resource: string,
  id: string,
  variables: unknown,
): Promise<ActionResult<{ data: T }>> {
  try {
    const response = await apiFetch<ApiResponse<T>>(`/api/${resource}/${id}`, {
      method: "PUT",
      body: JSON.stringify(variables),
      auth: true,
    });
    return { ok: true, data: { data: response.data } };
  } catch (error) {
    return { ok: false, error: toHttpError(error) };
  }
}

export async function deleteResource<T>(resource: string, id: string): Promise<ActionResult<{ data: T }>> {
  try {
    const response = await apiFetch<ApiResponse<T>>(`/api/${resource}/${id}`, {
      method: "DELETE",
      auth: true,
    });
    return { ok: true, data: { data: response.data } };
  } catch (error) {
    return { ok: false, error: toHttpError(error) };
  }
}
