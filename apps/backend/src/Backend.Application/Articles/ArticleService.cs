using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Common.Text;
using Backend.Domain.Entities;
using Backend.Domain.Enums;
using Microsoft.Extensions.Caching.Hybrid;

namespace Backend.Application.Articles;

public class ArticleService(IArticleRepository repository, HybridCache cache) : IArticleService
{
    public async Task<ArticleDto> CreateAsync(CreateArticleDto dto, CancellationToken ct = default)
    {
        string slug;
        if (dto.Slug is not null)
        {
            if (await repository.ExistsBySlugAsync(dto.Slug, ct: ct))
            {
                throw new BadRequestException("Slug already exists");
            }

            slug = dto.Slug;
        }
        else
        {
            slug = await GenerateUniqueSlugAsync(dto.Title, ct);
        }

        var article = new Article
        {
            Title = dto.Title,
            Slug = slug,
            Summary = dto.Summary,
            Content = dto.Content,
        };

        var created = await repository.AddAsync(article, ct);
        await cache.RemoveByTagAsync(ArticleCacheKeys.Tag, ct);
        return ToDto(created);
    }

    public async Task<(IReadOnlyList<ArticleListItemDto> Items, PaginationMeta Meta)> GetAllAsync(
        ArticleQueryDto query, CancellationToken ct = default)
    {
        // Sadece herkese açık (Published, aramasız) liste cache'lenir; admin ve arama sorguları her zaman DB'ye gider.
        var cacheable = query.Status == ArticleStatus.Published && string.IsNullOrWhiteSpace(query.Search);

        var result = cacheable
            ? await cache.GetOrCreateAsync(
                ArticleCacheKeys.PublishedList(query.Page, query.Limit),
                token => LoadPageAsync(query, token),
                ArticleCacheKeys.Options,
                ArticleCacheKeys.Tags,
                ct)
            : await LoadPageAsync(query, ct);

        var meta = new PaginationMeta(
            result.Total, query.Page, query.Limit, (int)Math.Ceiling(result.Total / (double)query.Limit));

        return (result.Items, meta);
    }

    private async ValueTask<ArticleListPage> LoadPageAsync(ArticleQueryDto query, CancellationToken ct)
    {
        var (items, total) = await repository.GetAllAsync(query.Page, query.Limit, query.Status, query.Search, ct);
        return new ArticleListPage(items.Select(ToListItemDto).ToList(), total);
    }

    public async Task<ArticleDto> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var article = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Article not found");

        return ToDto(article);
    }

    public async Task<ArticleDto> GetPublishedBySlugAsync(string slug, CancellationToken ct = default)
    {
        var article = await cache.GetOrCreateAsync(
            ArticleCacheKeys.PublishedBySlug(slug),
            async token =>
            {
                var entity = await repository.GetBySlugAsync(slug, token);
                return entity is { Status: ArticleStatus.Published } ? ToDto(entity) : null;
            },
            ArticleCacheKeys.Options,
            ArticleCacheKeys.Tags,
            ct);

        return article ?? throw new NotFoundAppException("Article not found");
    }

    public async Task<ArticleDto> UpdateAsync(string id, UpdateArticleDto dto, CancellationToken ct = default)
    {
        var article = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Article not found");

        if (await repository.ExistsBySlugAsync(dto.Slug, id, ct))
        {
            throw new BadRequestException("Slug already exists");
        }

        article.Title = dto.Title;
        article.Slug = dto.Slug;
        article.Summary = dto.Summary;
        article.Content = dto.Content;
        article.PublishedAt = dto.Status switch
        {
            ArticleStatus.Published => article.PublishedAt ?? DateTime.UtcNow,
            ArticleStatus.Draft => null,
            _ => article.PublishedAt,
        };
        article.Status = dto.Status;
        article.UpdatedAt = DateTime.UtcNow;

        await repository.UpdateAsync(article, ct);
        await cache.RemoveByTagAsync(ArticleCacheKeys.Tag, ct);
        return ToDto(article);
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        var article = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Article not found");

        await repository.DeleteAsync(article, ct);
        await cache.RemoveByTagAsync(ArticleCacheKeys.Tag, ct);
    }

    private async Task<string> GenerateUniqueSlugAsync(string title, CancellationToken ct)
    {
        var baseSlug = SlugGenerator.Generate(title);
        if (baseSlug.Length == 0)
        {
            baseSlug = "article";
        }

        var slug = baseSlug;
        var suffix = 2;
        while (await repository.ExistsBySlugAsync(slug, ct: ct))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }

    private static ArticleDto ToDto(Article a) =>
        new(a.Id, a.Title, a.Slug, a.Summary, a.Content, a.Status, a.PublishedAt, a.CreatedAt, a.UpdatedAt);

    private static ArticleListItemDto ToListItemDto(Article a) =>
        new(a.Id, a.Title, a.Slug, a.Summary, a.Status, a.PublishedAt, a.CreatedAt);
}
