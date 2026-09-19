/**
 * Bu backend'i tüketen frontend projelerin sabit listesi. Yarın React ile ayrı bir
 * proje eklenirse (veya aynı Next.js altında ikinci bir site açılırsa) buraya bir
 * satır eklemek yeterli — menü/SEO verileri projectKey ile birbirinden ayrışıyor.
 */
export const PROJECTS = [{ key: "client", label: "Ana Site (Next.js)" }] as const;

export type ProjectKey = (typeof PROJECTS)[number]["key"];

export const DEFAULT_PROJECT_KEY: ProjectKey = PROJECTS[0].key;

export function isKnownProjectKey(value: string | undefined): value is ProjectKey {
  return PROJECTS.some((p) => p.key === value);
}

export function resolveProjectKey(value: string | string[] | undefined): ProjectKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isKnownProjectKey(candidate) ? candidate : DEFAULT_PROJECT_KEY;
}
