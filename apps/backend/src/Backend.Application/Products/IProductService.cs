using Backend.Application.Common.Models;

namespace Backend.Application.Products;

public interface IProductService
{
    Task<ProductDto> CreateAsync(CreateProductDto dto, CancellationToken ct = default);
    Task<(IReadOnlyList<ProductDto> Items, PaginationMeta Meta)> GetAllAsync(ProductQueryDto query, CancellationToken ct = default);
    Task<ProductDto> GetByIdAsync(string id, CancellationToken ct = default);
    Task<ProductDto> UpdateAsync(string id, UpdateProductDto dto, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}
