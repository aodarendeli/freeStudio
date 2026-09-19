using Backend.Application.Common.Models;

namespace Backend.Application.Seo;

public interface ISeoMetadataService
{
    Task<SeoMetadataDto> CreateAsync(CreateSeoMetadataDto dto, CancellationToken ct = default);
    Task<(IReadOnlyList<SeoMetadataDto> Items, PaginationMeta Meta)> GetAllAsync(SeoQueryDto query, CancellationToken ct = default);
    Task<SeoMetadataDto> GetByIdAsync(string id, CancellationToken ct = default);
    Task<SeoMetadataDto> GetBySlugAsync(string projectKey, string slug, CancellationToken ct = default);
    Task<SeoMetadataDto> UpdateAsync(string id, UpdateSeoMetadataDto dto, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}
