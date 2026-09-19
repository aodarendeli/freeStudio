using Backend.Domain.Entities;

namespace Backend.Application.Products;

public interface IProductRepository
{
    Task<Product> AddAsync(Product product, CancellationToken ct = default);
    Task<(IReadOnlyList<Product> Items, int Total)> GetAllAsync(int page, int limit, string? categoryId, CancellationToken ct = default);
    Task<Product?> GetByIdAsync(string id, CancellationToken ct = default);
    Task UpdateAsync(Product product, CancellationToken ct = default);
    Task DeleteAsync(Product product, CancellationToken ct = default);
    Task<bool> CategoryExistsAsync(string categoryId, CancellationToken ct = default);
}
