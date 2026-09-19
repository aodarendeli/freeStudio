using Backend.Domain.Entities;

namespace Backend.Application.Menu;

public interface IMenuItemRepository
{
    Task<MenuItem> AddAsync(MenuItem item, CancellationToken ct = default);
    Task<IReadOnlyList<MenuItem>> GetAllAsync(string? projectKey, CancellationToken ct = default);
    Task<MenuItem?> GetByIdAsync(string id, CancellationToken ct = default);
    Task UpdateAsync(MenuItem item, CancellationToken ct = default);
    Task DeleteAsync(MenuItem item, CancellationToken ct = default);
    Task<bool> ExistsAsync(string id, CancellationToken ct = default);
    Task<bool> HasChildrenAsync(string id, CancellationToken ct = default);
}
