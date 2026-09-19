using Backend.Domain.Entities;

namespace Backend.Application.Seo;

public interface ISeoMetadataRepository
{
    Task<SeoMetadata> AddAsync(SeoMetadata entry, CancellationToken ct = default);
    Task<(IReadOnlyList<SeoMetadata> Items, int Total)> GetAllAsync(
        int page, int limit, string? projectKey, CancellationToken ct = default);
    Task<SeoMetadata?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<SeoMetadata?> GetBySlugAsync(string projectKey, string slug, CancellationToken ct = default);
    Task UpdateAsync(SeoMetadata entry, CancellationToken ct = default);
    Task DeleteAsync(SeoMetadata entry, CancellationToken ct = default);
    Task<bool> ExistsBySlugAsync(string projectKey, string slug, string? excludeId = null, CancellationToken ct = default);
}
