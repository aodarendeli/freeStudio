using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Domain.Entities;

namespace Backend.Application.Categories;

public class CategoryService(ICategoryRepository repository) : ICategoryService
{
    public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto, CancellationToken ct = default)
    {
        if (await repository.ExistsByNameAsync(dto.Name, ct: ct))
        {
            throw new BadRequestException("Category name already exists");
        }

        var category = new Category { Name = dto.Name };
        var created = await repository.AddAsync(category, ct);

        return ToDto(created);
    }

    public async Task<(IReadOnlyList<CategoryDto> Items, PaginationMeta Meta)> GetAllAsync(
        CategoryQueryDto query, CancellationToken ct = default)
    {
        var (items, total) = await repository.GetAllAsync(query.Page, query.Limit, ct);
        var meta = new PaginationMeta(total, query.Page, query.Limit, (int)Math.Ceiling(total / (double)query.Limit));

        return (items.Select(ToDto).ToList(), meta);
    }

    public async Task<CategoryDto> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var category = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Category not found");

        return ToDto(category);
    }

    public async Task<CategoryDto> UpdateAsync(string id, UpdateCategoryDto dto, CancellationToken ct = default)
    {
        var category = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Category not found");

        if (await repository.ExistsByNameAsync(dto.Name, id, ct))
        {
            throw new BadRequestException("Category name already exists");
        }

        category.Name = dto.Name;
        await repository.UpdateAsync(category, ct);

        return ToDto(category);
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        var category = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Category not found");

        if (await repository.HasProductsAsync(id, ct))
        {
            throw new BadRequestException("Category has products and cannot be deleted");
        }

        await repository.DeleteAsync(category, ct);
    }

    private static CategoryDto ToDto(Category c) => new(c.Id, c.Name, c.CreatedAt);
}
