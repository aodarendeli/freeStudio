using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Domain.Entities;

namespace Backend.Application.Products;

public class ProductService(IProductRepository repository) : IProductService
{
    public async Task<ProductDto> CreateAsync(CreateProductDto dto, CancellationToken ct = default)
    {
        if (!await repository.CategoryExistsAsync(dto.CategoryId, ct))
        {
            throw new BadRequestException("Category does not exist");
        }

        var product = new Product { Name = dto.Name, Price = dto.Price, CategoryId = dto.CategoryId };
        var created = await repository.AddAsync(product, ct);

        return ToDto(created);
    }

    public async Task<(IReadOnlyList<ProductDto> Items, PaginationMeta Meta)> GetAllAsync(
        ProductQueryDto query, CancellationToken ct = default)
    {
        var (items, total) = await repository.GetAllAsync(query.Page, query.Limit, query.CategoryId, ct);
        var meta = new PaginationMeta(total, query.Page, query.Limit, (int)Math.Ceiling(total / (double)query.Limit));

        return (items.Select(ToDto).ToList(), meta);
    }

    public async Task<ProductDto> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var product = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Product not found");

        return ToDto(product);
    }

    public async Task<ProductDto> UpdateAsync(string id, UpdateProductDto dto, CancellationToken ct = default)
    {
        var product = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Product not found");

        if (!await repository.CategoryExistsAsync(dto.CategoryId, ct))
        {
            throw new BadRequestException("Category does not exist");
        }

        product.Name = dto.Name;
        product.Price = dto.Price;
        product.CategoryId = dto.CategoryId;
        await repository.UpdateAsync(product, ct);

        return ToDto(product);
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        var product = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Product not found");

        await repository.DeleteAsync(product, ct);
    }

    private static ProductDto ToDto(Product p) => new(p.Id, p.Name, p.Price, p.CategoryId, p.CreatedAt);
}
