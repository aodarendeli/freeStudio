using Backend.Domain.Entities;

namespace Backend.Application.Categories;

public interface ICategoryRepository
{
    Task<Category> AddAsync(Category category, CancellationToken ct = default);
    Task<(IReadOnlyList<Category> Items, int Total)> GetAllAsync(int page, int limit, CancellationToken ct = default);
    Task<Category?> GetByIdAsync(string id, CancellationToken ct = default);
    Task UpdateAsync(Category category, CancellationToken ct = default);
    Task DeleteAsync(Category category, CancellationToken ct = default);
    Task<bool> ExistsByNameAsync(string name, string? excludeId = null, CancellationToken ct = default);
    Task<bool> HasProductsAsync(string categoryId, CancellationToken ct = default);
}
