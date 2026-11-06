using Backend.Application.Articles;
using Backend.Domain.Entities;
using Backend.Domain.Enums;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

public class ArticleRepository(AppDbContext db) : IArticleRepository
{
    public async Task<Article> AddAsync(Article article, CancellationToken ct = default)
    {
        db.Articles.Add(article);
        await db.SaveChangesAsync(ct);
        return article;
    }

    public async Task<(IReadOnlyList<Article> Items, int Total)> GetAllAsync(
        int page, int limit, ArticleStatus? status, string? search, CancellationToken ct = default)
    {
        var query = db.Articles.AsNoTracking();

        if (status is not null)
        {
            query = query.Where(a => a.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(a => EF.Functions.ILike(a.Title, pattern)
                || (a.Summary != null && EF.Functions.ILike(a.Summary, pattern)));
        }

        var total = await query.CountAsync(ct);

        var ordered = status == ArticleStatus.Published
            ? query.OrderByDescending(a => a.PublishedAt)
            : query.OrderByDescending(a => a.CreatedAt);

        var items = await ordered.Skip((page - 1) * limit).Take(limit).ToListAsync(ct);
        return (items, total);
    }

    public Task<Article?> GetByIdAsync(string id, CancellationToken ct = default) =>
        db.Articles.FirstOrDefaultAsync(a => a.Id == id, ct);

    public Task<Article?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        db.Articles.AsNoTracking().FirstOrDefaultAsync(a => a.Slug == slug, ct);

    public async Task UpdateAsync(Article article, CancellationToken ct = default)
    {
        db.Articles.Update(article);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Article article, CancellationToken ct = default)
    {
        db.Articles.Remove(article);
        await db.SaveChangesAsync(ct);
    }

    public Task<bool> ExistsBySlugAsync(string slug, string? excludeId = null, CancellationToken ct = default) =>
        db.Articles.AnyAsync(a => a.Slug == slug && a.Id != excludeId, ct);
}
