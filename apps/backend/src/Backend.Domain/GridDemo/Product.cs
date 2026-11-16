namespace Backend.Domain.GridDemo;

/// <summary>
/// VKDataGrid demo verisi (apps/react18). Uygulamanın asıl alanından bağımsızdır; ayrı "grid_demo" şemasında tutulur.
/// </summary>
public class Category
{
    public const int NameMaxLength = 100;

    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

public class Product
{
    public const int NameMaxLength = 200;
    public const decimal PriceMax = 10_000_000m;

    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
