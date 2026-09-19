namespace Backend.Application.Menu;

public record MenuItemDto(
    string Id,
    string ProjectKey,
    string Label,
    string Slug,
    int Order,
    bool IsActive,
    string? ParentId,
    DateTime CreatedAt);

public record CreateMenuItemDto(string ProjectKey, string Label, string Slug, int Order, bool IsActive, string? ParentId);

public record UpdateMenuItemDto(string Label, string Slug, int Order, bool IsActive, string? ParentId);
