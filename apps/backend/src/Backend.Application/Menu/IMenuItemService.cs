namespace Backend.Application.Menu;

public interface IMenuItemService
{
    Task<MenuItemDto> CreateAsync(CreateMenuItemDto dto, CancellationToken ct = default);
    Task<IReadOnlyList<MenuItemDto>> GetAllAsync(string? projectKey, CancellationToken ct = default);
    Task<MenuItemDto> GetByIdAsync(string id, CancellationToken ct = default);
    Task<MenuItemDto> UpdateAsync(string id, UpdateMenuItemDto dto, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}
