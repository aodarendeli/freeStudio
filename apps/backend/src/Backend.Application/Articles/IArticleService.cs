using Backend.Application.Common.Models;

namespace Backend.Application.Articles;

public interface IArticleService
{
    Task<ArticleDto> CreateAsync(CreateArticleDto dto, CancellationToken ct = default);
    Task<(IReadOnlyList<ArticleListItemDto> Items, PaginationMeta Meta)> GetAllAsync(ArticleQueryDto query, CancellationToken ct = default);
    Task<ArticleDto> GetByIdAsync(string id, CancellationToken ct = default);
    Task<ArticleDto> GetPublishedBySlugAsync(string slug, CancellationToken ct = default);
    Task<ArticleDto> UpdateAsync(string id, UpdateArticleDto dto, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}
