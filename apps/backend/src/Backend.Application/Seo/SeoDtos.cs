namespace Backend.Application.Seo;

public record SeoMetadataDto(
    string Id,
    string ProjectKey,
    string Slug,
    string Title,
    string? Description,
    string? OgImage,
    string? CanonicalUrl,
    bool NoIndex,
    DateTime UpdatedAt);

public record CreateSeoMetadataDto(
    string ProjectKey,
    string Slug,
    string Title,
    string? Description,
    string? OgImage,
    string? CanonicalUrl,
    bool NoIndex);

public record UpdateSeoMetadataDto(
    string Title,
    string? Description,
    string? OgImage,
    string? CanonicalUrl,
    bool NoIndex);

public record SeoQueryDto(int Page = 1, int Limit = 20, string? ProjectKey = null);
