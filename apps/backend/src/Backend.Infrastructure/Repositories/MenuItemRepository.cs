using Backend.Application.Menu;
using Backend.Domain.Entities;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

public class MenuItemRepository(AppDbContext db) : IMenuItemRepository
{
    public async Task<MenuItem> AddAsync(MenuItem item, CancellationToken ct = default)
    {
        db.MenuItems.Add(item);
        await db.SaveChangesAsync(ct);
        return item;
    }

    public async Task<IReadOnlyList<MenuItem>> GetAllAsync(string? projectKey, CancellationToken ct = default)
    {
        var query = db.MenuItems.AsQueryable();
        if (!string.IsNullOrWhiteSpace(projectKey))
        {
            query = query.Where(m => m.ProjectKey == projectKey);
        }

        return await query
            .OrderBy(m => m.ParentId)
            .ThenBy(m => m.Order)
            .ToListAsync(ct);
    }

    public Task<MenuItem?> GetByIdAsync(string id, CancellationToken ct = default) =>
        db.MenuItems.FirstOrDefaultAsync(m => m.Id == id, ct);

    public async Task UpdateAsync(MenuItem item, CancellationToken ct = default)
    {
        db.MenuItems.Update(item);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(MenuItem item, CancellationToken ct = default)
    {
        db.MenuItems.Remove(item);
        await db.SaveChangesAsync(ct);
    }

    public Task<bool> ExistsAsync(string id, CancellationToken ct = default) =>
        db.MenuItems.AnyAsync(m => m.Id == id, ct);

    public Task<bool> HasChildrenAsync(string id, CancellationToken ct = default) =>
        db.MenuItems.AnyAsync(m => m.ParentId == id, ct);
}
