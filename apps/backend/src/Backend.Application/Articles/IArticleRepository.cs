using Backend.Domain.Entities;
using Backend.Domain.Enums;

namespace Backend.Application.Articles;

public interface IArticleRepository
{
    Task<Article> AddAsync(Article article, CancellationToken ct = default);
    Task<(IReadOnlyList<Article> Items, int Total)> GetAllAsync(
        int page, int limit, ArticleStatus? status, string? search, CancellationToken ct = default);
    Task<Article?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Article?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task UpdateAsync(Article article, CancellationToken ct = default);
    Task DeleteAsync(Article article, CancellationToken ct = default);
    Task<bool> ExistsBySlugAsync(string slug, string? excludeId = null, CancellationToken ct = default);
}
