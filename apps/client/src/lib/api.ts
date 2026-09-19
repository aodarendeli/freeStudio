import { auth } from "@/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5108";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Backend'in ErrorItem[] listesinden derlenen alan -> mesaj haritası */
    public errors?: Record<string, string>,
  ) {
    super(message);
  }
}

type ApiFetchOptions = RequestInit & {
  /** true ise Authorization: Bearer header'ı zorunlu eklenir, token yoksa istek hiç atılmaz. */
  auth?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth: requiresAuth = false, headers: incomingHeaders, ...rest } = options;

  const headers = new Headers(incomingHeaders);
  headers.set("Content-Type", "application/json");

  if (requiresAuth) {
    const session = await auth();
    if (session?.error) {
      throw new ApiError(401, "Oturumun süresi doldu, lütfen tekrar giriş yap.");
    }
    if (!session?.accessToken) {
      throw new ApiError(401, "Bu işlem için giriş yapmalısın.");
    }
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers, cache: "no-store" });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      errors?: { field?: string | null; message: string }[] | null;
    } | null;

    const fieldErrors = body?.errors?.reduce<Record<string, string>>((acc, e) => {
      if (e.field) {
        acc[e.field] = e.message;
      }
      return acc;
    }, {});

    throw new ApiError(
      res.status,
      body?.message ?? `İstek başarısız: ${res.status}`,
      fieldErrors && Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    );
  }

  return res.json() as Promise<T>;
}
