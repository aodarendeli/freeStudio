using Backend.Application.Common.Exceptions;
using Backend.Application.GridDemo;
using Backend.Domain.GridDemo;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.GridDemo;

internal sealed class ProductCatalog(AppDbContext db, IOptions<GridDemoOptions> options, TimeProvider clock)
    : IProductCatalog
{
    public async Task<PagedResult<ProductDto>> SearchAsync(ProductSearchRequest request, CancellationToken ct)
    {
        var filtered = ProductGridQuery.Filter(db.GridDemoProducts.AsNoTracking(), request, TimeZone);
        var total = await filtered.CountAsync(ct);
        var items = await ProductGridQuery.Sort(filtered, request.Sort)
            .Skip((request.Page - 1) * request.Size)
            .Take(request.Size)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price, p.CategoryId, p.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<ProductDto>(items, total, request.Page, request.Size);
    }

    public async Task<IReadOnlyList<ProductExportRow>> ExportAsync(ProductSearchRequest request, int limit, CancellationToken ct)
    {
        var filtered = ProductGridQuery.Filter(db.GridDemoProducts.AsNoTracking(), request, TimeZone);
        return await ProductGridQuery.Sort(filtered, request.Sort)
            .Take(limit)
            .Select(p => new ProductExportRow(p.Name, p.Category!.Name, p.Price, p.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<ProductDto> GetAsync(Guid id, CancellationToken ct) =>
        await db.GridDemoProducts.AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price, p.CategoryId, p.CreatedAt))
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundAppException("Ürün bulunamadı.");

    public async Task<ProductDto> CreateAsync(ProductInput input, CancellationToken ct)
    {
        await EnsureCategoryExists(input.CategoryId, ct);
        var product = new Product
        {
            Id = Guid.CreateVersion7(),
            Name = input.Name.Trim(),
            Price = input.Price,
            CategoryId = input.CategoryId,
            CreatedAt = clock.GetUtcNow(),
        };
        db.GridDemoProducts.Add(product);
        await db.SaveChangesAsync(ct);
        return ToDto(product);
    }

    public async Task<ProductDto> UpdateAsync(Guid id, ProductInput input, CancellationToken ct)
    {
        var product = await db.GridDemoProducts.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundAppException("Ürün bulunamadı.");
        await EnsureCategoryExists(input.CategoryId, ct);

        product.Name = input.Name.Trim();
        product.Price = input.Price;
        product.CategoryId = input.CategoryId;
        await db.SaveChangesAsync(ct);
        return ToDto(product);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        if (await db.GridDemoProducts.Where(p => p.Id == id).ExecuteDeleteAsync(ct) == 0)
        {
            throw new NotFoundAppException("Ürün bulunamadı.");
        }
    }

    public async Task<PagedResult<CategoryDto>> ListCategoriesAsync(PageRequest request, CancellationToken ct)
    {
        var query = db.GridDemoCategories.AsNoTracking();
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(c => c.Name).ThenBy(c => c.Id)
            .Skip((request.Page - 1) * request.Size)
            .Take(request.Size)
            .Select(c => new CategoryDto(c.Id, c.Name, c.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<CategoryDto>(items, total, request.Page, request.Size);
    }

    private async Task EnsureCategoryExists(Guid categoryId, CancellationToken ct)
    {
        if (!await db.GridDemoCategories.AnyAsync(c => c.Id == categoryId, ct))
        {
            throw new BadRequestAppException("Kategori bulunamadı.");
        }
    }

    private TimeZoneInfo TimeZone => TimeZoneInfo.FindSystemTimeZoneById(options.Value.DefaultTimeZone);

    private static ProductDto ToDto(Product p) => new(p.Id, p.Name, p.Price, p.CategoryId, p.CreatedAt);
}
