using Backend.Application.Seo;
using Backend.Domain.Entities;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

public class SeoMetadataRepository(AppDbContext db) : ISeoMetadataRepository
{
    public async Task<SeoMetadata> AddAsync(SeoMetadata entry, CancellationToken ct = default)
    {
        db.SeoMetadataEntries.Add(entry);
        await db.SaveChangesAsync(ct);
        return entry;
    }

    public async Task<(IReadOnlyList<SeoMetadata> Items, int Total)> GetAllAsync(
        int page, int limit, string? projectKey, CancellationToken ct = default)
    {
        var query = db.SeoMetadataEntries.AsQueryable();
        if (!string.IsNullOrWhiteSpace(projectKey))
        {
            query = query.Where(s => s.ProjectKey == projectKey);
        }

        query = query.OrderByDescending(s => s.UpdatedAt);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * limit).Take(limit).ToListAsync(ct);
        return (items, total);
    }

    public Task<SeoMetadata?> GetByIdAsync(string id, CancellationToken ct = default) =>
        db.SeoMetadataEntries.FirstOrDefaultAsync(s => s.Id == id, ct);

    public Task<SeoMetadata?> GetBySlugAsync(string projectKey, string slug, CancellationToken ct = default) =>
        db.SeoMetadataEntries.FirstOrDefaultAsync(s => s.ProjectKey == projectKey && s.Slug == slug, ct);

    public async Task UpdateAsync(SeoMetadata entry, CancellationToken ct = default)
    {
        db.SeoMetadataEntries.Update(entry);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(SeoMetadata entry, CancellationToken ct = default)
    {
        db.SeoMetadataEntries.Remove(entry);
        await db.SaveChangesAsync(ct);
    }

    public Task<bool> ExistsBySlugAsync(string projectKey, string slug, string? excludeId = null, CancellationToken ct = default) =>
        db.SeoMetadataEntries.AnyAsync(s => s.ProjectKey == projectKey && s.Slug == slug && s.Id != excludeId, ct);
}
