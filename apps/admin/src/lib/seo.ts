import { getResourceList } from "@/lib/resource-actions";

export type SeoMetadata = {
  id: string;
  projectKey: string;
  slug: string;
  title: string;
  description: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: string;
};

export async function getSeoMetadataList(projectKey: string) {
  const result = await getResourceList<SeoMetadata>("seo", { page: 1, limit: 100 }, { projectKey });
  if (!result.ok) {
    throw result.error;
  }
  return result.data;
}
