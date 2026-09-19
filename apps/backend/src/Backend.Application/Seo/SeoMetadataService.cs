using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Domain.Entities;

namespace Backend.Application.Seo;

public class SeoMetadataService(ISeoMetadataRepository repository) : ISeoMetadataService
{
    public async Task<SeoMetadataDto> CreateAsync(CreateSeoMetadataDto dto, CancellationToken ct = default)
    {
        if (await repository.ExistsBySlugAsync(dto.ProjectKey, dto.Slug, ct: ct))
        {
            throw new BadRequestException("SEO entry for this slug already exists");
        }

        var entry = new SeoMetadata
        {
            ProjectKey = dto.ProjectKey,
            Slug = dto.Slug,
            Title = dto.Title,
            Description = dto.Description,
            OgImage = dto.OgImage,
            CanonicalUrl = dto.CanonicalUrl,
            NoIndex = dto.NoIndex,
        };

        var created = await repository.AddAsync(entry, ct);
        return ToDto(created);
    }

    public async Task<(IReadOnlyList<SeoMetadataDto> Items, PaginationMeta Meta)> GetAllAsync(
        SeoQueryDto query, CancellationToken ct = default)
    {
        var (items, total) = await repository.GetAllAsync(query.Page, query.Limit, query.ProjectKey, ct);
        var meta = new PaginationMeta(total, query.Page, query.Limit, (int)Math.Ceiling(total / (double)query.Limit));

        return (items.Select(ToDto).ToList(), meta);
    }

    public async Task<SeoMetadataDto> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var entry = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("SEO entry not found");

        return ToDto(entry);
    }

    public async Task<SeoMetadataDto> GetBySlugAsync(string projectKey, string slug, CancellationToken ct = default)
    {
        var entry = await repository.GetBySlugAsync(projectKey, slug, ct)
            ?? throw new NotFoundAppException("SEO entry not found");

        return ToDto(entry);
    }

    public async Task<SeoMetadataDto> UpdateAsync(string id, UpdateSeoMetadataDto dto, CancellationToken ct = default)
    {
        var entry = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("SEO entry not found");

        entry.Title = dto.Title;
        entry.Description = dto.Description;
        entry.OgImage = dto.OgImage;
        entry.CanonicalUrl = dto.CanonicalUrl;
        entry.NoIndex = dto.NoIndex;
        entry.UpdatedAt = DateTime.UtcNow;

        await repository.UpdateAsync(entry, ct);
        return ToDto(entry);
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        var entry = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("SEO entry not found");

        await repository.DeleteAsync(entry, ct);
    }

    private static SeoMetadataDto ToDto(SeoMetadata s) =>
        new(s.Id, s.ProjectKey, s.Slug, s.Title, s.Description, s.OgImage, s.CanonicalUrl, s.NoIndex, s.UpdatedAt);
}
