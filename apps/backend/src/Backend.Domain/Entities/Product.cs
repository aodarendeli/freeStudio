namespace Backend.Domain.Entities;

public class Product
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string CategoryId { get; set; } = string.Empty;
    public Category? Category { get; set; }
}
