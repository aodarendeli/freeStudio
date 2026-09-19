using Backend.Application.Common.Exceptions;
using Backend.Domain.Entities;

namespace Backend.Application.Menu;

public class MenuItemService(IMenuItemRepository repository) : IMenuItemService
{
    public async Task<MenuItemDto> CreateAsync(CreateMenuItemDto dto, CancellationToken ct = default)
    {
        await EnsureValidParentAsync(dto.ParentId, null, dto.ProjectKey, ct);

        var item = new MenuItem
        {
            ProjectKey = dto.ProjectKey,
            Label = dto.Label,
            Slug = dto.Slug,
            Order = dto.Order,
            IsActive = dto.IsActive,
            ParentId = dto.ParentId,
        };

        var created = await repository.AddAsync(item, ct);
        return ToDto(created);
    }

    public async Task<IReadOnlyList<MenuItemDto>> GetAllAsync(string? projectKey, CancellationToken ct = default)
    {
        var items = await repository.GetAllAsync(projectKey, ct);
        return items.Select(ToDto).ToList();
    }

    public async Task<MenuItemDto> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var item = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Menu item not found");

        return ToDto(item);
    }

    public async Task<MenuItemDto> UpdateAsync(string id, UpdateMenuItemDto dto, CancellationToken ct = default)
    {
        var item = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Menu item not found");

        await EnsureValidParentAsync(dto.ParentId, id, item.ProjectKey, ct);

        item.Label = dto.Label;
        item.Slug = dto.Slug;
        item.Order = dto.Order;
        item.IsActive = dto.IsActive;
        item.ParentId = dto.ParentId;

        await repository.UpdateAsync(item, ct);
        return ToDto(item);
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        var item = await repository.GetByIdAsync(id, ct)
            ?? throw new NotFoundAppException("Menu item not found");

        if (await repository.HasChildrenAsync(id, ct))
        {
            throw new BadRequestException("Menu item has children and cannot be deleted");
        }

        await repository.DeleteAsync(item, ct);
    }

    private async Task EnsureValidParentAsync(string? parentId, string? selfId, string projectKey, CancellationToken ct)
    {
        if (parentId is null)
        {
            return;
        }

        if (parentId == selfId)
        {
            throw new BadRequestException("A menu item cannot be its own parent");
        }

        var parent = await repository.GetByIdAsync(parentId, ct)
            ?? throw new BadRequestException("Parent menu item does not exist");

        if (parent.ProjectKey != projectKey)
        {
            throw new BadRequestException("Parent menu item belongs to a different project");
        }
    }

    private static MenuItemDto ToDto(MenuItem m) =>
        new(m.Id, m.ProjectKey, m.Label, m.Slug, m.Order, m.IsActive, m.ParentId, m.CreatedAt);
}
