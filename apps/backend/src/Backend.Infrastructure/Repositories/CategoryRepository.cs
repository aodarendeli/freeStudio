using Backend.Application.Categories;
using Backend.Domain.Entities;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

public class CategoryRepository(AppDbContext db) : ICategoryRepository
{
    public async Task<Category> AddAsync(Category category, CancellationToken ct = default)
    {
        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);
        return category;
    }

    public async Task<(IReadOnlyList<Category> Items, int Total)> GetAllAsync(int page, int limit, CancellationToken ct = default)
    {
        var query = db.Categories.OrderByDescending(c => c.CreatedAt);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * limit).Take(limit).ToListAsync(ct);
        return (items, total);
    }

    public Task<Category?> GetByIdAsync(string id, CancellationToken ct = default) =>
        db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task UpdateAsync(Category category, CancellationToken ct = default)
    {
        db.Categories.Update(category);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Category category, CancellationToken ct = default)
    {
        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
    }

    public Task<bool> ExistsByNameAsync(string name, string? excludeId = null, CancellationToken ct = default) =>
        db.Categories.AnyAsync(c => c.Name == name && c.Id != excludeId, ct);

    public Task<bool> HasProductsAsync(string categoryId, CancellationToken ct = default) =>
        db.Products.AnyAsync(p => p.CategoryId == categoryId, ct);
}
