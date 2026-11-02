using Backend.Domain.Entities;

namespace Backend.Application.Products;

public interface IProductRepository
{
    Task<Product> AddAsync(Product product, CancellationToken ct = default);
    Task<(IReadOnlyList<Product> Items, int Total)> GetAllAsync(int page, int limit, string? categoryId, CancellationToken ct = default);
    Task<(IReadOnlyList<Product> Items, int Total)> SearchAsync(ProductSearchDto search, CancellationToken ct = default);
    /// <summary>Sayfalama olmadan, filtreye uyan en fazla <paramref name="maxRows"/> kayıt (kategorisiyle).</summary>
    Task<IReadOnlyList<Product>> ExportAsync(ProductSearchDto search, int maxRows, CancellationToken ct = default);
    Task<Product?> GetByIdAsync(string id, CancellationToken ct = default);
    Task UpdateAsync(Product product, CancellationToken ct = default);
    Task DeleteAsync(Product product, CancellationToken ct = default);
    Task<bool> CategoryExistsAsync(string categoryId, CancellationToken ct = default);
}
