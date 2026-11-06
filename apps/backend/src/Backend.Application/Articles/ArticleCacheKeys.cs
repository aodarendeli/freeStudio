using Microsoft.Extensions.Caching.Hybrid;

namespace Backend.Application.Articles;

internal static class ArticleCacheKeys
{
    public const string Tag = "articles";

    public static readonly string[] Tags = [Tag];

    // L1 (RAM) kısa tutulur: diğer instance'lardaki invalidation en geç bu süre sonra yansır.
    public static readonly HybridCacheEntryOptions Options = new()
    {
        Expiration = TimeSpan.FromMinutes(10),
        LocalCacheExpiration = TimeSpan.FromMinutes(1),
    };

    public static string PublishedList(int page, int limit) => $"articles:published:list:{page}:{limit}";

    public static string PublishedBySlug(string slug) => $"articles:published:slug:{slug}";
}

internal record ArticleListPage(IReadOnlyList<ArticleListItemDto> Items, int Total);
