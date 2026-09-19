import { apiFetch } from "@/lib/api";

export type Category = {
  id: string;
  name: string;
  createdAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

// Public — token gerektirmez, backend'de [AllowAnonymous]. İlk sayfa yüklemesi için.
// Create/update/delete artık @repo/core'un genel DataProvider'ı üzerinden yapılıyor (bkz. lib/dataProvider.ts).
export function getCategories() {
  return apiFetch<ApiResponse<Category[]>>("/api/categories");
}
