using Backend.Application.Common.Models;

namespace Backend.Application.Categories;

public interface ICategoryService
{
    Task<CategoryDto> CreateAsync(CreateCategoryDto dto, CancellationToken ct = default);
    Task<(IReadOnlyList<CategoryDto> Items, PaginationMeta Meta)> GetAllAsync(CategoryQueryDto query, CancellationToken ct = default);
    Task<CategoryDto> GetByIdAsync(string id, CancellationToken ct = default);
    Task<CategoryDto> UpdateAsync(string id, UpdateCategoryDto dto, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}
