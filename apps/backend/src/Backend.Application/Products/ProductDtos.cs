using System.Text.Json;

namespace Backend.Application.Products;

public record ProductDto(string Id, string Name, decimal Price, string CategoryId, DateTime CreatedAt);

public record CreateProductDto(string Name, decimal Price, string CategoryId);

public record UpdateProductDto(string Name, decimal Price, string CategoryId);

public record ProductQueryDto(int Page = 1, int Limit = 20, string? CategoryId = null);

/// <summary>
/// POST /api/products/search gövdesi. Sayfa bilgisi URL yerine body ile gelir.
/// Filter / sort alanları VKDataGrid'in onFilterChange payload'u ile aynı şekildedir.
/// </summary>
public record ProductSearchDto(
    int Page = 1,
    int Size = 10,
    IReadOnlyList<ProductFilterDto>? Filter = null,
    string? SearchText = null,
    ProductSortDto? Sort = null);

/// <summary>
/// FilterValue tek değer ya da `between` için [başlangıç, bitiş] dizisi olabilir.
/// FilterValues header filter'dan gelen seçili değerlerdir.
/// </summary>
public record ProductFilterDto(
    string DataField,
    string? DataType = null,
    string? FilterOperator = null,
    JsonElement? FilterValue = null,
    IReadOnlyList<JsonElement>? FilterValues = null);

public record ProductSortDto(string DataField, string SortOrder = "asc");

/// <summary>Dışa aktarma satırı. Kategori id yerine adı yazılır.</summary>
public record ProductExportRow(string Name, string CategoryName, decimal Price, DateTime CreatedAt);
