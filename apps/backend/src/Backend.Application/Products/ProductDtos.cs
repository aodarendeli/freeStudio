namespace Backend.Application.Products;

public record ProductDto(string Id, string Name, decimal Price, string CategoryId, DateTime CreatedAt);

public record CreateProductDto(string Name, decimal Price, string CategoryId);

public record UpdateProductDto(string Name, decimal Price, string CategoryId);

public record ProductQueryDto(int Page = 1, int Limit = 20, string? CategoryId = null);
