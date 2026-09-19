using Backend.Application.Products;
using Backend.Domain.Entities;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

public class ProductRepository(AppDbContext db) : IProductRepository
{
    public async Task<Product> AddAsync(Product product, CancellationToken ct = default)
    {
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return product;
    }

    public async Task<(IReadOnlyList<Product> Items, int Total)> GetAllAsync(
        int page, int limit, string? categoryId, CancellationToken ct = default)
    {
        var query = db.Products.AsQueryable();
        if (!string.IsNullOrEmpty(categoryId))
        {
            query = query.Where(p => p.CategoryId == categoryId);
        }

        query = query.OrderByDescending(p => p.CreatedAt);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * limit).Take(limit).ToListAsync(ct);
        return (items, total);
    }

    public Task<Product?> GetByIdAsync(string id, CancellationToken ct = default) =>
        db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task UpdateAsync(Product product, CancellationToken ct = default)
    {
        db.Products.Update(product);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Product product, CancellationToken ct = default)
    {
        db.Products.Remove(product);
        await db.SaveChangesAsync(ct);
    }

    public Task<bool> CategoryExistsAsync(string categoryId, CancellationToken ct = default) =>
        db.Categories.AnyAsync(c => c.Id == categoryId, ct);
}
