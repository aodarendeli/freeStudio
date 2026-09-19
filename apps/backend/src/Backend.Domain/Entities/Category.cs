namespace Backend.Domain.Entities;

public class Category
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Product> Products { get; set; } = new List<Product>();
}
