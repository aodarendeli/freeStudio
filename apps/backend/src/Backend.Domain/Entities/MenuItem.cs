namespace Backend.Domain.Entities;

public class MenuItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    /// <summary>Bu kaydın ait olduğu frontend projesi (örn. "client", "admin-blog"). Aynı backend'i birden fazla frontend kullandığında verilerin karışmasını önler.</summary>
    public string ProjectKey { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string? ParentId { get; set; }
    public MenuItem? Parent { get; set; }
    public ICollection<MenuItem> Children { get; set; } = new List<MenuItem>();
}
