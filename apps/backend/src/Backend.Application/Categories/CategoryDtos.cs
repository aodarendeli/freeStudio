namespace Backend.Application.Categories;

public record CategoryDto(string Id, string Name, DateTime CreatedAt);

public record CreateCategoryDto(string Name);

public record UpdateCategoryDto(string Name);

public record CategoryQueryDto(int Page = 1, int Limit = 20);
