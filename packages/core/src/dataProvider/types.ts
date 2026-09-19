/**
 * refine.dev'in DataProvider mimarisinden esinlenildi (bkz. @refinedev/core).
 * Farkı: React Query yerine Next.js Server Actions üstüne kuruluyor, kendi
 * backend'imizin ApiResponse<T> şekline göre adapte ediliyor.
 */

export type HttpError = {
  message: string;
  statusCode?: number;
  /** Backend validasyon hatalarını alan adına göre eşler (örn. { name: "Kategori adı gerekli." }) */
  errors?: Record<string, string | string[]>;
};

export type Pagination = {
  page?: number;
  limit?: number;
};

export type GetListParams = {
  resource: string;
  pagination?: Pagination;
  /** Sorguya query string olarak eklenecek ek filtreler (örn. { projectKey: "client" }) */
  filters?: Record<string, string>;
};

export type GetListResponse<T> = {
  data: T[];
  total: number;
};

export type GetOneParams = {
  resource: string;
  id: string;
};

export type GetOneResponse<T> = {
  data: T;
};

export type CreateParams<TVariables> = {
  resource: string;
  variables: TVariables;
};

export type CreateResponse<T> = {
  data: T;
};

export type UpdateParams<TVariables> = {
  resource: string;
  id: string;
  variables: TVariables;
};

export type UpdateResponse<T> = {
  data: T;
};

export type DeleteOneParams = {
  resource: string;
  id: string;
};

export type DeleteOneResponse<T> = {
  data: T;
};

/**
 * Herhangi bir kaynağı (categories, products, ...) aynı arayüzle CRUD'lamak için.
 * apps/client bunu kendi backend'ine göre bir kere implemente eder,
 * useForm/useTable gibi hook'lar bu arayüze göre çalışır.
 */
export type DataProvider = {
  getList: <T = unknown>(params: GetListParams) => Promise<GetListResponse<T>>;
  getOne: <T = unknown>(params: GetOneParams) => Promise<GetOneResponse<T>>;
  create: <T = unknown, TVariables = unknown>(
    params: CreateParams<TVariables>,
  ) => Promise<CreateResponse<T>>;
  update: <T = unknown, TVariables = unknown>(
    params: UpdateParams<TVariables>,
  ) => Promise<UpdateResponse<T>>;
  deleteOne: <T = unknown>(params: DeleteOneParams) => Promise<DeleteOneResponse<T>>;
};
