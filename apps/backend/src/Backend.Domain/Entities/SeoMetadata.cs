namespace Backend.Domain.Entities;

public class SeoMetadata
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    /// <summary>Bu kaydın ait olduğu frontend projesi (örn. "client", "admin-blog"). Aynı backend'i birden fazla frontend kullandığında verilerin karışmasını önler.</summary>
    public string ProjectKey { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? OgImage { get; set; }
    public string? CanonicalUrl { get; set; }
    public bool NoIndex { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
